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

That binding uses repository-relative paths and file contents only, so a CI runner and your own checkout of the same commit agree on what is fresh. Each test is judged by its own evidence: when the proof command reports results per test, one failing step fails only the tests that own it, and the run summary names the step. Receipt history keeps only the receipts that can still decide proof, so it does not grow with every run. The agent does not hand-write how proof runs either: `kibi proof inspect --json` proposes an integration for your test runner (or the command you pass with `--command`) and returns a plan you approve, and applying it writes `.kb/proof/integrations.json` for `kibi prove` to run. A plan that can no longer apply, because the file already exists or the runner configuration changed since planning, is refused as an error and changes nothing. A command integration is judged as one run, so a suite with an unrelated failing test proves nothing: narrow the command to the proof-bearing tests, or have it report results per test.

That is why the health report distinguishes "proven" from "passing". Green is reserved for requirements whose evidence is current; everything else is shown honestly as waiting, stale, or broken.

## What the checks catch

Once a constraint is encoded — say, the product has exactly three user roles — it becomes part of the deterministic world. An agent cannot quietly invent a fourth role and treat it as established intent: the contradiction or missing authorization is surfaced mechanically. The same layer catches dangling references, incomplete semantics, unsupported invention, and requirements that constrain the same subject in incompatible ways.

Numeric constraints are compared exactly, so "greater than 0" conflicts with "equals 0", and integer values are compared as integers, so "greater than 0" also conflicts with "less than 1". When a requirement still has clauses that are not modeled, the check says the analysis is incomplete instead of reporting no conflict, and when such a requirement is linked to one that is modeled with strict facts, `kibi check` blocks it until the clauses are modeled against the same subject or the older requirement is superseded. Two opposing rules Kibi cannot decide stay unresolved, and when the only missing piece is a `key_arguments` declaration on a predicate, an advisory check names that predicate. A predicate the agent models for a requirement takes the subject key the requirement already constrains, in the argument its schema names `subject` or, for a schema without one such as a permission rule, as the predicate fact's own subject key, so the predicate and the requirement's other facts are checked as one subject; a predicate about another subject is not offered as the requirement's grounding. Scenarios can state the outcome they expect and the facts they assume; one that expects success while assuming values a current requirement forbids, alone or only in combination, is reported and blocks proof, unless an exception requirement that a human approved (`approved_by`) covers it. An exception can be limited to single clauses (`exempts_claims`), so waiving one clause does not waive the others. Conditional requirements are checked the same way: "checkout may happen only when the cart total is positive" (or "must not happen unless") compiles to a typed rule, and a checkout scenario that assumes a zero total is infeasible. A requirement scoped to the EU does not govern a US scenario, and one whose facts carry a validity window only governs scenarios inside it. A success scenario whose feasibility cannot be decided, such as one that assumes a "basket amount" where the rule reads the "cart total", is flagged as unknown rather than passed. A conditional the compiler cannot translate stays an open ontology gap; it is not stored as a note that looks modeled.

Entity bodies keep the reasons that front matter cannot hold. A requirement body carries its statement, a `## Context` section (why, who asked, constraints) and a `## Source` section with the verbatim excerpt; scenarios, tests and observations carry prose that says what they cover and how they were confirmed. Context sections never change a requirement's checked meaning, because `semantic_text` is written explicitly. `kibi check` blocks an entity whose body has no real context, and Kibi never invents one: when the reason was not given the body says so. Entities from before this rule are tagged `review:context-missing` by the schema 8 migration and counted in an advisory diagnostic instead of blocking; the migration records them, and the tag does nothing on any other entity, so the way past the check is real context.

Every entity can also say who wrote it (`origin`: a human, an agent, a migration or an import) and who approved it. Kibi cannot check that a person really approved something, so it does not try. Advisory checks list exceptions that nobody approved, exception approvals only an agent recorded, and agent-written requirements no one has reviewed.

Prolog verifies the knowledge that was encoded. It does not decide whether the original intent was correct — that stays with you. Ambiguity and ontology gaps stay explicitly visible rather than silently resolved.

## Knowledge that follows your branch

The model lives in your repository under `.kb/`, and each Git branch carries its own snapshot. Feature work gets its own isolated project state; switching branches switches context with it. Kibi compiles each branch's snapshot from that branch's own files and never copies another branch's; a branch created without Kibi's Git hooks starts uncompiled, and `kibi status`, `kibi check` and `kibi doctor` say so once and point at `kibi sync`. Because the model is reviewed and committed like code, its history is your project's history.

## Go deeper

- [The proof ladder](proof-ladder.md) — the stages from stated intent to proven requirement.
- [Architecture](../reference/architecture.md) — storage, branch isolation, and data flow.
- [Inference rules](../reference/inference-rules.md) — the deterministic checks themselves.
