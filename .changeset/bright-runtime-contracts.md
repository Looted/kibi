---
"kibi-runtime": minor
"kibi-cli": minor
"kibi-mcp": minor
"kibi-opencode": minor
"kibi-codex": patch
"kibi-cursor": patch
---

Kibi now has a source-first, exact-Git runtime contract for first-party
adapters. CLI JSON and MCP structured results share a versioned envelope with
effect and repair information, while branch stores are hashed and explicitly
identity-bound. The mutation path can author tracked source documents and
canonical relationship shards without staging or committing them.

- Add the `kibi-runtime` first-party integration package.
- Add exact branch-store manifests, explicit legacy migration/quarantine, and
  typed result/effect contracts.
- Add source-first document writes, relationship-shard updates, and deletion
  approval plans.
