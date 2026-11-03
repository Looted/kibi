---
"kibi-core": patch
---

The CHR pilot's derived coverage gaps no longer depend on the order of edges in the KB: it now checks each must-priority requirement for a scenario and a test, where it used to see only the first requirement with a scenario edge and the first with a test edge, and so reported covered requirements as gaps.
