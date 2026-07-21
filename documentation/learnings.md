# Implementation Learnings

## Shared mutation parity

- Keep the whole entity-and-relationship assertion in one `rdf_transaction`; validating relationships independently is not sufficient to prevent partial graph state.
- Persistence belongs to the shared executor through `context.prolog.save()`, while runtime lifecycle hooks remain responsible for transport-specific post-success freshness work.
- Internal MCP controls can remain adapter-compatible without becoming CLI inputs when the exact top-level CLI schema rejects undeclared fields.
- Parity assertions must normalize transport-only branch paths and error envelopes, then compare both operation results and post-mutation graph state.
