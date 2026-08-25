---
"kibi-cli": patch
---

Canonical kibi-usage skill guidance no longer illustrates the direct-store-edit anti-pattern with a literal `.kb/` path.

Trust-plane candidate validation rejects any skill text that appears to advise touching the compiled store directly, and the baseline itself tripped that check ("direct `.kb/` edits"), so affected optimization stages could never freeze a candidate. The sentence now says "direct KB-store edits"; the guidance is unchanged.

Follows the earlier host-neutral wording fix; together these make all four canonical skills valid baselines for SkillOpt runs.
