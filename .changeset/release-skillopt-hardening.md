---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-codex": patch
"kibi-cursor": patch
---

Kibi’s release checks now validate compiled package APIs and dependency ranges in isolated npm and pnpm consumers, while the usage skill and private SkillOpt evaluator report task completion, KB freshness, verification, proof, and accepted limitations independently. Consumer repositories keep ownership of their local artifact update scripts and dependency overrides.

- Remove library-side consumer dogfood installers and retain release-only packed checks.
- Add deterministic closeout expectations and dogfood-derived held-out cases.
