---
id: FACT-EXAMPLE-PAIRED-MODEL
title: "Paired modeling example: bug fact + mitigation flag"
status: active
created_at: 2026-03-27T10:00:00Z
updated_at: 2026-03-27T10:00:00Z
source: documentation/facts/FACT-EXAMPLE-PAIRED-MODEL.md
tags:
  - example
  - modeling
  - bug
  - workaround
fact_kind: observation
links:
  - type: relates_to
    target: FLAG-BATCH-DISABLED
---

This example demonstrates paired modeling for a bug mitigated by a feature gate.

## Scenario

A memory leak was discovered in the batch processing module under high load.
While the root cause is being fixed, the feature must be disabled in production.

## Paired Model

### 1. Fact (the issue record)

This `fact` entity documents the known issue:

```yaml
id: FACT-BATCH-MEMORY-LEAK
title: "Memory leak in batch processor under high load"
fact_kind: observation
```

The `observation` fact_kind is appropriate because this is non-normative runtime
evidence. It does not participate in contradiction inference.

### 2. Flag (the runtime gate)

This `flag` entity controls the runtime behavior:

```yaml
id: FLAG-BATCH-DISABLED
title: "batch-processing-disabled: kill-switch for batch processor"
status: active
```

The flag acts as a runtime/config gate. When active, the batch processor is
skipped even if called.

### 3. Relationship

Link the fact and flag with `relates_to`:

```yaml
links:
  - type: relates_to
    target: FLAG-BATCH-DISABLED
```

## Why Two Records?

- The **fact** captures what is known about the issue (symptoms, conditions,
  workarounds) without affecting runtime behavior.
- The **flag** gates the actual runtime behavior without documenting the issue.

When the bug is fixed, you might:
1. Create a `test` that verifies the fix
2. Create a `req` that defines the corrected behavior
3. Deprecate the `flag` (set status to deprecated)
4. Keep the `fact` as historical context

## Canonical Rule

> Use `flag` for runtime/config gates only. Document bugs and workarounds as
> `fact` entities with `fact_kind: observation` or `meta`. Link them with
> `relates_to` when both concepts matter.
