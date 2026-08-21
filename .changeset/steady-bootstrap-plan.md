---
"kibi-cli": major
"kibi-runtime": major
"kibi-mcp": major
"kibi-opencode": major
"kibi-codex": major
"kibi-cursor": major
---

Kibi onboarding now separates repository initialization from teaching Kibi about an existing codebase. After `kibi init`, an agent can run the `kibi-bootstrap` workflow to produce a reviewable, hash-bound plan and apply the exact approved plan safely. The old autopilot and init-kibi public names are removed so new users see one clear bootstrap path.

- Replace `kb_autopilot_generate`/`autopilot-generate` with `kb_plan_bootstrap`/`plan-bootstrap`.
- Add `kibi.bootstrap-plan.v1` validation, deterministic approval hashes, dependency ordering, stale-plan checks, and typed bootstrap recovery through `kb_apply_plan`.
- Synchronize the four canonical skill mirrors and update client adapters, docs, fixtures, and SkillOpt cases.
