---
"kibi-cli": patch
---

`kb_check` and impact analysis no longer load the capability plugin registry for symbol extraction.

Maintenance paths stay on deterministic builtin ts-morph analysis. External replace/augment/shadow extractors only participate when a caller passes an explicit registry (for example symbol repair). This matches the documented v1 contract that sync/check/status/proof must not invoke external plugins.
