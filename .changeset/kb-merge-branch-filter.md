---
"kibi-cli": patch
---

The KB merge action fails when `KB_MERGE_BRANCHES` is not a JSON list or a space-separated list of branch names, instead of dropping the filter and handling every open pull request. A list that names no branch now handles none.
