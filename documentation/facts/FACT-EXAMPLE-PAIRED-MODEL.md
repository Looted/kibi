---
id: FACT-EXAMPLE-PAIRED-MODEL
title: "Paired modeling example: strict domain fact + requirement constraint"
status: active
created_at: 2026-03-27T10:00:00Z
updated_at: 2026-04-21T10:00:00Z
source: documentation/facts/FACT-EXAMPLE-PAIRED-MODEL.md
tags:
  - example
  - modeling
  - strict-lane
fact_kind: subject
links:
  - type: relates_to
    target: REQ-018
---

This example demonstrates the primary use of `fact` entities: strict domain facts
that enable contradiction detection across requirements. The strict lane (`subject`
and `property_value` fact kinds) is the canonical use case for `fact` entities.

## Primary Use: Strict Domain Facts

Strict domain facts model normative invariants that multiple requirements can share.
When two requirements constrain the same fact with incompatible values, Kibi's
`domain-contradictions` rule surfaces the conflict automatically.

### 1. Subject Fact

A `subject` fact names the domain concept:

```yaml
id: FACT-USER-ROLE
title: "user-role: domain subject for user role constraints"
fact_kind: subject
status: active
```

### 2. Property-Value Fact

A `property_value` fact captures the normative value:

```yaml
id: FACT-LIMIT-2
title: "max-active-sessions: 2"
fact_kind: property_value
status: active
```

### 3. Requirement Constraining the Fact

A requirement links to both facts via typed relationships:

```yaml
id: REQ-018
title: "Users may have at most 2 active sessions"
links:
  - type: constrains
    target: FACT-USER-ROLE
  - type: requires_property
    target: FACT-LIMIT-2
```

When a second requirement tries to constrain `FACT-USER-ROLE` with a different
property value, `domain-contradictions` will flag the conflict.

## Secondary Use: Observation/Meta Lane

The `observation` and `meta` fact kinds are a secondary lane for non-normative
context: bug records, incident notes, and workarounds. These facts do **not**
participate in contradiction inference.

```yaml
id: FACT-BATCH-MEMORY-LEAK
title: "Memory leak in batch processor under high load"
fact_kind: observation
status: active
links:
  - type: relates_to
    target: FLAG-BATCH-DISABLED
```

When a bug is mitigated by a runtime gate, create both a `fact` (the issue record)
and a `flag` (the gate), linked with `relates_to`.

## Canonical Rule

> Use `fact_kind: subject` and `fact_kind: property_value` for normative domain
> invariants that requirements should constrain. Use `fact_kind: observation` or
> `meta` for bugs, workarounds, and historical context. Only strict-lane facts
> participate in contradiction detection.
