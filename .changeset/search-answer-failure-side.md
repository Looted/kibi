---
"kibi-cli": patch
"kibi-mcp": patch
---

The `kb_search` answer layer keeps more governing requirements now that requirements carry failure-side scenarios. A matched fact that a requirement's scenario assumes, such as the opposing value a rejection scenario tests, is lifted to that requirement instead of being listed as ungoverned. When an answer must shrink to fit 16 KB, each requirement keeps only its first scenario and test before a lower-ranked requirement is dropped.
