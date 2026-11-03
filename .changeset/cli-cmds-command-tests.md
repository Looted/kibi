---
"kibi-cli": patch
---

Simplify the argument handling of several read-only commands (`kibi query`, `kibi gaps`, `kibi graph`, `kibi coverage --cases`) without changing their output.

Drop redundant guards in the sync extraction step, the printed migration plan record and the ontology-quality threshold reader; behaviour is unchanged.

Remove an unused attach flag and an unreachable process factory from the shared discovery engine helper.

Simplify the manifest merge driver's record bookkeeping and the untracked-document lookup used by `kibi sync` warnings; behaviour is unchanged.

`kibi gc` and the engine maintenance commands drop redundant guards (unused legacy flags, default stdio options, duplicate workspace resolution); behaviour is unchanged.
