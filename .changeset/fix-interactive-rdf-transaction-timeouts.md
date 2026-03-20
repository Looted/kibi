---
"kibi-cli": patch
---

Load SWI-Prolog's `rdf_db` library in interactive CLI sessions so `rdf_transaction/1` mutation queries do not fall into interactive correction prompts and hang MCP requests that rely on the long-lived Prolog process.
