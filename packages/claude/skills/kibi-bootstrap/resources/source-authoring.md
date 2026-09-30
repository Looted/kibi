# Source authoring

Tracked documents, manifests, and relationship shards are authoritative.
Kibi may write them transactionally but does not stage or commit them. Use
`document.path` for ambiguous new targets, preserve existing bodies when the
body is omitted, and use hash-bound deletion plans. On
`committed_with_repairs`, follow typed `nextActions` and never retry the
original mutation.
