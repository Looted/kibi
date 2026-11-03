---
"kibi-core": patch
---

`kb_status` no longer lists the same stale reason twice when two entities name one file with different `#` anchors (for example `src/a.ts` and `src/a.ts#top`), so `staleReasonCount` counts each stale path once.
