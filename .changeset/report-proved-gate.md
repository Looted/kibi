---
"kibi-cli": patch
---

`kibi report`: the "Where proof stops" rail ends with a Proved step after Tested (the former Evidence step), so a requirement that is tested but lacks a re-checked certificate for every claim shows where it stops instead of disappearing at the end of the rail. The step reads "N tested, not proved", is drawn as optional rather than blocked, and states how many claims are proved by certificate across the report. Selecting it lists those requirements. The summary tiles are laid out as two full rows of six (three and two columns on narrower screens), with the evidence ladder first, instead of leaving an empty gap at the end of the second row. Gate descriptions no longer run into the next column.
