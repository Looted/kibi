---
"kibi-cli": patch
---

`kb_search` meaning hints now rank decisions by combining their own similarity with the scenarios, tests and facts they link, instead of letting one hit on a shared test crowd the list with unrelated requirements.

Each decision's meaning score is the mean of the two highest provider scores across the decision and its linked scenarios, tests and facts. Up to seven related-by-meaning items (`{id, title, score}`) appear in `queryAnalysis.hints.items` beside the decision cards on every search when a search-hints provider is active.
