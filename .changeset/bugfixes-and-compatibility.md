---
"kibi-core": patch
"kibi-cli": patch
"kibi-mcp": patch
---

Bug fixes and Node.js v24 compatibility.

- **Node 24**: Replace deprecated `import ... assert` with `import ... with` per TC39 Import Attributes proposal.
- **Core**: Use `member/2` instead of `memberchk/2` in `relationship_allowed`; make `status_meta_dict` resilient to non-standard KB paths.
- **CLI**: Fix staged traceability check to resolve symbol IDs from `symbols.yaml` using both `sourceFile` and legacy `source` fields.
- **MCP**: Replace `escapeQuotes` with `toPrologString` for safe Prolog string encoding.
- **Persistence**: Remove duplicate `ATOM_FIELDS`, add `value_int` integer guard, use `toPrologString` for safe escaping.
- **Check**: Replace fragile regex violation parsers with `parseViolationRows` from codec.
- **Tests**: Isolate workspace test from rogue `/tmp/.git`, add 30s timeout to `beforeAll` hooks to prevent flaky timeouts.
