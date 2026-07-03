---
"kibi-cli": patch
---

Kibi quality checks now let teams resolve noisy advisory warnings with explicit, reviewable KB metadata instead of creating fake e2e evidence. Passing integration-level regression evidence can satisfy coverage-depth quality checks, and requirements tagged as intentional umbrella or epic requirements no longer keep emitting broad-fanout diagnostics.

Technical summary:

- Preserve test `verification_scope` and `verification_perspective` fields during CLI sync persistence.
- Treat passing integration coverage as sufficient quality evidence for coverage-depth diagnostics.
- Suppress broad-fanout quality diagnostics for requirements explicitly tagged `umbrella` or `epic`.
