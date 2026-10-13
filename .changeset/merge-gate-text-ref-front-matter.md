---
"kibi-cli": minor
"kibi-runtime": patch
"kibi-mcp": patch
---

Fixes from upgrading a test project to 2.22: the staged gate no longer charges a merge commit for files it takes unchanged from the merged branch, it blocks a requirement whose semantic inventory drifted from its prose, it lists every missing symbol, unclosed front matter fails `kibi check`, stale `text_ref` paths are found and migrated, `kibi doctor` and `kibi migrate` explain how to wire `kibi merge-driver`, and the `kibi migrate` preview separates migration steps from the quality backlog.

- `kibi check --staged` during a merge commit (`MERGE_HEAD` present) compares the staged tree with a base that takes every file the merge copies unchanged from a merged parent, so only what the merge itself resolved or edited is judged. The output says how many files were skipped this way. The staged snapshot exposes them as `mergeInherited`.
- `kibi check --staged` blocks a staged requirement that declares a semantic inventory contract (in the staged file or in `HEAD`) when the next `kibi sync` would reject it for proposition-complete ingestion, naming the contract errors and the `kibi migrate` repair.
- `symbols_manifest_stale` and `kibi_impact_evidence_missing` Detail lines name every symbol instead of six plus "… and N more".
- Front matter delimiters must be whole `---` lines. A `---` glued to the last value no longer closes the block (the file now fails with "Missing closing --- delimiter" instead of passing `kibi check`), and a `---` inside a value, such as a Markdown table separator in a quoted `semantic_text`, no longer cuts the block short.
- `source-path-dangling` also covers a `text_ref` shaped like one workspace file path that names no file. `kibi migrate` (`source_path_rewrite`, evidence `field: text_ref`) rewrites a pre-canonical knowledge path to its `.kb/` file; any other value, and a `text_ref` that is a requirement's semantic source, becomes a review for a person and is never removed.
- `kibi doctor` warns ("Manifest merge driver") when `.kb/symbols.yaml` is not routed to `merge=kibi` or `merge.kibi.driver` is unset, and a completed `kibi migrate` prints the same setup.
- The `kibi migrate` text preview shows migration actions apart from the quality backlog (`quality_*`, `coverage_*` and check review codes), counted per code; `--backlog` lists each one. `--format json` is unchanged.
