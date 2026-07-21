---
"kibi-cli": patch
"kibi-mcp": patch
---

CLI and MCP checks now run the same validation executor, so both interfaces report the same violations for equivalent inputs. The CLI retains its staged workflow, fix suggestions, path overrides, dry-run behavior, and human-readable output while JSON input gains explicit parity coverage for impact diagnostics.

- Route non-staged CLI validation and MCP `kb_check` through the shared check executor.
- Preserve CLI advisory-quality and exit-code semantics in its adapter.
- Add executable CLI/MCP check parity and JSON impact-option coverage.
