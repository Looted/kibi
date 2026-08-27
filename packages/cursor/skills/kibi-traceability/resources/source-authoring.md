# Source authoring

Use `document.path`/`document.body` for source-first writes. Preserve existing
body bytes when body is omitted, patch relationship shards without dropping
unrelated records, and follow typed repair actions after partial completion.

