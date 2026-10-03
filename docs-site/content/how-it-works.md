---
title: How Kibi works
description: The loop from human intent to proven implementation — compilation, deterministic checks, and fresh end-to-end evidence.
---

You do not operate this loop by hand. You prompt, and you approve the decisions that are actually about the product. The rest of this page is what happens after that.

Kibi combines two kinds of intelligence on purpose: probabilistic interpretation for understanding, deterministic verification for trust. A large language model is good at reading intent and navigating code; it is bad at remembering, and it will confidently invent things. Prolog is the opposite: it remembers nothing you did not encode, and it never pretends. Kibi wires them together so each covers the other's weakness.

## The loop

```text
Human prompt
    |
    v
Agent updates code and product knowledge
    |
    v
Requirements + semantic facts/rules + scenarios + tests + symbol links
    |
    v
Prolog coherence checks + traceability gates + fresh E2E evidence
    |
    v
Proven result, or explicit and repairable gaps
```

The agent never writes raw logic that gets trusted blindly. It works through typed entities and schemas, and Kibi validates those encodings before the Prolog layer reasons over them.

## What the model contains

The project model uses eight entity types — requirements, scenarios, tests, facts, architecture decisions, runtime flags, events, and code symbols — connected by typed relationships. The chain that matters most:

```text
Requirement -> Scenario -> Test
     ^                       ^
     |                       |
 Production symbol     Executable test symbol
```

Every production symbol traces to the requirement it implements. Every requirement is specified by scenarios, and those scenarios are verified by tests. The [entity schema reference](../reference/entity-schema.md) has the complete model.

## Why coverage is not proof

A coverage number can tell you a test executed a line. It cannot tell you *which product behavior* the test exercised, whether that behavior still matches the intent, or whether the evidence is fresh. Kibi records proof differently: a proof-bearing test declares what it verifies, and its evidence is bound to the current code snapshot. Change the code, and the stale evidence stops counting as proof.

That is why the health report distinguishes "proven" from "passing". Green is reserved for requirements whose evidence is current; everything else is shown honestly as waiting, stale, or broken.

## What the checks catch

Once a constraint is encoded — say, the product has exactly three user roles — it becomes part of the deterministic world. An agent cannot quietly invent a fourth role and treat it as established intent: the contradiction or missing authorization is surfaced mechanically. The same layer catches dangling references, incomplete semantics, unsupported invention, and requirements that constrain the same subject in incompatible ways.

Numeric constraints are compared exactly, so "greater than 0" conflicts with "equals 0", and integer values are compared as integers, so "greater than 0" also conflicts with "less than 1". When a requirement still has clauses that are not modeled, the check says the analysis is incomplete instead of reporting no conflict. Scenarios can state the outcome they expect and the facts they assume; one that expects success while assuming a value a current requirement forbids is reported and blocks proof, unless an exception requirement that a human approved (`approved_by`) covers it. A success scenario whose feasibility cannot be decided is flagged as unknown rather than passed.

Prolog verifies the knowledge that was encoded. It does not decide whether the original intent was correct — that stays with you. Ambiguity and ontology gaps stay explicitly visible rather than silently resolved.

## Knowledge that follows your branch

The model lives in your repository under `.kb/`, and each Git branch carries its own snapshot. Feature work gets its own isolated project state; switching branches switches context with it. Because the model is reviewed and committed like code, its history is your project's history.

## Go deeper

- [The proof ladder](proof-ladder.md) — the stages from stated intent to proven requirement.
- [Architecture](../reference/architecture.md) — storage, branch isolation, and data flow.
- [Inference rules](../reference/inference-rules.md) — the deterministic checks themselves.
