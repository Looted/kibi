---
"kibi-core": patch
---

Status and lock-owner timestamps stay accurate when Kibi runs in a non-UTC timezone, and requirement proof now prefers receipts that match the current per-contract binding. Documentation and end-to-end test directories no longer make a knowledge base look stale.

- Convert sync-file and lock-start timestamps to UTC before formatting the `Z` suffix and serialize lock-owner metadata as a JSON object.
- Use binding-matched receipts when present, falling back to the snapshot receipts otherwise.
- Ignore the `tests/e2e` and `tests/benchmarks` directories themselves during documentation freshness scans.
