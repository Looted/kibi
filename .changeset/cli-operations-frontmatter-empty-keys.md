---
"kibi-cli": patch
---

Updating an entity whose front matter has an empty key followed by a comment (`title: # todo`) no longer glues the comment onto the new value, and front matter written with explicit `? key` entries is rewritten as plain keys instead of turning into a nested key.
