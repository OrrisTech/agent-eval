#!/bin/bash
# Simple coding agent — takes a task description, generates code via Claude API, writes files
# Usage: ./simple-coder.sh "task description"
#    or: ./simple-coder.sh --file /path/to/description.txt
#
# Requires: ANTHROPIC_API_KEY environment variable, curl, python3

set -euo pipefail

# Support both direct argument and file-based description
if [ "${1:-}" = "--file" ] && [ -n "${2:-}" ]; then
  TASK=$(cat "$2")
elif [ -n "${1:-}" ]; then
  TASK="$1"
else
  echo "Usage: simple-coder.sh <description> or simple-coder.sh --file <path>"
  exit 1
fi

MODEL="${AGENT_MODEL:-claude-sonnet-4-6}"

# Use python to properly JSON-encode the request (handles newlines, quotes, backticks)
RESPONSE=$(python3 -c "
import json, subprocess, sys, os

task = sys.stdin.read()
model = sys.argv[1]

payload = {
    'model': model,
    'max_tokens': 4096,
    'messages': [{
        'role': 'user',
        'content': 'You are a coding agent. Complete the following task. Output ONLY the files you create, in this exact format for each file:\n\n---FILE: filename.ext---\nfile contents here\n---END FILE---\n\nDo not include any explanation outside the file blocks, just the files.\n\nTask:\n' + task
    }]
}

result = subprocess.run(
    ['curl', '-s', 'https://api.anthropic.com/v1/messages',
     '-H', 'content-type: application/json',
     '-H', 'x-api-key: ' + os.environ['ANTHROPIC_API_KEY'],
     '-H', 'anthropic-version: 2023-06-01',
     '-d', json.dumps(payload)],
    capture_output=True, text=True
)
print(result.stdout)
" "$MODEL" <<< "$TASK")

# Extract the text content
CONTENT=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('content',[{}])[0].get('text',''))" 2>/dev/null)

if [ -z "$CONTENT" ]; then
  echo "ERROR: No response from API"
  echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('error',{}).get('message','Unknown error'))" 2>/dev/null
  exit 1
fi

# Emit real token usage so the eval engine can compute accurate $ cost.
# The engine parses lines matching `USAGE: input=<n> output=<m> model=<id>`.
echo "$RESPONSE" | python3 -c "
import json, sys, os
try:
    d = json.load(sys.stdin)
    u = d.get('usage', {})
    inp = int(u.get('input_tokens', 0))
    out = int(u.get('output_tokens', 0))
    if inp or out:
        print(f'USAGE: input={inp} output={out} model={os.environ.get(\"AGENT_MODEL\", \"\")}')
except Exception:
    pass
"

# Parse and write files using python (more reliable than awk)
python3 -c "
import sys

content = sys.stdin.read()
lines = content.split('\n')
current_file = None
file_lines = []

for line in lines:
    if line.startswith('---FILE: ') and line.endswith('---'):
        if current_file and file_lines:
            with open(current_file, 'w') as f:
                f.write('\n'.join(file_lines))
            print(f'  Created: {current_file}')
        current_file = line[9:-3].strip()
        file_lines = []
    elif line == '---END FILE---':
        if current_file and file_lines:
            with open(current_file, 'w') as f:
                f.write('\n'.join(file_lines))
            print(f'  Created: {current_file}')
        current_file = None
        file_lines = []
    elif current_file is not None:
        file_lines.append(line)

if current_file and file_lines:
    with open(current_file, 'w') as f:
        f.write('\n'.join(file_lines))
    print(f'  Created: {current_file}')
" <<< "$CONTENT"

echo 'Task completed.'
