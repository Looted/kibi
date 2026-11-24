---
"kibi-cli": patch
---

`kb_query` with an `id` that finds the entity now ends its text with "Pass includeBody: true to read its authored body." when `includeBody` was not requested, so an agent learns that the authored Markdown body is available. The hint is omitted when `includeBody` is true, when nothing was found, and for listings without an `id`.
