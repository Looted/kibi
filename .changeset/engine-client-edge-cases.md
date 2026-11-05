---
"kibi-cli": patch
---

Tighten a few engine edge cases:

- An indexed entity or search page whose engine answer has no count now reports the number of rows on the page instead of 0.
- A publication lock counts as held only by the live process whose pid it records; a lock with a missing, unreadable or corrupt pid is treated as ownerless once it is stale.
- Each attempt to connect to the engine socket now waits its full 250 ms instead of being shortened as the overall deadline nears.
- An unterminated quoted text that ends in a lone backslash no longer hides the rest of a goal from the safety check, so a forbidden call after it is refused.
