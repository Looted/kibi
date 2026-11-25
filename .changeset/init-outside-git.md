---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
"kibi-antigravity": patch
---

`kibi init` in a directory that is not inside a Git repository now writes nothing and exits 1 with one instruction: run `git init` (or run Kibi from inside the repository), then retry. Before, it printed a long diagnostic that led with `KIBI_BRANCH`; following it initialized the workspace for that run only, and every later `kibi status` failed again, as a retryable `OPERATION_FAILED` on the JSON route or as an uncaught error in text mode.

`kibi status`, every CLI JSON route and the MCP tools now refuse such a workspace the same way, with the error code `NOT_A_GIT_REPOSITORY` (`GIT_NOT_AVAILABLE` when Git is missing, `DETACHED_HEAD` for a write on a detached HEAD, `BRANCH_UNRESOLVED` for any other branch that cannot be resolved), `retryable: false` and the same message, and usage telemetry records these as rejections with their category instead of uncategorized failures. `KIBI_BRANCH` stays the way to use Kibi without Git; `kibi init` run that way now says that every later command, Git hook and MCP server needs the same value. The error reference has a "No Git repository" entry.

Technical summary: added `BranchResolutionFailure` (an `OperationError`) in `kibi-cli` and re-exported it through `kibi-cli/operations/result-envelope` and `kibi-runtime`. `initCommand`, `executeStatus`, `createCliRuntime`, `openFailureResult` and the MCP session throw or keep it instead of a plain `Error`; `attachmentFailureMessage` is removed. `kibi-agent-core` counts `not_a_git_repository`, `git_not_available`, `detached_head` and `branch_unresolved` as rejected outcomes, and the Claude Code, Codex, Cursor, ZCode and Antigravity hook bundles are rebuilt with them.
