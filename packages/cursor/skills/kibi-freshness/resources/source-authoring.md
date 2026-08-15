# Source authoring

Tracked documents and relationship shards are authoritative. Kibi may write
them transactionally but does not stage or commit them. Inspect `effects` and
typed `nextActions`; after `committed_with_repairs`, repair without retrying the
original mutation.

