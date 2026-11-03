---
"kibi-core": patch
---

Facts with a start date and no end date now overlap later facts in the consistency checker. Before, an open end was compared as an empty date, so a real contradiction between such facts was reported as unresolved ("validity windows never overlap") instead of as a contradiction.
