---
"kibi-cli": patch
---

Reconnect to the live branch generation before journaled sync mutations. A daemon left attached to a replaced store is stopped and restarted so relationship deletes and cache recovery no longer require `--rebuild`.
