# Reading a hook snippet

On hosts where Kibi hooks are installed, a short block
arrives before you read or edit a file whose symbols are linked to
requirements. It is projected from `.kb/symbols.yaml`, not from the store, so
it is a pointer to the knowledge, never proof. Each line answers one question:

- `Kibi knowledge for <path> (symbol manifest):` and the `- REQ-… — <symbol
  titles>` rows: the requirements the file's symbols implement, lead
  requirement first. Read the lead requirement with `kb_query({id})` before
  changing behavior; add `includeBody: true` to see its authored prose, and
  fix a stale sentence there with `kb_upsert` `document.body`.
- `REQ-… must keep true: <claim>` (edit only): what the lead requirement
  requires, as the claims its facts model (with the operator and members,
  such as "The greet function must not call console.log") or, without
  them, its own statement. An edit that breaks one of them is a requirement
  change: ask before changing the rule (see Decision firmness in
  `resources/recording.md`), and never
  code around the fact.
- `Decision: ADR-…` (edit only): the decision behind the lead requirement.
- `Covered by: TEST-…` and `Test code for: …`: the tests that prove the
  file's symbols; run or update them with the edit.
- `The edit is inside <symbol>, which implements REQ-…`: the symbol the edit
  lands in.
- `Next layer: …`: the exact `kb_query` and `kb_search(... sourceLocations)`
  calls that return the full detail.
- The `kb_check({sourceFiles:[…], includeImpactDiagnostics:true,
  includeWorkingTreeDiff:true})` line (edit only): run it after the edit. The
  Stop hook reminds you once per session of files edited without it.

A file already shown this session gets only the one-line `Kibi: this edit to
<path> is inside <symbol>` update; the facts and tests from its first snippet
still apply. `Kibi: no symbol in <path> is linked to a requirement yet` means
the file is unowned, not that no rule covers it. When the note names
requirements whose titles share the path's words, `kb_query` each one and
treat a match as the governing rule; otherwise find it with `kb_search` and
`sourceLocations`. Link the symbol that implements it (for markup, the
component that renders it) with `implements` through `kb_upsert`. Without a readable manifest (`Kibi: the hook could not read
.kb/symbols.yaml`) snippets are off for this session; `kb_query({sourceFile})`
still answers and `kibi sync` regenerates the manifest. The search tip and the
`.kb/` note appear once per session and need no action.
