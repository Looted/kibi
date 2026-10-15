---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
"kibi-agent-core": patch
"kibi-claude": patch
---

After a migration, the `kb_apply_plan` digest of the remaining plan now says when an automatic action in it is blocked: it waits for the actions in its `dependsOn` and needs no approval until a later plan shows it ready. Before, a blocked automatic action looked like something left to approve. The Claude hook's firm-edit question no longer prints a double full stop after a requirement title that ends in one.

The digest's `next` text appends a count of blocked automatic actions when there are any. `firmEditConfirmation` in `kibi-agent-core/decision-guard` trims a trailing full stop from the named requirements before closing the sentence.
