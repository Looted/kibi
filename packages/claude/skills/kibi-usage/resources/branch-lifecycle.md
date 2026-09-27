# Branch lifecycle

Kibi attaches to the exact Git ref: `KIBI_BRANCH` when set, otherwise Git's
symbolic HEAD. Names are not normalized, and `main`, `master`, detached HEAD,
slash names, `@`, and Unicode refs remain distinct identities.

Compiled state lives under `.kb/branches/<sha256-hash>/branch.json`. The
manifest records the exact ref and hash; a mismatch is a hard attachment
failure. A missing store is compiled by `kibi sync` from the current checkout's
tracked sources. `branch ensure` may create only the empty identity fence; use
`kibi sync` before relying on compiled state. Kibi never copies another
branch's store and never chooses merge winners. Git owns merges; unresolved
conflicts in authored files block compilation.

Legacy literal-path stores are read-only compatibility attachments. Preview an
explicit migration with both identities, then apply it only with the exact
preview hash (`kibi branch migrate --from <old> --to <new> --apply
--approval-hash <preview-hash>`) while attached to the exact new ref. The
approval is mandatory and binds the source bytes and identities; do not infer a
rename from commits. For a legacy literal store on the current branch, `<old>`
and `<new>` must be the same exact identity. Every cross-identity pair is
refused, including `main` to `master`; migration changes only the storage
format from literal to hashed for the active exact branch. Deleted local branches may be quarantined for the
configured retention period; `branch restore --branch <exact-ref> --apply` is
reversible during retention and purge is explicit. Remote-only refs do not keep
a local compiled store alive.

If migration is interrupted, use the journal's exact recovery action:
`kibi branch migrate --recover-journal <id>` previews the deterministic
roll-forward or verified-backup restore, and `--apply` performs it. Do not
resolve the live branch attachment while the migration journal is ambiguous.
