---
"kibi-core": patch
---

Edge-case rows in a requirement proof no longer carry an empty `waiver` object when their grounding fact records no case waiver; only rows whose fact has a `case_waiver` show one.
