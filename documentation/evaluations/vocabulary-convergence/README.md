# Vocabulary-convergence evaluation

Kibi can only find duplicate or contradicting requirements when equivalent
prose lands on the same logical term: the same `subject_key`, the same property
or predicate, and comparable values. This evaluation measures how often that
happens.

## CI-safe harness (shipped)

The corpus lives in
[`packages/cli/tests/convergence/paraphrase-groups.json`](../../../packages/cli/tests/convergence/paraphrase-groups.json).
Each group is a set of hand-authored strict claims that an agent could extract
from paraphrased prose:

| Kind | Meaning | Expected |
| --- | --- | --- |
| `unit_variant` | Same obligation, different units (`30 min`, `1800 seconds`, `0.5 hours`) | converge |
| `subject_variant` | Same obligation, the agent guessed a different subject key | converge |
| `restatement` | Same obligation restated in other words | converge |
| `property_gap` | Same obligation, different property keys (`ttl` vs `entry_lifetime`) | known gap: must not share a signature, but should be nominated for review |
| `control` | Different obligations (different values, `Mb` vs `MB`) | must never converge or be nominated |

The harness
([`packages/cli/tests/convergence/harness.ts`](../../../packages/cli/tests/convergence/harness.ts))
models every variant the way `kb_model_requirement` does. The agent's subject
guess goes through the real vocabulary-alignment composition (builtin ranker,
optionally a provider). The resulting facts are written to a real temporary
Prolog KB. Prolog then computes canonical signatures and runs `domain-redundancy`,
so the numbers measure the shipped checks, not a re-implementation.

It reports four rates:

- **signature convergence**: share of equivalent groups whose variants all share one signature
- **redundancy detection**: share of equivalent groups that `domain-redundancy` fully pairs
- **review recall**: share of equivalent groups, including property-key gaps, caught by `domain-redundancy` or nominated by `compareClaims`
- **false positives**: share of controls that converged, were flagged redundant, or were nominated

Run it (CI runs it as part of the unit suite):

```bash
bun test --timeout 120000 ./packages/cli/tests/convergence/convergence.test.ts
# Optional JSON reports, one per mode:
KIBI_CONVERGENCE_REPORT=/tmp/convergence-{mode}.json \
  bun test --timeout 120000 ./packages/cli/tests/convergence/convergence.test.ts
```

Two modes run:

- `builtin`: the deterministic ranker and token-similarity comparer only.
- `jev-fake`: `kibi-plugin-jev` in `replace` mode with an injected
  `clientFactory` that behaves like an oracle. It picks the intended subject
  when the builtin offered it, and recognizes paraphrases inside equivalent
  groups. This exercises the provider path end to end and shows the ceiling
  given builtin candidate recall. It is **not** a measurement of Jev quality.

Results at introduction:

| Mode | Signature convergence | Redundancy detection | Review recall | False positives |
| --- | --- | --- | --- | --- |
| builtin | 0.571 | 0.571 | 0.5 | 0 |
| jev-fake | 1 | 1 | 1 | 0 |

Unit canonicalization alone converges every `unit_variant` group. Builtin misses
come from subject paraphrases with little lexical overlap, such as
`user_password` vs `auth.password`, and `subscriber_summary` vs
`notification.email`. Property-key paraphrases are out of scope for the subject
ranker by design; only `compareClaims` can nominate them.

## Agent-in-the-loop evaluation (future, not built)

The shipped harness starts from already-extracted claims. The realistic question
is whether an agent, given only paraphrased prose and a live KB, produces
converging models. To run that later:

1. **Corpus.** For each group, keep the prose only (`text`), drop the
   hand-authored `subjectKey`/`propertyKey`/`value` fields, and add two or three
   more paraphrases per group written by a different author than the seed
   requirement. Keep controls.
2. **Workspace.** Create a temporary Kibi workspace per trial
   (`kibi init`), seed the vocabulary subjects and their anchor requirements
   through `kb_upsert`, and sync.
3. **Agent.** For each paraphrase, give a real model the Kibi skills
   (`kibi-usage`) and only the prose. Ask it to model the requirement with
   `kb_model` (`mode: "requirement"`, the `kb_model_requirement` operation)
   → `kb_upsert`, sequentially. Record every tool call
   and the resulting facts.
4. **Configurations.** Run at least:
   builtin only; `kibi-plugin-jev` activated for
   `kibi.vocabulary-alignment.v1` in `augment` and in `replace`; and `shadow`
   to log disagreements without changing outcomes. Record provider stamps and
   `fallbackUsed` for every call.
5. **Scoring.** After each group, run `kibi check --rules
   domain-redundancy,subject-key-identity,subject-key-shape --format json` and
   score the same four rates as the CI harness from the KB state. Also report
   how often the agent kept `vocabulary:new-subject` declarations and
   `subject_reuse_review` warnings open without acting on them.
6. **Hygiene.** Live runs need `TYPESAFE_API_KEY` and a model key. Never run
   them in CI. Pin model IDs (`KIBI_JEV_MODEL`), repeat each configuration at
   least five times, and report variance.

The live harness should reuse `runConvergenceHarness` scoring by exporting the
KB facts it produced, so the CI and live numbers stay directly comparable.
