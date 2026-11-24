---
"kibi-cli": patch
---

`kb_search` hints now list first the requirements that several provider hits agree on. Before, one hit on a test or scenario linked to several requirements took one of the ten places for each of them and could push the requirement the question was about off the list. The ten shown hints, the 0.44 trigger and the provider contract are unchanged.

`queryAnalysis.hints.items` is ordered by the summed score of every provider hit that led to an item, highest first; items with equal sums keep the order of their best hits, and each item still carries the `score` and `via` of its best hit.
