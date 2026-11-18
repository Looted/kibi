---
"kibi-cli": patch
---

The commit gate now asks for a firm-edit review when a change hides the code of a firm requirement while keeping its symbol record: deleting or emptying the file, renaming it away from the record, removing the declaration, or no longer exporting it. Before, only an edit inside the declaration or removing the record itself was gated. `kibi review-firm-edit` records the review of such a symbol as a removal, so the review the gate asks for can now be recorded even when the file is gone.
