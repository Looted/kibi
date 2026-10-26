---
"kibi-core": patch
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Fixes for the certificate proof kinds and for running Kibi from inside a repository:

- `kibi` run from a subdirectory of a Kibi workspace now uses the workspace's knowledge base (the nearest enclosing `.kb/manifest.json`), the way git finds its repository. Before, it compiled a second, empty branch store in the subdirectory, so queries returned nothing and `kibi prove` reported no proof integration. Relative `--input`, `--output`, `--certificates` and `--write-certificates` paths still resolve from where the command was typed. `kibi init` and an explicit `KIBI_WORKSPACE` keep the current directory.
- A receipt whose certificate re-checks but derives none of the claims it names now records `evidence_level: tested`, the level coverage reports, instead of `proved`. The same holds for the `kibi prove` result rows.
- Kibi compiles typecheck witnesses with the import resolution of the nearest `tsconfig.json` (`module`, `moduleResolution`, `paths` and similar), while the checking options stay fixed and strict. A project that resolves like a bundler no longer needs `.js` extensions in witness imports.
- TypeScript is loaded from the package nearest the witness first. TypeScript 7, which ships without the compiler API, is skipped for an older install further up, and named in the rejection when there is none ("add typescript@6 as a dev dependency"), instead of being reported as missing.
- A rejected `required_fields` claim names each field that breaks it ("deletedAt is optional or nullable", "x is not a field"), also when the test's own witness failed to compile.
- A rejected arithmetic certificate, including a `measure: count` claim, names a value that satisfies the assumptions and breaks the claim ("count = 5 satisfies them and breaks it").
- The typecheck exhaustiveness check reads the witness's syntax tree: a `never` type or a `satisfies` map counts, the word "never" in a comment does not. It now applies only to contracts without `proves`; with `proves`, Kibi checks each claim with its own witness.
- Set facts gain the `includes` operator for "every member of the set has the property" claims, which the semantic advisor now proposes. Two `includes` facts on the same property never contradict, and one contradicts an `eq` set only when it names a member the `eq` set leaves out. Before, "every role in owner and admin can invite" and "every role in owner, admin and member can invite" were refused as a value conflict. The KB consistency certificates model `includes` as containment.

The kibi-usage skill (2.29.1) describes the `includes` operator and the typecheck changes.
