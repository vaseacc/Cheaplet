name: AI Senior Dev (Gemini)

on:
  issues:
    types: [opened, edited]
  issue_comment:
    types: [created]

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  aider-job:
    if: contains(github.event.issue.body, '/fix') || contains(github.event.comment.body, '/fix')
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.10'

      - name: Install Aider
        run: |
          python -m pip install --upgrade pip
          pip install aider-chat

      - name: Run Aider
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          HOME: /home/runner
          AIDER_ALLOW_RUN_COMMANDS: "true"
          ISSUE_TITLE: ${{ github.event.issue.title }}
          ISSUE_BODY: ${{ github.event.issue.body }}
          COMMENT_BODY: ${{ github.event.comment.body }}
        run: |
          git config --global user.name "Gemini AI"
          git config --global user.email "ai@cheaplet.com"

          # 1. Combine and clean the message
          RAW_MSG="$ISSUE_TITLE $ISSUE_BODY $COMMENT_BODY"
          CLEAN_MSG=$(echo "$RAW_MSG" | sed 's/\/fix//g' | xargs)

          # 2. SMART FILE SELECTION: Only load files mentioned in the prompt
          #    Remove trailing punctuation only (keep dots inside filenames)
          FILES_TO_LOAD=""
          for word in $CLEAN_MSG; do
            clean_word=$(echo "$word" | sed 's/[.,!?]*$//')
            if [[ -f "$clean_word" ]]; then
              FILES_TO_LOAD="$FILES_TO_LOAD $clean_word"
            fi
          done

          # 3. Inject strict Persona Context
          #    The detailed identity is now inside CONVENTIONS.md, so we keep this prompt short.
          SYSTEM_PROMPT="You are an elite AI developer. You MUST read and strictly obey the rules in CONVENTIONS.md. Make precise, surgical edits using SEARCH/REPLACE blocks. DO NOT output entire files. Task: "
          FINAL_PROMPT="$SYSTEM_PROMPT $CLEAN_MSG"

          # 4. Run Aider (Using Gemini 2.5 Flash Lite)
          #    CONVENTIONS.md is read-only by default. If you want the AI to be able to update it,
          #    change `--read CONVENTIONS.md` to `CONVENTIONS.md` (remove --read).
          aider --model gemini/gemini-2.5-flash-lite \
                --edit-format diff \
                --read CONVENTIONS.md \
                --message "$FINAL_PROMPT" \
                $FILES_TO_LOAD \
                --yes-always \
                --auto-commits \
                --map-tokens 1024 \
                --no-stream \
                --exit

          # 5. Final commit and push with rebase to avoid conflicts
          git add .
          git commit -m "AI surgical update: $CLEAN_MSG" || echo "No changes to commit"
          git pull --rebase origin main
          git push origin main
