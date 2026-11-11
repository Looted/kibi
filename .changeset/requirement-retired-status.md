---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

A requirement whose behavior no longer exists can now say so: set `status: retired` with a `retired_reason`. Until now `closed` meant both "done and still valid" and "retired", so a retired requirement without a successor kept being served as governing by search, hooks and every current-intent check. A retired requirement stops governing, and `kibi check` makes sure nothing current is left hanging off it. This is KB schema 14: run `kibi migrate --yes`, then review the requirements it suggests retiring.

- New requirement status `retired`, with the required field `retired_reason`. `kb_upsert` refuses `status: retired` without a reason. A retired requirement is out of proof scope ("requirement is retired"), listed under `notGoverning` by `kb_search`, and treated as retired by `symbol-owner-superseded` and the context check.
- New blocking check rule `retired-reason-missing`: a retired requirement must state why.
- New blocking check rule `retired-owner-only`: a current fact, scenario or test whose every owning requirement is retired must be relinked to the current owner, archived (`status: deprecated` for facts and scenarios) or deleted (tests).
- `kibi migrate` (KB schema 14) lists every `closed` requirement that nothing supersedes and whose own source says it was retired (its proof exemption, title, body or a `historical-status:` tag) as a `req_retired_status_suggest` review action. Approving one by id sets `status: retired` and a `retired_reason` quoting those words. Kibi never retires a requirement on its own.
- `kibi migrate` now suggests `retired` instead of `closed` for requirements with the legacy statuses `deprecated` and `rejected`, and `kb_upsert` lists `retired` instead of `deprecated` as a requirement status.
- The `kibi-usage` skill explains when to retire a requirement instead of closing it.
