---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-cursor": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-zcode": patch
---

Fixes found while testing the release:

- `kb_upsert` now warns when it writes a requirement whose document has no semantic inventory matching its statement. The staged gate's message for such a requirement now says what happens: `kibi sync` refuses it in every workspace that synced before, even where `kb_upsert` already compiled it into the local store.
- Text `kibi check` prints each violation's suggestion. It shows the first sentence of the suggestion; `--fix` shows all of it.
- A JSON route (`--input -`) that fails prints its error once, in the result on stdout. stderr carries a single pointer line, `Error [CODE]: see error.message in the JSON result on stdout`. The difference between `kibi check --format json` (`{"structuredContent": ...}`) and `kibi check --input -` (the result envelope) is now documented in the CLI reference.
- `validate-upsert` accepts `plannedFacts` and `document`, as `kb_upsert` does.
- Diagnostic usage records detect the host the same way usage telemetry does, so non-Claude hosts are no longer reported as `unknown`.
- `kibi skills validate` reads the Kibi fields that the Claude Code and ZCode skill bundles nest under `metadata:`.
- Hints that pointed to the `semantic-advisor` CLI route for a requirement analysis now name `kibi model`, which accepts `requirementId` and `mode`.
- The engine daemon is replaced when the Prolog core it loaded differs from the client's, even when the version numbers are the same. The daemon's identity now includes a digest of the core's Prolog sources.
- A cancelled engine request that is already running no longer runs on until the query timeout: the daemon stops its Prolog session, and the next request restarts the session. The same happens when the request's client disconnects. The timeout message now says the session was stopped, instead of telling you to stop a wedged engine.
- Clients that start together while a daemon is being replaced retry their handshakes on a new connection. Before, one of them could fail with `Kibi engine is shutting down` or `EPIPE`.
- The Cursor setup and CLI fallback messages describe the project-local CLI JSON routes as an equal peer of MCP, matching the bundled skills.
- `kibi-usage` corrects the `kibi signoff --questions` usage and the `kb_model` CLI mapping. It also explains that a success scenario written before its requirement reports `scenario-feasibility-unknown` until the requirement is written.
