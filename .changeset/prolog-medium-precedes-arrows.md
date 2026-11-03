---
"kibi-core": patch
---

A `precedes` obligation whose pair holds more than one ` -> ` arrow, such as `A -> B -> C`, is now reported as misspelled. Before, the check split it at the first arrow and compared `A` with `B -> C`.
