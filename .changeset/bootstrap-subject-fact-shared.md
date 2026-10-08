---
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Bootstrap plans now write one subject fact per subject key. When claims from different sources (a handoff document and a ticket, say) name the same subject, every requirement links to that one fact instead of each getting its own copy, so `kb_check` no longer reports `subject-key-identity` right after an applied bootstrap and nobody has to merge the facts by hand. The plan lists each shared key in a `subject-key-shared:` diagnostic naming its sources.

Technical summary: after candidate selection `kb_plan_bootstrap` keeps the first selected subject fact for each `subject_key`, drops the later ones, retargets their requirements' `constrains` links (and the candidates' `relationships`) to the kept fact, and adds every source's `provenance:` tag and a `document.body` listing the sources to it. The transformation depends only on the candidate order, so `planHash` stays deterministic; action `dependsOn` follows the retargeted links. The kibi-bootstrap skill (3.8.0) and `docs/mcp-reference.md` describe the diagnostic.
