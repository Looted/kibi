---
"kibi-cli": patch
"kibi-runtime": patch
---

Symbols that `kb_upsert` adds to the `.kb/symbols.yaml` created by `kibi init` now survive the first compile of a new branch. Before, that file was untracked and had no pending-source receipt, so sync never read it: the branch that wrote the symbols kept them, but a new branch store compiled their `implements`/`covered_by` edges without the symbols, warned about dangling relationships and failed `kb_check` with `source-relationship-parity` violations. The symbols manifest is also written as block YAML instead of one `symbols: [ { … } ]` line.

Technical summary: `writeSourceForUpsert` now writes the pending-source receipt whenever Git does not track the target file (`git ls-files --error-unmatch`), not only for new or already-receipted files, mirroring relationship shards. Sync's dangling-relationship warning names each missing endpoint and, when the endpoint is declared in an untracked file with no receipt (markdown or symbol manifest), names the file and the `git add` / `kb_upsert` fix; `kb_check`'s `source-relationship-parity` findings carry the same cause in `suggestion` and `evidence.untrackedSources`. Appending to a flow-style `symbols` sequence converts it to block style.
