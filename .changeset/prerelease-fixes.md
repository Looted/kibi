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
- Text `kibi check` prints each violation's suggestion. It shows the first sentence of the suggestion, never cut at an abbreviation such as "e.g."; `--fix` shows all of it.
- A JSON route (`--input -`) that fails prints its error once, in the result on stdout. stderr carries a single pointer line, `Error [CODE]: see error.message in the JSON result on stdout`. The difference between `kibi check --format json` (`{"structuredContent": ...}`) and `kibi check --input -` (the result envelope) is now documented in the CLI reference.
- `validate-upsert` accepts `plannedFacts` and `document`, as `kb_upsert` does.
- Diagnostic usage records detect the host the same way usage telemetry does, so non-Claude hosts are no longer reported as `unknown`.
- `kibi skills validate` reads the Kibi fields that the Claude Code and ZCode skill bundles nest under `metadata:`. Run from a subdirectory of a Kibi workspace, it resolves a relative path against the directory you ran it in, not the workspace root.
- The staged gate's semantic inventory message no longer says `semantic_text` "is set" when the document states none: the prose comes from its front matter value or, without one, its body statement.
- Hints that pointed to the `semantic-advisor` CLI route for a requirement analysis now name `kibi model`, which accepts `requirementId` and `mode`.
- The engine daemon is replaced when the Prolog core it loaded differs from the client's, even when the version numbers are the same. The daemon's identity now includes a digest of the core's Prolog sources.
- A cancelled engine request that is already running no longer runs on until the query timeout: the daemon stops its Prolog session, and the next request restarts the session. The same happens when the request's client disconnects. The timeout message now says the session was stopped, instead of telling you to stop a wedged engine.
- Clients that start together while a daemon is being replaced retry their handshakes on a new connection. Before, one of them could fail with `Kibi engine is shutting down` or `EPIPE`.
- The Cursor setup and CLI fallback messages, the always-on `kibi-workflow` rule and the Cursor README describe the project-local CLI JSON routes as an equal peer of MCP, matching the bundled skills; the rule no longer says to avoid the CLI when MCP tools are visible.
- `kibi-usage` corrects the `kibi signoff --questions` usage and the `kb_model` CLI mapping. It also explains that a success scenario written before its requirement reports `scenario-feasibility-unknown` until the requirement is written.
- A `kb_upsert` that renames a requirement (a changed `title`) or clears its `text_ref`, without resending its proposition ledger, keeps the stored claims and the subjects they name when the ledger reads `semantic_text`. Before, the store dropped them until the next `kibi sync` while the file kept them, so `kibi check` meanwhile reported the requirement as about no subject (`must-positive-scenario`) or hid its `related-requirement-unmodeled` pairs.
- `agent-requirement-unapproved-implemented` can no longer be silenced with a date. `kb_upsert` refuses a requirement whose `created_at` or `origin.recorded_at` is not an ISO 8601 date (`yesterday`, `2026-13-45T00:00:00Z`, `2026-02-30`) or lies more than a day in the future. A hand-edited document with such a date counts as older than the grace period, and the finding names the date and why it was not used (evidence `sinceProblem: not-a-date` or `future`) instead of "since its created_at yesterday".
- `kibi migrate --yes` counts the blocking findings of a plain `kibi check` in its closing `kibi check reports N blocking finding(s)` line, so N matches what `kibi check` then reports (it used to count only the rules schemas 15-18 added and missed, for example, `agent-requirement-unapproved-implemented`).
- `kibi migrate` text output labels its counts: the `Plan status` line gives the total number of actions (the JSON `actionCount`), and the `Remaining plan` line after `--apply-safe` splits its total into migration and quality backlog actions. The schema 18 note says it counts requirements with unmodeled rule claims, of which `kibi check` reports only those that pair with another requirement and no verdict settles.
- `kb_upsert` warns when a requirement's `pair_reviews` entry names, in `with`, a current requirement that shares no subject with it and has no `relates_to` edge to it: `kibi check` never pairs the two, so that review settles nothing.
