# Symbol Traceability Taxonomy

This rubric freezes how Kibi classifies symbols for ownership, production coverage, and integration/e2e expectations.

## Frozen role split

- `implements` = direct requirement ownership
- `covered_by` = production coverage evidence
- `executable_for` = executable test code identity

Never use `covered_by` as ownership and never use `executable_for` as production coverage.

A symbol that uses `executable_for` must not also carry `implements` or `covered_by`.

Current engine alignment:

- `executable_for` marks executable test symbols and excludes them from production ownership gates.
- Any symbol without `executable_for` stays in the production ownership lane for `implements` and production coverage checks, even if it is metadata-heavy or non-runtime.

## Symbol classes

### Behavioral anchors

Traceability relationships (`implements`, `covered_by`, `executable_for`) should target behavioral symbols when available. Behavioral symbols include runtime functions, classes, methods, accessors, behavior-bearing class properties, executable test helpers, and manual anchors for behavior composed through factory or expression constructs.

Extracted class members use `ClassName.memberName` when they are the narrow behavioral seam. For example, an exported UI component property initialized with `computed(() => ...)`, `effect(...)`, `signal(...)`, a callback, or another non-trivial expression can be a behavioral anchor such as `UploadPageComponent.processingProgressLabel`. Prefer linking that member directly when the requirement ownership is about the member's behavior or UI-facing copy.

Interfaces, type aliases, and enums are `type-shape` symbols. They describe data or API shape and should not by themselves block a module/file-level behavioral link. When behavior is composed through factory expressions, generated code, framework conventions, or language constructs the extractor cannot model, declare a manual symbol in `documentation/symbols.yaml` with `symbol_role: behavioral`.

If no precise behavioral anchor exists yet, use `granularity_reason: extractor-miss` or `granularity_reason: module-level-behavior` on the coarse symbol and treat it as an audited fallback.

```yaml
symbols:
  - id: SYM-video-player-store-connect
    title: VideoPlayerStore.connectVideoElement
    status: active
    sourceFile: src/video-player.store.ts
    symbol_role: behavioral
    relationships:
      - type: implements
        target: REQ-video-player-connects-element
```

### Semantic review after source edits

Impact diagnostics intentionally separate graph shape from semantic truth. A changed behavioral member can have complete `implements` and `covered_by` links and still emit `symbol_semantic_review_needed`; that warning tells the agent to inspect whether the linked requirement, scenario, and test still describe the changed behavior or UI copy. Kibi can point at the linked entities, but an LLM or human must review the prose and tests before claiming the KB remains semantically current.

Run MCP `kb_check({sourceFiles:[...], includeImpactDiagnostics:true, includeWorkingTreeDiff:true})` while the edit context is fresh. Treat CLI `kibi check --staged` and git hooks as the later hard fallback for missing impact evidence, stale symbol coordinates, and granularity violations.

### Production runtime symbols

Shipped code that executes product behavior: handlers, services, commands, UI actions, adapters, event publishers/consumers, and other runtime code.

Required posture:

- Own at least one granular requirement via `implements`
- Use `covered_by` for tests that prove the owned production behavior
- Never use `executable_for`

### Executable test symbols

Test files, fixtures, harnesses, setup helpers, and reusable helpers that are executed as part of a `test` entity.

Required posture:

- Link the symbol to the test entity with `executable_for`
- Do not add `implements`
- Do not add `covered_by`

These symbols are test identity, not product ownership.

### Metadata / non-executable symbols

Symbols that primarily shape behavior without being the runtime seam themselves: schemas, registries, declarative maps, compile-time helpers, barrel metadata, and similar non-executable structure.

Required posture:

- Still give them direct requirement ownership with `implements` when they exist to satisfy a real behavior slice
- Reuse shared behavior-level evidence with `covered_by` when a production or integration test proves the requirement they shape
- Never relabel them as `executable_for` just to avoid ownership

Metadata / non-executable symbols may share the same behavior-level integration/e2e evidence as the runtime symbols they support.

## When integration/e2e evidence is required

Integration or end-to-end evidence is required when a symbol owns behavior whose correctness depends on a real boundary or externally observed flow, for example:

- crossing a process, network, filesystem, editor, CLI, or package boundary
- proving a user-visible or operator-visible workflow
- validating contract behavior between multiple components
- confirming wiring that unit tests cannot prove in isolation

Use one behavior-level test for all symbols participating in the same granular requirement when that test genuinely exercises the shared outcome.

## Explicit N/A rationale is allowed only when all of the following are true

- the symbol is metadata / non-executable, or it is helper code fully subsumed by another owned runtime symbol
- the symbol does not introduce its own unique external boundary, user journey, or integration seam
- a shared requirement-level test already proves the behavior that this symbol supports, or an additional integration/e2e test would be fake duplication
- the rationale names the shared evidence or explains why no honest integration/e2e seam exists
- the rationale is written down explicitly in docs/KB instead of being implied by omission

N/A is not allowed for production runtime symbols with their own external seam or user-visible workflow.

## Granular vs blanket requirements

### Granular requirement

A granular requirement names one coherent behavior slice with one observable outcome. A linked symbol should be able to answer: “what exact behavior do I own here?” without pointing to a whole subsystem.

Good signs:

- one actor, trigger, or system obligation
- one main observable outcome or failure mode
- can be specified by one scenario or a tight scenario cluster
- can be verified by a focused test or a clearly shared behavior-level test

### Blanket requirement

A blanket requirement describes a package, plugin, subsystem, or roadmap chunk instead of one behavior slice.

Blanket smells:

- the subject is an entire package or subsystem
- the sentence chains unrelated verbs with “and”
- different symbols would implement unrelated outcomes under the same requirement
- no single scenario/test could prove the whole statement honestly
- symbols need the requirement only because it is the nearest umbrella doc

## Anti-blanket requirement checklist

If any checkbox fails, split the requirement before adding more symbol links.

- [ ] Does the requirement describe one observable behavior instead of a subsystem umbrella?
- [ ] Can one primary scenario or one tight scenario family specify it honestly?
- [ ] Can every linked symbol explain the same outcome, not parallel unrelated outcomes?
- [ ] Would one focused test or one shared behavior-level test verify the claim without hand-waving?
- [ ] Does the wording avoid vague umbrella verbs like “handles”, “supports”, or “manages” unless the exact behavior is immediately enumerated?
- [ ] Would removing one linked symbol leave the requirement mostly intact? If yes, the requirement is probably too broad.
- [ ] Is any integration/e2e N/A decision justified by a real lack of seam instead of test-count convenience?

## Repo-specific examples

- Broad requirement smell: a single requirement that claims smart enforcement, posture detection, token budgeting, maintenance degradation, and completion reminders all at once is probably blanket and should be split.
- Granular baseline: a requirement such as “the VS Code tree opens the symbol’s real source file and line” is narrow enough for direct ownership, scenario coverage, and verification.
