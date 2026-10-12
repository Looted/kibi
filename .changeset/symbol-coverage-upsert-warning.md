---
"kibi-cli": patch
"kibi-runtime": patch
---

`kb_upsert` now tells an agent up front when a production symbol will fail `symbol-coverage`. A symbol upserted with `implements` but neither `covered_by` nor `executable_for` used to come back `valid: true` with no warnings, and the agent only learned from the next `kb_check` that the symbol lacks requirement coverage. The dry run and the write now return a non-blocking warning naming the missing `covered_by` edge, so the agent can add it in the same step; a symbol that already has a stored `covered_by` edge is not warned about.

Technical summary: `symbolCoverageWarnings` in `operations/mutation/warnings.ts` warns for `type: symbol` payloads whose own relationships include `implements` and neither `covered_by` nor `executable_for`, unless `once((kb_relationship(covered_by, Id, _) ; kb_relationship(executable_for, Id, _)))` succeeds. It runs after the commit in `executeUpsert` (next to `scenarioCoverageWarnings`) and in `executeValidateUpsert` on the validated relationships, so `dryRun: true` and `kibi validate-upsert` return it too. No Prolog rule changes.
