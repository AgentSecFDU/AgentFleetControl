# Claude Code Subagent Design

## Goal

Make the locally installed Claude Code CLI available to Codex as a reusable, visible personal capability. Codex may delegate suitable tasks to Claude Code, including tasks that edit files, while retaining responsibility for reviewing changes and verification.

## User Experience

- A personal Codex plugin named `claude-code-subagent` appears in the plugin interface.
- The plugin exposes a `$claude-code-subagent` skill for explicit invocation and implicit delegation.
- A dedicated Codex thread named `Claude Code Subagent` provides a persistent sidebar entry and control surface.
- Runtime Claude invocations report their results back to the invoking Codex thread. Individual invocations do not create sidebar entries.

## Architecture

The personal plugin lives under `~/plugins/claude-code-subagent` and is registered in the default personal marketplace at `~/.agents/plugins/marketplace.json`. It contains:

1. A plugin manifest with UI metadata and starter prompts.
2. A skill describing delegation criteria, safety rules, review requirements, and invocation workflow.
3. A wrapper script that invokes `/opt/homebrew/bin/claude` non-interactively in the requested working directory.

The wrapper uses Claude Code's print mode and `acceptEdits` permission mode. It does not use `--dangerously-skip-permissions`. Prompts identify the working directory, task boundaries, expected deliverables, and verification requirements.

## Delegation Policy

Codex may delegate self-contained implementation, test creation, code review, design critique, and repository analysis. Codex remains the orchestrator: it scopes the task, inspects the resulting diff, resolves conflicts, and runs appropriate verification.

Claude Code must not be delegated destructive Git operations, credential access, publishing, production changes, deletion of user data, or work outside explicitly allowed directories. External side effects continue to require the user's authorization.

## Error Handling

The wrapper fails clearly when Claude Code is unavailable, authentication is missing, the working directory is invalid, or Claude exits unsuccessfully. It preserves Claude's output and exit status for Codex to inspect. A failed delegation never implies that the requested task succeeded.

## Validation

- Validate the skill metadata with the skill validator.
- Validate the plugin manifest with the plugin validator.
- Run a read-only smoke invocation against a temporary fixture.
- Run an edit-capable smoke invocation in a temporary Git repository and inspect the resulting diff.
- Install the plugin through the personal marketplace and confirm it appears in `codex plugin list`.
- Create and pin the dedicated sidebar thread if the current Codex surface exposes those thread operations.

## Visibility Boundary

Codex plugins and skills are durable capabilities, while runtime subagents are task-scoped. The dedicated thread is therefore a persistent control surface, not a permanently running process. This distinction must be stated in the plugin's user-facing description.
