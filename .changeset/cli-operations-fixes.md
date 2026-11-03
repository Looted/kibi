---
"kibi-cli": patch
---

Fix several small authoring and migration issues:

- Conditional requirements such as "orders may ship only when the order total is 10 or more" (or "4 or fewer") are now read as one comparison and become a rule, instead of being rejected as a disjunction.
- Typecheck claim bindings that fail now keep the colon between "the set-equality witness" (or "the required-fields witness") and the TypeScript error, so the compiler's message reads as its own sentence again.
- Updating an entity whose front matter has an empty key followed by a comment (`title: # todo`) no longer glues the comment onto the new value, and front matter written with explicit `? key` entries is rewritten as plain keys instead of turning into a nested key.
- The polarity value migration now reports a fact whose front matter is indented as a whole as one it could not verify, instead of failing with a raw YAML parser error.
