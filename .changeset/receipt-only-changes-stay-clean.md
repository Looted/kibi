---
"kibi-cli": patch
---

CI-generated proof reports no longer claim the workspace was dirty.

Every strict proof run appends fresh verification receipts to the tracked test documents before the health report is generated. Those receipt-only edits cannot change the verification snapshot hash — receipts are stripped before hashing — yet the workspace dirtiness flag was computed from raw git status, so every CI report shipped a "Proof was evaluated against a dirty workspace" warning even though the checkout was clean. Receipt-only markdown changes are now classified as not snapshot-relevant, keeping the dirtiness flag consistent with the snapshot hash it guards.

- `workspaceSnapshot` in `packages/cli/src/public/operations/node-ports.ts` now compares receipt-stripped working-tree content against the receipt-stripped `HEAD` blob for modified tracked markdown files; matching content marks the change as receipt-only and excludes it from snapshot dirtiness.
- Added a unit regression covering receipt appends to a tracked proof document: dirtiness stays false while non-receipt edits still dirty the snapshot.
