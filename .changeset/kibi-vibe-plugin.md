---
"kibi-vibe": minor
---

Add `kibi-vibe`, a Mistral Vibe plugin (Agent Plugins 1.0 format) that ships the `kibi` MCP server, the canonical Kibi skills, and fail-open context hooks. On Windows the launcher runs Kibi natively with the bundled SWI-Prolog, and runs it inside WSL for `\\wsl.localhost\<distro>` workspaces or with `KIBI_FORCE_WSL=1` (no shell strings, distro-aware, with raised startup timeouts documented for cold WSL boots), and outside Kibi workspaces it serves a silent zero-tool server instead of failing the MCP handshake.

Technically: `bin/kibi-runtime.mjs` plans a direct spawn or a `wsl.exe --cd <path> --exec <node> <bin>` wrap per workspace (workspace resolution honors `KIBI_WORKSPACE`/`KIBI_PROJECT_ROOT`/`KIBI_ROOT`, a `.git`-bounded upward walk for `.kb/manifest.json`, and a `kibi-workspace.txt` pointer for hosts that spawn from a foreign cwd); hooks anchor at the workspace root and never block the session; the host attribution comes from `KIBI_MCP_HOST` (default `vibe`) passed through `WSLENV`. The package is wired into `build`/`typecheck`/unit-test/coverage shards and a CI skill-mirror drift check, with executable tests under `packages/vibe/tests/`.
