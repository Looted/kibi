---
"kibi-cli": minor
"kibi-core": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-agent-core": minor
"kibi-codex": minor
"kibi-opencode": minor
"kibi-cursor": minor
"kibi-claude": minor
"kibi-zcode": minor
---

Requirements and ADRs can now say how firmly they were decided, so a later agent knows whether it may change a decision on evidence or must ask a human first. Mark a rule a person stated `firmness: firm` (it must cite their words in `origin.ref`, or `approval_ref` on a requirement), a guess `firmness: exploratory`, and leave the rest unset (`default`). `kibi check` now blocks a firm decision without that reference (Kibi checks that it is present, not that it is genuine), a decision that is not firm superseding a firm one, and a current requirement or ADR that supersedes another without a `## Why this changed` section naming the evidence. `kb_search` and `kb_query` show the firmness of each decision; the editor hooks label firm and exploratory ones.

Migration: this is a hard rollout with KB schema 9. Run `kibi migrate --yes` once; it records every supersede edge that predates the rule in the manifest (`supersedesReasonAcknowledged`, as `FROM -> TO`), so those do not block, and an advisory `supersedes-reason-acknowledged` diagnostic counts them. No source file is rewritten and no reason is invented. New supersedes must explain themselves, including a new one on an acknowledged decision.

Technical summary: new optional `firmness` property (`firm` | `default` | `exploratory`) on `req` and `adr` in the JSON schema, the `kb_upsert` input schema, the markdown extractor and the Prolog entity schema; the schema rejects it on other types. `kb_upsert` judges firmness as it will be written: an update that omits `firmness` keeps the stored value (also in the compiled store), and a write that leaves a decision firm without a reference is rejected. `decision-firm-superseded` checks every superseder, retired ones included, so a chain cannot launder a firm decision; shard edges from deleted entities are ignored. New rules `decision-firm-unreferenced`, `decision-firm-superseded` and `supersedes-reason-missing` (canonical, blocking) and `supersedes-reason-acknowledged` (info) read authored requirements, ADRs, front-matter `supersedes` links and relationship shards, so they agree before a sync. `LATEST_KB_SCHEMA_VERSION` is 9; the `decision-firmness-v9` migration step and the `supersedes-reason-acknowledge` fragment action write only `.kb/manifest.json`. Search answer rows and `kb_query` results carry the effective firmness of requirements and ADRs; hook snippets append `[firm]` or `[exploratory]`. The `kibi-usage` skill gains a "Decision firmness" section.
