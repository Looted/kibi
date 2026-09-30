---
title: Batched proof receipt ingest restores uncommitted sources under the mutation lock
status: passing
verification_scope: unit
verification_perspective: internal
tags:
  - proof
  - ingest
  - atomicity
  - mutation-lock
id: TEST-kibi-proof-ingest-batch-atomicity
type: test
---
This focused regression exercises more than 25 receipt updates and injects Prolog commit failure in batch 1 and batch 2. A batch-1 failure leaves 0 compiled receipts committed and restores all 52 authored documents. A batch-2 failure preserves the first 25 committed receipts and restores all 27 uncommitted authored documents, including later prepared entries. Assertions verify exact authored-source and compiled-receipt consistency, that the operation-owned mutation lock remains held at each batch boundary and during rollback, and that a competing writer cannot acquire the lock before compensation finishes. Test: packages/cli/tests/operations/ingest-proof.test.ts.