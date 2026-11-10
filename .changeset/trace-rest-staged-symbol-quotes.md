---
"kibi-cli": patch
---

`kibi check --staged` no longer drops a changed symbol from the traceability report when its file path or name contains a quote: the Prolog rows are now split with the shared scanner, which honours escaped quotes inside atoms.
