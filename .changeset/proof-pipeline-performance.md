---
"kibi-cli": patch
"kibi-core": patch
---

Proof reporting does far less work, and large coverage reports can no longer overflow the engine. On this repository, evaluating requirement proof coverage against the live snapshot took about 132M Prolog inferences per run. It now takes about 43M on a cold engine and about 15M on a warm one. That's the evaluation behind `kibi coverage`, `kibi proof impact`, the proof baseline check, and the requirement health report. Whole-KB coverage reports are now read in small pages. The unpaged report was already 5.7 MB of the engine's 8 MiB output cap and grew with every requirement and proof run. Report contents are unchanged.

- kibi-core: `kb_entity/3` memoizes each entity's decoded property list per graph and `rdf_generation/1`. The memo is invalidated by any RDF change, including inside transactions and on rollback. Coverage previously re-materialized and re-decoded every property, receipt histories included, about 100k times per report.
- kibi-core: receipt-history parsing and receipt-shape validation are memoized by content (`variant_sha1/2`) and bounded to 4,096 entries. They previously re-parsed and re-validated every stored receipt on every evaluation.
- kibi-core: `kb_ensure_indexes` skips its full type-triple recount while its inputs (graph, RDF generation, legacy fact count, index entity count) are unchanged.
- kibi-core: `coverage_report_json` memoizes the sorted report for the exact arguments and store generation, so follow-up pages only paginate and encode.
- kibi-core: status resolves the attached workspace root once per KB path instead of once per entity source.
- kibi-cli: `executeCoverage` reads reports in pages of `COVERAGE_ROW_PAGE_SIZE` (10) rows via `readCoveragePages`.
