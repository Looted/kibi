---
"kibi-cli": patch
---

The KB manifest merge driver keeps the merged-in side's record order and places records only the current branch holds after the record they follow there. Merging the base branch into a pull request (as the KB merge action does) no longer reorders `.kb/symbols.yaml` and relationship shards, which had produced thousands of lines of order-only churn.
