---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
---

Workspace env files can no longer change what Kibi runs or loads. The project `.env.kibi` (or the file `KIBI_ENV_FILE` names) and the legacy `.env` come with the checkout, so a cloned repository could set `KIBI_NODE_PATH` and have the next engine command run a file of its choosing. The CLI and the MCP server now apply only provider secrets (keys outside the `KIBI_` namespace, such as `TYPESAFE_API_KEY`) and provider settings (`KIBI_JEV_*`) from those files.

- Every other `KIBI_*` key in a workspace file is ignored: executable and module paths (`KIBI_NODE_PATH`, `KIBI_SWIPL`, `KIBI_KB_PL_PATH`, `KIBI_<MODULE>_PATH`), runtime and log locations, `KIBI_ENV_FILE`, workspace and branch selection, proof commands and safety switches.
- Process variables are ignored there too: `PATH`, `HOME`, `TMPDIR`, `SWI_HOME_DIR`, shell and editor variables, and the `NODE_*`, `BUN_*`, `LD_*`, `DYLD_*`, `GIT_*`, `SSH_*`, `XDG_*`, `PYTHON*`, `SWIPL*` and proxy families, in any letter case.
- Each command names the ignored keys once on stderr, never their values; the bootstrap result lists them as `keysIgnoredFromProject` and `keysIgnoredFromLegacy`.
- The user file `~/.config/kibi/env` and the process environment are trusted and still apply every key. Move any other setting from `.env.kibi` or `.env` there.
- `isWorkspaceEnvKeyAllowed` (exported from `kibi-cli/env-bootstrap` and `kibi-runtime`) is the single policy both entrypoints use.
