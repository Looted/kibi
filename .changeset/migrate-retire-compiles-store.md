---
"kibi-cli": patch
---

`kibi migrate --apply-safe` compiles the store after it applies an approved source change such as retiring a requirement, so `kibi status` and queries read fresh at once instead of waiting for `kibi sync`. A failed compile is reported as a failed `post-apply-sync` action.
