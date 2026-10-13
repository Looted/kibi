---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-agent-core": minor
"kibi-runtime": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-opencode": patch
"kibi-zcode": patch
---

Rules a person wrote or imported are no longer treated as an agent's own default choice when they carry no `firmness`. A requirement or ADR without `firmness` now reads as `firm` unless an agent wrote it, so an agent asks before replacing it, and bootstrap records the rules it imports from your documents as firm with a reference to the passage. The usage skill now treats any request that conflicts with a recorded rule as a question: the agent names the rule and asks, whatever the rule's firmness, and changes it only when the person says so. Run `kibi migrate --yes` to move a KB to schema 10; existing supersedes are acknowledged and no source file is rewritten.

- `effectiveFirmness` takes the entity's origin: an absent value is `default` for `origin.kind: agent` and `firm` otherwise (human, import, migration or no origin). `kb_query` rows and `kb_search` answers show the derived value.
- Hook snippets label a current firm decision `[firm: ask before changing]` (was `[firm]`) and no longer label retired decisions. The Claude Code and ZCode session-start context adds one sentence: a request that conflicts with a recorded requirement or ADR is a question, so the agent names the rule and asks before changing the code or the rule.
- `decision-firm-superseded` applies to origin-derived firm targets; `decision-firm-unreferenced` still applies only to an explicit `firmness: firm`.
- KB schema 10: the `firmness-from-origin-v10` step and the automatic `firm_supersede_acknowledge` plan action record pre-existing supersedes of such decisions in `.kb/manifest.json` `firmSupersedeAcknowledged` (`FROM -> TO`); only listed edges are exempt, and never an explicitly firm target.
- Bootstrap intent-claim and normative-markdown requirement steps write `origin: {kind: import, ref}` and `firmness: firm`.
- Skills: `kibi-usage` 2.17.0 (conflicting request means ask; firmness from origin; write firmness explicitly), `kibi-bootstrap` 3.13.0 (imported rules are firm imports, including hand-authored follow-ups).
