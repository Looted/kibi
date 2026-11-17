---
"kibi-cli": patch
---

A `kb_check` scoped to source files now lists findings on a changed KB document whose file name is not its id: the id is read from the document's front matter, with the file name as the fallback.
