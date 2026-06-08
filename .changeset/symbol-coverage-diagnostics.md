---
"kibi-core": patch
---

Symbol-coverage violations now explain that direct `verified_by(Req,Test)` and `validates(Test,Req)` relationships may be blocked when a requirement uses scenarios. The diagnostics now tell you to use `verified_by(Scenario,Test)` or `validates(Test,Scenario)` instead, depending on your test graph.

This change improves check clarity when requirements are tied to scenarios, and it shortens the fix cycle for missing or blocked coverage.

- `kibi-core`: improved symbol-coverage diagnostics in `checks.pl` to reflect scenario-aware coverage rules.
- Added regression coverage in tests for direct requirement-to-test coverage checks with scenarios.
