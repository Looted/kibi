---
"kibi-cli": patch
"kibi-mcp": patch
---

`kibi` and `kibi-mcp` now exit at startup with a clear error when started on Node.js older than 22, naming the Node version and path they found. Before, npm only warned about the `engines` mismatch and commands failed later with errors such as `Map.groupBy is not a function` in the pre-commit hook.
