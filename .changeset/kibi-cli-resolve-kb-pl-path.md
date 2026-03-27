---
"kibi-cli": patch
---

Export resolveKbPlPath from kibi-cli public prolog surface

Add `resolveKbPlPath` to the public `kibi-cli/prolog` export so that `kibi-mcp`
can import it without breaking against older `kibi-cli` versions that do not
expose this symbol.
