---
"kibi-cli": minor
"kibi-core": patch
"kibi-runtime": minor
"kibi-mcp": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Bootstrap no longer fills the knowledge base with content-free provider facts. A discovered provider entry whose source states no claim (a source module, a package manifest, a layout root, a test file with no recognized framework) is now a provenance stub: written as `fact_kind: meta` tagged `bootstrap:provenance-stub`, planned after every candidate with a claim, counted apart in the plan, ranked after everything else by `kb_search` (and dropped below its default threshold), never listed as a note in the search answer, and not counted as knowledge by `kb_find_gaps` or `kb_coverage`. On a test project, raising `maxCandidates` to 200 had added 150 such stubs, which then surfaced in search answers; the `over_limit` diagnostic now says how many suppressed candidates are stubs so an operator does not raise the limit for them.

Technical summary: `providerCandidate` classifies a provider candidate by `data.claim`; `test_topology` sets a claim when it recognizes a framework (and stays an observation), while `source_symbols`, `repo_metadata` and `repo_layout` never do (stubs, `provenanceStubBody`). `selectBootstrapCandidates` puts stubs in a last lane, marks `over_limit` rows with `provenanceStub` and counts them in the diagnostic; `presentBootstrap` adds `candidatesWithClaims`, `provenanceStubs` and `suppressedProvenanceStubs` to `discoverySummary` and reports the stub share in `tldr`. The shared `provenance-stub.ts` helper drives the intent-v1 and legacy rankings (`demoted: provenance stub`, sorted last, intent score times 0.25) and the answer layer; `discovery.pl` skips stubs in `find_gaps_json` unless the tag is requested and reports them as `summary.provenanceStubs` in type coverage. The kibi-bootstrap skill (3.9.0) tells agents not to raise the cap for stubs.
