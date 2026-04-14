#!/bin/bash
# OpenAI-based coding agent — same interface as simple-coder.sh but uses GPT-4o
# Usage: ./simple-coder-openai.sh "task description"
#
# Requires: OPENAI_API_KEY environment variable, curl, python3

set -euo pipefail

TASK="$1"
MODEL="${AGENT_MODEL:-gpt-5}"

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "ERROR: OPENAI_API_KEY not set"
  exit 1
fi

# Use python to properly JSON-encode the request
RESPONSE=$(python3 -c "
import json, subprocess, sys, os

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
    ['curl', '-s', 'https://api.openai.com/v1/chat/completions',
     '-H', 'Content-Type: application/json',
     '-H', f'Authorization: Bearer {os.environ[\"OPENAI_API_KEY\"]}',
     '-d', json.dumps(payload)],
    capture_output=True, text=True
)
print(result.stdout)
" "$TASK" "$MODEL")

# Extract content
CONTENT=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('choices',[{}])[0].get('message',{}).get('content',''))" 2>/dev/null)

if [ -z "$CONTENT" ]; then
  echo "ERROR: No response from API"
  echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('error',{}).get('message','Unknown error'))" 2>/dev/null
  exit 1
fi

# Parse and write files
python3 -c "
import sys

content = sys.argv[1]
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
" "$CONTENT"

echo "Task completed."
