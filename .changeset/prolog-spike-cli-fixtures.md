---
"kibi-cli": patch
---

Kibi's CLI pre-release tests now check Git-hook behavior using the Git executable available on each runner. The init error test runs in its own Git workspace, so a host checkout cannot change the result. This keeps the release check meaningful across supported build environments; installed CLI behavior is unchanged.

- kibi-cli tests: resolve the actual Git executable for the generated-manifest hook fixture.
- kibi-cli tests: isolate the mocked init branch error from the ambient checkout.
