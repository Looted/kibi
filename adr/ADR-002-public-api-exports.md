---
id: ADR-002
title: Public API exports via re-export modules
status: approved
created_at: 2026-02-25T12:40:00Z
updated_at: 2026-02-25T12:40:00Z
source: packages/cli/src/public/
tags:
  - architecture
  - publishing
  - exports
---

## Context

MCP package imports from `@kibi/cli` using deep imports like `@kibi/cli/src/prolog.js`. This caused issues:
- Node.js ESM resolution failed with package exports
- JSON imports required `with { type: "json" }` assertion
- TypeScript couldn't resolve type declarations

## Decision

Create explicit public API re-export modules in `src/public/`:
- `src/public/prolog/index.ts` - re-exports PrologProcess
- `src/public/extractors/symbols-coordinator.ts` - re-exports symbols functions
- `src/public/schemas/entity.ts` - converts JSON schema to JS module
- `src/public/schemas/relationship.ts` - converts JSON schema to JS module

Update package.json exports to map these:
```json
{
  "./prolog": { "types": "...", "default": "..." },
  "./extractors/symbols-coordinator": { ... },
  "./schemas/entity": { ... }
}
```

## Rationale

- Avoids deep imports (`@kibi/cli/src/*`) which break with Node ESM
- JSON imported as JS module eliminates need for `with { type: "json" }`
- Explicit exports provide stable public API surface
- Follows Oracle guidance on package exports

## Status

**Accepted**: 2026-02-25
