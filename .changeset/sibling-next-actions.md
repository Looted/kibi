---
"kibi-cli": patch
"kibi-mcp": patch
---

The `nextActions` a value fact write lists for its sibling requirements now carry ready inputs. A `default` or `exploratory` sibling gets a `kb_upsert` input with its `type`, `id`, `title` and `status`; it used to hold only the id, which `kb_upsert` rejects. A `firm` sibling now gets a `kb_query` of the requirement instead of a `kb_upsert`, since the person decides on it before anything touches it.
