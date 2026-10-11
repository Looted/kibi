---
"kibi-cli": minor
"kibi-runtime": patch
"kibi-mcp": patch
---

`kb_search` now says when it searched a branch store that was never compiled. On a new branch created without the post-checkout hook, a search used to return only "No intent search results … (abstained)" while the authored requirements sat uncompiled in `.kb/`; it now names the branch, reports the uncompiled store and tells the agent to run `kibi sync` first, the same diagnosis `kb_status` and `kb_check` already gave.

Technical summary: the `kb_search` payload gains `branch` (the attached Kibi branch or `null`, present whatever the result count) and, when `uncompiledBranchStoreReason` fires, `branchStore: { state: "not_compiled", code: "branch_store_not_compiled", path, detail, remediation }`; the text output appends the same note. The `kb_search` data contract and `docs/mcp-reference.md` list both fields.
