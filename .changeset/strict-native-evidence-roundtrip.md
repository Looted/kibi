---
"kibi-cli": patch
---

CLI proof ingestion now handles common JUnit and TAP reports more reliably,
including nested cases, retries, plans, bailouts, and malformed input. Querying
an entity and using the returned fields in a later update now preserves quoted,
newline, and backslash content exactly, so semantic evidence remains bound to
the authored source. Proof maintenance commands also exercise real source and
graph persistence across interruption and reload boundaries.
Repeated identical requirement sentences now share one logical proposition while
the authored source text and source hash remain unchanged, so advisor output can
cross the upsert boundary without manufacturing duplicate claim identities.
Relationship deletes now update authored Markdown relationship declarations even
when a live compiled edge and relationship shard exist, preventing the next sync
from resurrecting an explicitly deleted edge. Source symbol analysis also
recognizes members of exported class expressions such as `FileBridge`.

- Use maintained SAX XML parsing with strict failure diagnostics for malformed,
  conflicting, or ambiguous native reports.
- Validate TAP subtest plans and hierarchy identities before producing evidence.
- Decode typed Prolog string literals before returning entities from discovery.
- Canonicalize repeated semantic advisor claims to the first source occurrence
  before building the unique logic-claim manifest.
- Add end-to-end maintenance and interruption coverage for persisted proof data.
- Patch authored Markdown relationship declarations before compiled retraction
  and fail closed when that source cannot be read.
- Resolve coordinates for exported class-expression methods, properties, and
  accessors without losing qualified symbol identity.
- Compare mixed granular/coarse symbol manifests by exempting only exact
  declarations with canonical coarse reasons, while continuing to block stale
  granular coordinates, unknown reasons, and newly extracted exports.
- Validate existing bindings against staged source bytes, including body-only
  changes, and scope HEAD caching to each assessment. Accept identical validated
  declaration spans from multiple logical owners without hiding stale duplicates.
