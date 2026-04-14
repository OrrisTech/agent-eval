#!/bin/bash
# Simple coding agent — takes a task description, generates code via Claude API, writes files
# Usage: ./simple-coder.sh "task description"
#
# Requires: ANTHROPIC_API_KEY environment variable, curl, python3

set -euo pipefail

TASK="$1"
MODEL="${AGENT_MODEL:-claude-sonnet-4-20250514}"

# Use python to properly JSON-encode the request (handles newlines, quotes, etc.)
RESPONSE=$(python3 -c "
import json, subprocess, sys

task = sys.argv[1]
model = sys.argv[2]

payload = {
    'model': model,
    'max_tokens': 4096,
    'messages': [{
        'role': 'user',
        'content': f'''You are a coding agent. Complete the following task. Output ONLY the files you create, in this exact format for each file:

---FILE: filename.ext---
file contents here
---END FILE---

Do not include any explanation outside the file blocks, just the files.

Task:
{task}'''
    }]
}

result = subprocess.run(
    ['curl', '-s', 'https://api.anthropic.com/v1/messages',
     '-H', 'content-type: application/json',
     '-H', f'x-api-key: {__import__(\"os\").environ[\"ANTHROPIC_API_KEY\"]}',
     '-H', 'anthropic-version: 2023-06-01',
     '-d', json.dumps(payload)],
    capture_output=True, text=True
)
print(result.stdout)
" "$TASK" "$MODEL")

# Extract the text content
CONTENT=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('content',[{}])[0].get('text',''))" 2>/dev/null)

if [ -z "$CONTENT" ]; then
  echo "ERROR: No response from API"
  echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('error',{}).get('message','Unknown error'))" 2>/dev/null
  exit 1
fi

# Parse and write files using python (more reliable than awk)
python3 -c "
import sys, os

content = sys.argv[1]
lines = content.split('\n')
current_file = None
file_lines = []

for line in lines:
    if line.startswith('---FILE: ') and line.endswith('---'):
        # Save previous file if any
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

# Handle case where last file has no END marker
if current_file and file_lines:
    with open(current_file, 'w') as f:
        f.write('\n'.join(file_lines))
    print(f'  Created: {current_file}')
" "$CONTENT"

echo "Task completed."
