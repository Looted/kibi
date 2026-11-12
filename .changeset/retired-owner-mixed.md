---
"kibi-core": patch
---

`retired-owner-only` now also reports an entity whose owners are all past when they mix retired requirements with superseded or deprecated ones. Before, it fired only when every owner was retired, so such an entity was owned by no current requirement and went unreported. The message names which kind of owners it has.
