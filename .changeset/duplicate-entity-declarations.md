---
"kibi-cli": minor
"kibi-core": patch
---

`kibi check` now fails when your `.kb/` sources declare one entity id twice, for example two `.kb/symbols.yaml` records that a merge without the Kibi merge driver left behind. Until now a full check passed while `kibi check --staged` refused every commit over the copy, so CI never caught it. The finding names every copy and how to keep one. `kibi doctor` also stops telling you to add `.gitattributes` lines that are already there and names only the setup step that is missing.

- `source-relationship-parity` reports one blocking violation per entity id declared more than once across authored entity files and `.kb/symbols.yaml` (evidence `direction: duplicate_entity` with each declaration's source, title and status). A `kb_upsert` of the id merges copies that differ only in their links. The rule registry description says so.
- `mergeDriverSetup` takes the gaps `manifestMergeDriverGaps` found and names only the missing steps; `kibi doctor` and the `kibi migrate` tip pass them.
