---
"kibi-mcp": patch
---

fix: prevent relationship loss on entity-only property updates in kibi-mcp

When `kb_upsert` omits the relationships field (entity-only property update), existing relationships were silently lost because the handler only processed the provided relationship array. Now the handler queries the live KB for existing relationships when the field is not provided and includes them in the transaction, preventing accidental relationship deletion on property-only updates.

Also fixes a syntax error in `fetchExistingRelationships` caused by incorrect indentation of the for loop body, which prevented compilation on Bun's indent-aware parser.
