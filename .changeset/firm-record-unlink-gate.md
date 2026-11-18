---
"kibi-cli": patch
---

`kibi check --staged` treats a change that drops a symbol record's `implements` link to a current firm requirement, or points the record at another symbol or file, like removing the record: it needs a `kb_review_firm_edit` receipt. A knowledge-base-only commit used to release firm code from its rule without any review, so a later edit of that code was not gated.
