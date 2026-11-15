---
"kibi-cli": patch
"kibi-mcp": patch
---

Pending-source receipts now record the branch they were written on, and `kibi sync` no longer fails on a receipt from another branch whose file is absent from this branch; an untracked file that is present is still compiled on every branch. Before, the receipts folder was shared by every branch, so after an entity file was committed on one branch and another branch was checked out, sync failed with "Pending source is missing" until `kibi branch recover --apply`. Receipts written before this change name no branch and are still checked on every branch.
