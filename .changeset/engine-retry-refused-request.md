---
"kibi-cli": patch
"kibi-mcp": patch
---

A request that a Kibi engine daemon refuses because it is shutting down (another client is replacing it) is sent again on a new connection, up to four attempts. The daemon refuses such a request before running it, so it is safe to retry; the request used to fail with "Kibi engine is shutting down; request was not executed".
