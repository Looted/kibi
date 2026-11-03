---
"kibi-cli": patch
---

Playwright case extraction now recognises tests called through a `test` alias that contains `$` (such as `import { test as $test }`), and qualifies tests inside `test.describe.only(...)` and `test.describe.skip(...)` blocks with their suite title, matching the titles the Playwright reporter records.
