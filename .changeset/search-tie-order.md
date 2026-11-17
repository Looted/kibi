---
"kibi-cli": patch
"kibi-mcp": patch
---

`kb_search` now orders results with equal scores by type and id in code-unit order, the same on every machine. It used the process locale, so two machines could list tied results in a different order (a Czech locale, for example, sorts `ch` after `cz`).
