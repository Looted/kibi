---
"kibi-core": minor
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Formal proofs now reach the claims real services make about their routes, database schemas, configuration and code. A new `source` certificate proof kind lets Kibi read a project source itself and check a set fact against what it read, so the test only has to run:

- `json` and `yaml` read keys, values or items at a path; `glob` reads matching files (or what each `*` matched); `openapi` reads operations, unsecured operations, security schemes or responses.
- `references` reads environment variables, imports, calls, string arguments, thrown errors or property accesses from TypeScript, JavaScript and Python files. A member Kibi cannot read statically, such as a computed environment variable name, fails the read with its location instead of leaving it out.
- `schema` reads tables, columns, required or nullable columns and foreign keys from Drizzle, Prisma or SQL migrations.
- `routes` reads a Hono or Express app's routes and the middleware each route runs, including mounted routers.
- `validator` reads a zod or pydantic schema's fields, required fields or optional fields.

A receipt for a source proof goes stale when any file the read touched changes.

Set facts gain the `subset_of` ("must be one of") and `excludes` ("must never use") operators alongside `eq` and `includes`. Field claims (`required_fields`, `nullable_fields`) accept `table.field` members, and a `middleware` fact with `includes` requires every matching route to run the listed middleware.

State machine proofs decide temporal claims: a `reachable_pairs` fact with `excludes` ("a cancelled invoice can never become paid") and a `required_waypoints` fact ("every path from draft to paid must pass through approved"). Every machine projection accepts the four set operators.

A `rule` contract can take a domain from a project source, and a predicate with `harness_for: [SYM-...]` proves its claim at the new `harness` scope when the predicate is a test harness that drives real code. `value_source` accepts `{source, measure: count}`.

The semantic advisor and `kibi model` turn these sentence shapes into the matching facts. `kibi-cli/proof-certificates` adds `sourceCertificate` and `readProjectSource`.

The kibi-usage skill (2.30.0) explains the new kind and operators.
