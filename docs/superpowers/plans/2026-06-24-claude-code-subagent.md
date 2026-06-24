# Claude Code Subagent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install a visible personal Codex plugin that safely delegates suitable repository tasks to the local Claude Code CLI with file-edit permission.

**Architecture:** A small Bash wrapper owns CLI validation and invocation. A Codex skill owns delegation, review, and safety policy, while plugin metadata makes the capability visible in Codex. The default personal marketplace installs the plugin globally; a dedicated Codex thread supplies the sidebar entry when thread-management tools are available.

**Tech Stack:** Bash, Claude Code CLI, Codex skills/plugins, Python-based Codex validators

---

### Task 1: Scaffold the Personal Plugin

**Files:**
- Create: `/Users/shellhand/plugins/claude-code-subagent/.codex-plugin/plugin.json`
- Create: `/Users/shellhand/plugins/claude-code-subagent/skills/claude-code-subagent/`
- Modify: `/Users/shellhand/.agents/plugins/marketplace.json`

- [ ] **Step 1: Scaffold the plugin and personal marketplace entry**

Run:

```bash
python3 /Users/shellhand/.codex/skills/.system/plugin-creator/scripts/create_basic_plugin.py \
  claude-code-subagent --with-skills --with-scripts --with-marketplace
```

Expected: plugin root is created under `/Users/shellhand/plugins/claude-code-subagent`, and the personal marketplace contains a `claude-code-subagent` entry.

- [ ] **Step 2: Confirm the generated structure**

Run:

```bash
find /Users/shellhand/plugins/claude-code-subagent -maxdepth 3 -type f -print
```

Expected: output includes `.codex-plugin/plugin.json` and contains no unexpected executable content.

### Task 2: Build and Test the Claude Wrapper

**Files:**
- Create: `/Users/shellhand/plugins/claude-code-subagent/scripts/run-claude-subagent.sh`
- Create: `/Users/shellhand/plugins/claude-code-subagent/tests/test-run-claude-subagent.sh`

- [ ] **Step 1: Write a failing wrapper test**

Create a shell test that installs a fake Claude executable, invokes the wrapper in a temporary workspace, and asserts all of the following:

```bash
grep -Fx -- "$workspace" "$capture_dir/pwd"
grep -Fx -- "--print" "$capture_dir/args"
grep -Fx -- "--permission-mode" "$capture_dir/args"
grep -Fx -- "acceptEdits" "$capture_dir/args"
grep -Fx -- "--output-format" "$capture_dir/args"
grep -Fx -- "json" "$capture_dir/args"
grep -Fx -- "Edit the fixture" "$capture_dir/args"
! grep -Fq -- "--dangerously-skip-permissions" "$capture_dir/args"
```

The test also invokes the wrapper with a missing directory and expects a non-zero exit status plus `Working directory does not exist` on stderr.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
bash /Users/shellhand/plugins/claude-code-subagent/tests/test-run-claude-subagent.sh
```

Expected: FAIL because `scripts/run-claude-subagent.sh` does not exist.

- [ ] **Step 3: Implement the wrapper**

Create an executable wrapper with this behavior:

```bash
#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: run-claude-subagent.sh <working-directory> <prompt>" >&2
  exit 64
fi

working_directory=$1
shift
claude_bin=${CLAUDE_CODE_BIN:-/opt/homebrew/bin/claude}

if [[ ! -d "$working_directory" ]]; then
  echo "Working directory does not exist: $working_directory" >&2
  exit 66
fi

if [[ ! -x "$claude_bin" ]]; then
  echo "Claude Code executable is unavailable: $claude_bin" >&2
  exit 69
fi

cd "$working_directory"
exec "$claude_bin" --print --permission-mode acceptEdits --output-format json "$*"
```

- [ ] **Step 4: Run the wrapper test to verify it passes**

Run:

```bash
bash /Users/shellhand/plugins/claude-code-subagent/tests/test-run-claude-subagent.sh
```

Expected: PASS with exit status 0.

### Task 3: Define the Codex Skill and UI Metadata

**Files:**
- Create: `/Users/shellhand/plugins/claude-code-subagent/skills/claude-code-subagent/SKILL.md`
- Create: `/Users/shellhand/plugins/claude-code-subagent/skills/claude-code-subagent/agents/openai.yaml`
- Modify: `/Users/shellhand/plugins/claude-code-subagent/.codex-plugin/plugin.json`

- [ ] **Step 1: Initialize the skill metadata**

Run the skill initializer inside the scaffolded plugin with these interface values:

```bash
python3 /Users/shellhand/.codex/skills/.system/skill-creator/scripts/init_skill.py \
  claude-code-subagent \
  --path /Users/shellhand/plugins/claude-code-subagent/skills \
  --interface 'display_name=Claude Code Subagent' \
  --interface 'short_description=Delegate suitable coding tasks to local Claude Code' \
  --interface 'default_prompt=Use $claude-code-subagent to delegate this task to local Claude Code.'
```

Expected: `SKILL.md` and `agents/openai.yaml` exist with no unsupported dependency declarations.

- [ ] **Step 2: Replace the generated skill instructions**

Write concise instructions that require this flow:

```text
1. Decide whether the task is self-contained and safe to delegate.
2. Inspect git status before invocation and preserve pre-existing user changes.
3. Give Claude a bounded prompt with scope, paths, acceptance criteria, and tests.
4. Invoke scripts/run-claude-subagent.sh from the user's requested workspace.
5. Inspect Claude's JSON result and the complete repository diff.
6. Run appropriate verification independently; never trust success claims without evidence.
7. Report which work was delegated and distinguish Claude's changes from Codex follow-up changes.
```

Explicitly prohibit credential access, publishing, destructive Git commands, user-data deletion, work outside allowed directories, and `--dangerously-skip-permissions`.

- [ ] **Step 3: Set plugin presentation metadata**

Update `plugin.json` to include valid semver, author, `skills: "./skills/"`, and this UI intent:

```json
{
  "interface": {
    "displayName": "Claude Code Subagent",
    "shortDescription": "Delegate coding work to local Claude Code",
    "longDescription": "A visible Codex capability for safely delegating bounded repository tasks to the locally installed Claude Code CLI. Claude may edit files; Codex reviews every result and verifies the work.",
    "developerName": "Personal",
    "category": "Developer Tools",
    "capabilities": ["Local CLI", "Read", "Write"],
    "defaultPrompt": [
      "Ask Claude Code for a second implementation approach.",
      "Delegate this self-contained coding task to Claude Code.",
      "Have Claude Code review the current changes."
    ]
  }
}
```

- [ ] **Step 4: Validate the skill**

Run:

```bash
python3 /Users/shellhand/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  /Users/shellhand/plugins/claude-code-subagent/skills/claude-code-subagent
```

Expected: validation succeeds.

- [ ] **Step 5: Validate the plugin**

Run:

```bash
python3 /Users/shellhand/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py \
  /Users/shellhand/plugins/claude-code-subagent
```

Expected: validation succeeds with no placeholders or missing files.

### Task 4: Smoke-Test, Install, and Expose the Entry Points

**Files:**
- Modify during smoke test only: a temporary Git repository under `/private/tmp/`
- Read: `/Users/shellhand/.agents/plugins/marketplace.json`

- [ ] **Step 1: Verify local Claude Code health**

Run:

```bash
/opt/homebrew/bin/claude --version
```

Expected: Claude Code prints a version and exits successfully.

- [ ] **Step 2: Run a bounded edit smoke test**

Create a temporary Git fixture containing `fixture.txt`, invoke the wrapper with a prompt that changes only that file, then inspect `git diff -- fixture.txt`.

Expected: Claude exits successfully, only `fixture.txt` changes, and the requested text appears in the diff. Remove the temporary fixture after inspection.

- [ ] **Step 3: Install the plugin from the personal marketplace**

Read the marketplace name and install:

```bash
python3 /Users/shellhand/.codex/skills/.system/plugin-creator/scripts/read_marketplace_name.py
codex plugin add claude-code-subagent@personal
```

Expected: installation succeeds.

- [ ] **Step 4: Confirm Codex visibility**

Run:

```bash
codex plugin list
```

Expected: output contains `claude-code-subagent` and its personal marketplace source.

- [ ] **Step 5: Create the sidebar control thread**

Use Codex thread-management tools to create a user-owned thread titled `Claude Code Subagent`, then pin it. Send an introductory message explaining that `$claude-code-subagent` performs the actual delegation and that runtime calls remain task-scoped.

Expected: the thread appears in the Codex sidebar. If the current surface does not expose creation or pinning tools, report that limitation and provide the plugin entry as the durable visible surface.

- [ ] **Step 6: Final verification**

Run the wrapper test, both validators, and `codex plugin list` again.

Expected: every command succeeds and the plugin remains listed. Start a new Codex thread before testing implicit skill invocation so the newly installed skill is loaded.
