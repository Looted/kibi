---
"kibi-cli": patch
"kibi-mcp": patch
---

A closed requirement that no current requirement supersedes is treated as still governing in two more places: `kb_check` quotes it among the requirements the changed code implements, and `kibi signoff` lists it, with its firm-edit receipts, when its code changes. Both used to skip every closed requirement as retired.
