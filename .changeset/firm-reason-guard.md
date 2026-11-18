---
"kibi-cli": patch
"kibi-mcp": patch
---

`kb_upsert` now refuses to rewrite the recorded reason (`rationale`, which `why` sets) of a firm requirement unless the write cites new human words, as it already refused a new title or statement. The reason is quoted as the person's in search results and hook notes, so an agent's rewrite used to be attributed to the person. Giving a reason where none was recorded, or replacing "Reason not stated", is still allowed, and `kibi check` reports a hand edit of the reason as `decision-firm-edited`. A new `approval_ref` now releases an edit even when `origin.ref` is unchanged, as the guidance says. The `kb_record` step that asks for a reason now says not to pad the person's reason to reach 12 words and to cite their words as `origin.ref` instead.
