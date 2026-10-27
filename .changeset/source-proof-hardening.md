---
"kibi-core": patch
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Source proofs no longer prove false claims about module paths, routes and file captures, and they read real projects' schemas, validators and middleware.

Fixed, where a false claim could be proved:

- Set fact members that contain a slash (`rxjs/operators`, `node:fs/promises`, `GET /api/users`, `finance/de`) were cut to their last path segment before Kibi compared them, so "the app must never import rxjs/operators" could prove while the app imported it. Members are now compared whole.
- The environment extractor now reads through `as`, `<T>` and `satisfies` casts, so `(import.meta as X).env.FOO` is read and an environment object (or `import.meta` itself) handed to a variable fails the read instead of hiding later reads.
- A glob that matches no file, and SQL migrations with no `CREATE TABLE`, now fail the read, so a mistyped pattern cannot decide a `subset_of` or `excludes` fact over an empty set.
- A `required_fields` or `nullable_fields` fact with `subset_of` or `excludes` is refused with a reason instead of being compared with whatever members the contract selected.

Readers:

- The SQL migration replay reads quoted and schema-qualified names (`"public"."messages"`), several actions per `ALTER TABLE`, `ADD PRIMARY KEY` and `DROP CONSTRAINT` of a foreign key, keeps `$$` function bodies whole, and skips actions that change no column, nullability or foreign key (row level security, triggers, ownership, defaults, column types). Supabase migration folders now read.
- The validator reader reads valibot objects, and any field that is a Standard Schema.
- `names_from` names middleware that a zero-argument factory export makes (`requireAuthentication()`) after the factory.
- The `thrown` extractor reads `throw createX()` as `createX`.
- A glob `capture` with `**` reads `finance/de` instead of `finance/de/`.
- A source read's dependencies follow tsconfig `extends` and workspace packages linked into `node_modules`, so a change in a sibling package stales the receipt.
- A claim a source proof derives is bound with the new scope `source`.

Modeling:

- "Every X must have Y" becomes a `required_fields` fact only when the sentence names a schema (a table, object, model and similar, or the words field, column or property), so "Every organization must have an owner" stays a behavioural claim.
- "A member can never become owner" models `member->owner` (the article was read as the state), and the machine may go unnamed.
- Scoped package names (`@supabase/supabase-js`), "must be exactly A and B" sets and "at least 30 routes under /api/orgs" counts are recognised.
- `kb_model` in requirement mode accepts the `includes`, `subset_of`, `excludes` and `matches` operators and a list `value` for set facts.

The kibi-usage skill (2.32.0) and the proof guide describe the reader details, the empty-read rule and the minimum kibi-cli for the certificate builders.
