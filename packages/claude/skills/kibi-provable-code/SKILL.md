---
name: kibi-provable-code
description: "Use when writing, designing or refactoring code that implements a Kibi requirement (policies, limits, allow-lists, roles, state machines, routes, env and config reads, validators, error types), when a source proof or a value/domain read is refused because Kibi cannot read a name statically (a computed key, a dynamic import or require, eval, reflection, globals()[name], getattr with a computed name, $$var, a macro), or when deciding how to treat generated or vendored code. Covers design practices that make code easier to review, test and replace and that also let Kibi prove claims exactly, the line between a good refactor and a contortion for the tool, the accepted dynamic exceptions (plugins, serialization, registries), and generated code as a boundary."
license: AGPL-3.0-or-later
metadata:
  displayName: kibi-provable-code
  id: kibi-provable-code
  version: 1.0.0
  kibiCompatibility: ">=1.0.0"
  tags:
    - kibi
    - proof
    - code-quality
    - design
    - agent-guidance
  resources:
    - resources/provable-patterns.md
---
## Goal

Write code a reviewer can check by reading it. Code that states its decisions
once, names what it depends on, and keeps decisions apart from effects is
easier to review, test, change and replace. The same properties let Kibi read
the code exactly and prove claims about it. Provability is a side effect of
good design here, never a reason to make the design worse.

This skill is about the code. How to write the proof itself (proof kinds,
`value_source`, `domains`, the `source` readers) is in
`kibi-usage/resources/proof.md`; links between requirements, symbols and tests
are in `kibi-traceability`.

## Interface Selection

Use the visible approved MCP tools or the trusted project-local CLI as equal
peer interfaces (CLI JSON: `printf '%s\n' '{"query":"..."}' | npx --no-install
kibi search --input -`). Exact routes are in
`kibi-usage/resources/operation-access.md`. If neither is available, write the
code by the practices below and say that Kibi could not be consulted. Never
read or edit `.kb/` files directly.

## Before you design

1. `kb_search` the area (or its `sourceLocations`) and `kb_query({id})` the
   requirements the code implements, with `includeBody: true` when you need
   their prose. A claim names the decision the code has to state: a limit, a
   set of allowed values, a transition, a forbidden dependency.
2. Shape the code so that decision sits in one readable place (see
   Practices). The requirement tells you what to make explicit; it never
   tells you to bend the design.
3. After the change, `kb_check` and `kb_status` show whether links and
   proof receipts went stale. Re-prove what the change touched.

## The test for every change

Before changing code so that Kibi can read it, ask: would a reviewer who has
never heard of Kibi accept this change on its own merits? Keep the change
only if the answer is yes, because it removes duplication, names a hidden
dependency, narrows a module, or makes a decision testable.

Never do any of these to satisfy Kibi:

- Duplicate a value into a second constant, or add an export that only the
  proof reads, when the code already has one source of truth. A count claim
  reads the size of the list; a dotted export (`POLICY.limit`) reads a field.
- Unroll a loop, inline a lookup table, or replace a clear generic mechanism
  with copy-pasted branches so that a reader sees literal names.
- Split a cohesive function or module only to shrink a proof's file list.
- Drop a file from a proof's `files`, rename it, or mark hand-written code as
  generated, so that a refused read goes away.
- Weaken types, add casts or silence a linter so that a construct parses as
  a literal.

When good design and a readable proof disagree, keep the good design and
change the evidence instead: model a claim the code can show, or keep the
requirement at `tested` with ordinary tests. `tested` is a sound evidence
level. `proved` is worth reaching only where the code is already shaped well.

## Practices

Each practice below is a general one. Kibi's benefit is listed second.

1. **State each decision once, as data.** Limits, allow-lists, role-to-
   permission tables, supported formats, transition tables and feature lists
   belong in one named constant that the behaviour reads, not in conditions
   repeated across files. One place to change, one place to review.
   Kibi reads the constant directly (`value_source`, `exhaustive`,
   `state_machine`, `regex`, a `domains` export).
2. **Name dependencies where they are used.** Import modules by literal
   specifiers, read environment variables and configuration keys by literal
   names, and call functions by name. A reader, an IDE and a bundler can then
   find every use. Kibi's `references` reader lists them exactly
   (`imports`, `env`, `calls`, `string_args`, `property`).
3. **Read configuration at one boundary.** Read the environment and config
   files in one module that turns them into a typed object, and pass that
   object on. The rest of the code is then testable without a real
   environment, and the full list of settings sits in one file. Kibi proves
   "the service reads only these variables" over that one file.
4. **Keep decisions pure and effects at the edge.** A function that decides
   (`canInvite(role, target)`, `nextState(state, event)`, `priceFor(plan)`)
   takes its inputs as arguments and returns a value; the code around it does
   the I/O. Pure deciders are unit-testable over every input. Kibi's `rule`
   and `state_machine` kinds call them on every combination of a finite
   domain and prove the claim for all of them.
5. **Make states and their transitions explicit.** Prefer one status field
   with a transition table (or a `next(state, event)` function) over several
   booleans that together imply a state. Impossible combinations disappear,
   and Kibi can prove reachability and "can never become" claims.
6. **Name failures.** Throw or return named error types (`ForbiddenError`,
   `ErrQuotaExceeded`) instead of bare strings or a generic error with a
   computed message. Callers can handle them precisely, and Kibi's `thrown`
   read lists them.
7. **Declare routes, middleware and schemas in one place.** Register routes in
   a router module, declare middleware on the route or the mount, and derive
   types from one schema or validator instead of keeping parallel
   definitions. Kibi's `routes`, `schema` and `validator` readers read them.
8. **Keep modules small and single-purpose.** A module with one reason to
   change is easier to replace. A proof over it covers fewer files, so its
   receipt stales only when that concern changes.

`resources/provable-patterns.md` has before-and-after examples per language.

## Dynamic code

Runtime lookups and code built from text hide what a program does from
every static reader, people included: `eval`, `new Function`, `exec`,
`globals()[name]`, `getattr(obj, name)` with a computed name, PHP `$$var` and
`$obj->$method()`, a dynamic `import()` or `require(path)` with a computed
path, reflection (`Class.forName`, `Method.invoke`, `reflect.Value.Call`,
`Type.GetMethod`), C# `dynamic`, `process.env[key]` with a computed key, and
`#if`/`#[cfg]` around the code a claim is about. Kibi refuses a read that
meets one of these and names the line.

Replace a dynamic lookup when an explicit form is clearer, which is the usual
case: a computed `getattr` dispatch becomes a dict from name to function, a
computed env key becomes a named setting in the config module, `$$var`
becomes an array, a computed `require` becomes a static map of loaders.

Keep the dynamic form where it is the design:

- **Plugins and extension points**, where the set of implementations is open
  by design.
- **Serialization and ORMs**, which map names to fields by reflection.
- **Registries and dependency injection**, which wire implementations by key.
- **Generated code** (next section).

For these, keep the dynamic part small and in one place: one loader or
registry module, with the code around it written statically. List the known
entries in a literal table where one exists (a registry of built-in handlers),
so the rest stays readable. Then model claims that do not depend on the open
part, or keep them at `tested`. Never write a proof that pretends an open set
is closed.

## Generated code

Treat generated code as a boundary: it is the generator's output, not code the
project writes, so it does not have to follow these practices and is not
refactored to make Kibi read it.

1. **Do not hand-edit it.** Change the input (schema, grammar, OpenAPI or
   protobuf spec, template) and regenerate. A hand edit is lost on the next
   run and hides the real source of the behaviour.
2. **Mark it.** Keep the generator's header (`// Code generated ... DO NOT
   EDIT.`, `@generated`, `auto-generated`) and list generated paths as
   `linguist-generated` (vendored code as `linguist-vendored`) in
   `.gitattributes`. `kibi doctor` and `kibi init` then leave those files out
   of language pack suggestions unless the KB names them.
3. **Put requirements on the input.** A claim about what the generated code
   exposes is a claim about the generator input: prove it over the schema,
   spec or grammar with the `json`/`yaml`/`openapi`/`schema`/`validator`
   readers, or over the generator's configuration.
4. **Keep the hand-written wrapper thin and readable.** The adapter that
   calls generated code is ordinary code and follows the practices above;
   link it with `implements` and prove claims over it.
5. **Use tests where the output itself matters.** When a requirement depends
   on what the generator produced (a parser accepts this input, a client
   sends this header), cover it with a test or a snapshot, and check in CI
   that regenerating gives the committed files. That evidence is `tested`.
   Prefer the input over the generated files for a source proof: generated
   code often uses constructs the readers refuse, and a proof over generated
   text stales on every regeneration and follows the generator's version
   rather than the requirement.
6. **Do not link generated symbols as the implementation** of a requirement
   when a hand-written wrapper or the generator input says the same thing.

## When a read is refused

1. Read the refusal: it names the file, the line and the construct.
2. If the construct is incidental (a computed key that is really one of three
   literal names), rewrite it the explicit way, run the tests, and retry.
3. If it is one of the accepted exceptions, leave it. Narrow the claim to the
   files that are static, or model a claim the code can show, and keep the
   rest at `tested`. Keep every file the claim is about in `files`.
4. If the file is generated, move the claim to the generator input.
5. Report what you changed and why it improves the code, and which claims
   stayed `tested` and why.

## Typed results

Parse `kibiProtocol`, `status`, diagnostics and typed `nextActions` on every
Kibi result. A refused proof read names the file, line and construct; it is
never an empty member list, so never read it as "nothing found". On
`committed_with_repairs` a write stands: run the repair actions and never
resend the original. Kibi authors tracked files but never Git-stages or
commits them.
