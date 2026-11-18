---
"kibi-cli": patch
"kibi-mcp": patch
---

`kb_record` no longer reports a failure after the requirement was written as retryable. When a later step fails, the error names the written requirement and says not to run `kb_record` again, so a retry does not record the same rule twice under a new id.
