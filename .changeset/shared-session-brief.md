---
"kibi-agent-core": minor
"kibi-claude": minor
"kibi-codex": minor
"kibi-cursor": minor
"kibi-zcode": minor
"kibi-opencode": minor
"kibi-mcp": minor
"kibi-cli": minor
---

Every Kibi surface now opens a session with the same short brief: search for the recorded intent before changing behaviour, record the person's decisions with their reason, run `kibi check --staged` before finishing, and treat a request that would make a recorded requirement or decision false as a question for the person rather than a task. Claude Code, Codex, Cursor, OpenCode and ZCode add it at session start; Codex and Cursor sessions, which started silently before, now get it too. The MCP server returns it in its `initialize` instructions and `kb_status` returns it as `sessionBrief`, so an agent on a host without hooks, such as Gemini CLI or any MCP client, reads the same policy. `kibi init` also writes a managed `GEMINI.md` section that imports `AGENTS.md` (`@./AGENTS.md`), because Gemini CLI reads `GEMINI.md` and not `AGENTS.md` by default.

Migration: none needed. Run `kibi init` again to add the `GEMINI.md` import to an existing repository; a `GEMINI.md` that already imports `AGENTS.md`, or that is a link to it, is left as it is. Turning off the `agentInstructions` setup choice skips it like the other instruction files.

Technical summary: `kibi-agent-core/session-brief` exports `SESSION_BRIEF`, `SESSION_BRIEF_LINES` and `sessionBriefWith(hostLines)`, which puts host lines (tool prefixes, skill names, missing-hook notes) after the brief. The Claude Code session-start context is rebuilt on it and shrinks from 1,180 to 830 characters (for one linked file). OpenCode adds the brief to the system prompt when the repository root is an active Kibi workspace (`root_active` or `hybrid_root_plus_vendored`). The MCP `SERVER_INSTRUCTIONS` and the `kb_status` output schema gain the brief; the contract fixtures are regenerated. `writeAgentInstructions` reports a `gemini` outcome next to `agents` and `claude`.
