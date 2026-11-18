---
"kibi-cli": patch
"kibi-agent-core": patch
---

The commit gate now asks for a firm-edit review when a change hides the code of a firm requirement while keeping its symbol record: deleting or emptying the file, renaming it away from the record, removing the declaration, or no longer exporting it. Before, only an edit inside the declaration or removing the record itself was gated. `kibi review-firm-edit` records the review of such a symbol as a removal, so the review the gate asks for can now be recorded even when the file is gone. The same holds when the file is renamed to a path that is not source (a `.txt` file, a Markdown page) or replaced by binary or non-UTF-8 content, which Kibi skips; `kibi review-firm-edit` refuses to review code it cannot read as UTF-8. A file-level symbol record (a config artifact, or a file no extractor reads declarations from) stands for its whole file: any edit of the file or its removal needs a review, and the review is bound to the whole file.
