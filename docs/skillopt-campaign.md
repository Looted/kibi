# SkillOpt Campaigns

`campaign.ts` is a portable, review-only orchestration prototype for producing
and checking frozen Kibi skill candidates. It does not modify the source
worktree, adopt a candidate, publish a package, or use held-out evaluation.

Run it from the repository root. Every command requires an artifact directory
outside the source worktree. `--source-root` is optional and, when supplied,
must identify the current Git root.

## Commands

### Revise one skill

`revise` asks the existing Codex SkillOpt step for one paragraph anchored to the
current baseline. The step may make one format repair, but the campaign does
not start additional generation calls. The model source and the real accepted
optimizer receipt are preserved in the manifest provenance.

```text
bun scripts/skillopt-eval/campaign.ts revise \
  --artifact-root <artifact-root> \
  --skill kibi-usage \
  --objective-file <objective-file> \
  --heading "## Closeout" \
  --allow-paid \
  [--feedback <public-feedback-json>]
```

Feedback is optional and must have this exact shape:

```json
{
  "schemaVersion": "1.0.0",
  "observations": [
    {
      "family": "recovery",
      "observation": "Describe a public observation.",
      "hypothesis": "Optionally describe a public hypothesis.",
      "toolSequence": ["kb_search", "kb_query"]
    }
  ]
}
```

It cannot contain task, fixture, run, episode, private, held-out, or ID
fields. Feedback is prompt context, not evaluator evidence.

### Compose insertions offline

`compose` accepts one to four JSON insertion files. Each file contains only
`headingAnchor` and `paragraph`. Every paragraph is at most 1,600 UTF-8 bytes.
All insertions are independently anchored against the same live baseline. They
are then applied in descending source-offset order and inverted to prove exact
baseline recovery.

```text
bun scripts/skillopt-eval/campaign.ts compose \
  --artifact-root <artifact-root> \
  --skill kibi-usage \
  --insertion-file <insertion-a.json> \
  [--insertion-file <insertion-b.json>]
```

### Evaluate candidates

`evaluate` accepts one to three candidate manifest files. The baseline is
loaded automatically from the current source. Both limits are explicit:
`--repeats` is 1..3 and `--max-target-episodes` is 1..256, and the latter must
cover the complete baseline-plus-candidate development matrix.

```text
bun scripts/skillopt-eval/campaign.ts evaluate \
  --artifact-root <artifact-root> \
  --skill kibi-usage \
  --candidate-manifest <candidate-manifest> \
  [--candidate-manifest <candidate-manifest>] \
  --max-target-episodes <count> \
  --repeats <1|2|3> \
  --allow-paid
```

Before any paid dispatch, the campaign validates every manifest, body hash,
baseline hash, frontmatter hash, resource hash, insertion anchor, paragraph
shape, source cleanliness, fixture readiness, and target-cell cap. It then
freezes all bodies, initializes the private cross-process target budget,
creates a fresh fixture root, and runs preflight and the capability canary. The
live screen uses the existing Luna medium target profile and Sol xhigh
optimizer profile, with source head/tree and all skill-resource fences checked
again before completion. Development tasks are generated programmatically;
private manifests are consumed internally and are never printed.

Progress is durable in `campaign-state.json`. Successful cells remain in that
state when a later cell fails. A completed artifact directory is immutable to
the campaign command and cannot be reused.

### Confirm a complete evaluation

`confirm` consumes a previous complete evaluation and performs a new frozen
baseline/candidate comparison. It never calls the optimizer. The current source,
candidate bodies, baseline, model profile, and task catalog must match. The
repeat count and target cap may change; they define a new cohort rather than
changing the campaign identity. Old cells are retained, new cells have their
own explicit run/task/local-repetition pairing, and the combined aggregate must
have no mean, hard-pass, family, or security regression.

```text
bun scripts/skillopt-eval/campaign.ts confirm \
  --artifact-root <new-artifact-root> \
  --previous-evaluation <complete-evaluation.json> \
  --max-target-episodes <count> \
  --repeats <1|2|3> \
  --allow-paid
```

The new comparison gets a new fixture root and target budget. It does not
cherry-pick cells or reuse an old fixture cache. Before the paid canary, every
prior cell is rechecked against its persisted request, receipt, evidence index,
artifact hashes, usage, violations, isolation sentinels, body label, and cohort
lock. Tampered content hashes, pairing keys, source fences, surface hashes, or
incomplete prior evaluations are rejected.

### Package offline

`package` accepts one to four manifests, one for each candidate skill at most.
It assembles all four canonical skills through `assembleCanonicalSkills` in an
external workspace. Only supplied candidate bodies may differ; frontmatter,
resources, and all other canonical bodies are copied from the source. This is
an offline assembly and leaves production adoption explicitly unperformed.

For a complete bundle, pass one strict bundle manifest instead. It must select
all four canonical skills exactly once, using either `baseline` or `candidate`
for each skill. Candidate entries reference their nested campaign manifests
relative to the bundle file. Bundle mode cannot be combined with individual
candidate manifests and does not accept `--evaluation`; bundle evaluation and
production adoption remain explicitly unperformed.

```text
bun scripts/skillopt-eval/campaign.ts package \
  --artifact-root <artifact-root> \
  --candidate-manifest <candidate-manifest> \
  [--candidate-manifest <candidate-manifest> ...] \
  [--evaluation <complete-evaluation.json>]
```

```text
bun scripts/skillopt-eval/campaign.ts package \
  --artifact-root <artifact-root> \
  --candidate-manifest <bundle-manifest.json>
```

The package receipt reports precise manifest readiness, changed skill bodies,
and whether supplied complete evaluation evidence matched. Without
`--evaluation`, `evidenceValid` is false; no adoption claim is inferred.

## Artifact Contract

Candidate manifests are strict JSON envelopes with schema version `1.0.0`, a
canonical skill, baseline/body/frontmatter/resource hashes, one to four
anchored insertions, the complete frozen body and its hash, and provenance.
Host composition has `modelSource: "none"`. Model provenance is accepted only
when it contains the receipt emitted by `runCodexSkillOptStep`; the campaign
does not manufacture receipts.

The evaluation envelope retains frozen manifests, the baseline body, every
cell, source/model/context bindings, pairings, and a content hash. A failed
run retains its partial state and any target-budget counter already reserved.
Source fences bind Git `HEAD` and the complete tracked tree metadata. Tracked
symlinks are fenced as Git entries and are not followed while computing the
source fence. Cell receipts bind the request, replicate, cohort lock, body
label, score, failures, usage, and hashed artifacts.
No command writes Kibi metadata, source files, adoption state, commits, pushes,
or held-out results.

This is prototype-only review infrastructure. It does not establish production
adoption or replace an external approval decision.
