---
"kibi-cli": patch
---

`kibi check --staged` no longer offers a type-shape record id that a record written to the working tree but not staged already holds; applying the offer used to move that record to the other file. A declaration whose record is written but not staged is offered again under that record's id.
