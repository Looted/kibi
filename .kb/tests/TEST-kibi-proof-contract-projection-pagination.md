---
title: Proof campaign contract selection pages projected tests without receipt history
status: passing
verification_scope: unit
verification_perspective: internal
tags:
  - proof
  - contract
  - projection
  - pagination
id: TEST-kibi-proof-contract-projection-pagination
type: test
---
The Prolog fixture projects 123 tests with proof contracts, bindings, and 8 KB receipt histories, then verifies ordered pages of 37, 37, 37, and 12 rows; an exact-ID page is also covered. Every projected row retains the contract and bindings while excluding proof_receipts. The CLI fixture selects 235 projected tests in three pages of at most 100, returns all IDs in order, and asserts that no selection goal or result materializes receipt history. Tests: packages/core/tests/kb.plt, packages/cli/tests/modeling-and-public-lcov.test.ts, and packages/cli/tests/proof/prove-command.test.ts.