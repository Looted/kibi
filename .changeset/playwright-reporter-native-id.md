---
"kibi-cli": patch
---

The Playwright proof reporter (`kibi-cli/playwright-reporter`) now gives each case a `native_id`: its spec location and describe and test titles, such as `tests/checkout.spec.ts:4:5 › checkout › accepts a card`. Proof ingest requires a `native_id` and a matching `proof_bindings` entry for every individually observed case, so before this change `kibi prove` refused every Playwright result with "native_case result has no native_id".
