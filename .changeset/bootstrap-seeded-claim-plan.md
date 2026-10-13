---
"kibi-cli": minor
"kibi-runtime": patch
"kibi-mcp": patch
---

`kb_plan_bootstrap` on a repository that already has a knowledge base now plans the intent claims the agent declares instead of returning an empty handoff. Claims already in the knowledge base are counted as such, the rest form a plan that `kb_apply_plan` applies after approval, so an agent no longer has to compile and write each claim one at a time. The per-source claim accounting now says why each claim was not planned, and the seeded handoff tells the agent what to do with its claims.

- `attached_seeded_handoff` keeps discovered candidates (repository documents, symbols, tests) off but plans declared `intentClaims`, deduplicated against existing entity IDs. A plan holding only claim-derived candidates has `applyBlocked: false` and can be `ready`; without declared claims, or when none can be planned, the result stays a `handoff`.
- The CLI route now reads existing entity IDs from the engine on an attached root (it already started the engine for status), so claims already in the KB are reported as `entity_exists` there too instead of being planned again.
- `Knowledge source …` diagnostics split the not-planned count by reason: suppressed by the activation mode (new `suppressed_by_activation` rows in `suppressedCandidates`, one per claim), another `suppressedCandidates` row, a `sourceOnlySignals` follow-up, or diagnostics only. The counts add up to the declared total.
- Seeded `handoffMessage`, `recommendedActions` and the prompt block name the next step for declared claims: apply the plan when there is one, otherwise compile each remaining claim with `kb_compile_intent`.
- `kibi-bootstrap` skill 3.12.0 covers the seeded path and the new accounting.
