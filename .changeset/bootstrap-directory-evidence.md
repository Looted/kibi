---
"kibi-cli": patch
---

Thin-repository bootstrap plans no longer report a false binding diagnostic
for layout evidence rows that name directories (for example a bare `src`
entry), so an otherwise-ready plan is no longer wrongly blocked from apply.
Agents bootstrapping a fresh, initialized-but-unseeded workspace can now move
from `kb_plan_bootstrap` straight to `kb_apply_plan` without hitting
"only ready plans may be applied" on a plan that was actually eligible.

- Bootstrap plan binding skips non-file evidence paths when hashing per-source
  evidence; directories carry no document content and no longer surface as
  `Bootstrap evidence source is unavailable` diagnostics.
