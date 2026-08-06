# Kibi Operation Access Catalog

This table is the machine-readable interface map for Kibi's shared operation catalog. Every CLI route shown is dedicated; there is no generic operation runner. `--input JSON or flags` means the route supports exact MCP-shaped JSON from a file or stdin as well as its established human flags. `--input JSON` means the dedicated parity route is JSON-only.

| MCP tool name | CLI route | Input mode | Mutability | Requires Prolog | Effects | Capability preference |
|---|---|---|---|---|---|---|
| `kb_skills_list` | `skills-list` | `--input JSON` | read | no | `local-read` | MCP-first; CLI-fallback |
| `kb_skills_load` | `skills-load` | `--input JSON` | read | no | `local-read` | MCP-first; CLI-fallback |
| `kb_skills_read` | `skills-read` | `--input JSON` | read | no | `local-read` | MCP-first; CLI-fallback |
| `kb_query` | `query` | `--input JSON or flags` | read | yes | `kb-read` | MCP-first; CLI-fallback |
| `kb_search` | `search` | `--input JSON or flags` | read | yes | `kb-read` | MCP-first; CLI-fallback |
| `kb_status` | `status` | `--input JSON or flags` | read | yes | `kb-read, workspace-read` | MCP-first; CLI-fallback |
| `kb_find_gaps` | `find-gaps` | `--input JSON or flags` | read | yes | `kb-read` | MCP-first; CLI-fallback |
| `kb_coverage` | `coverage` | `--input JSON or flags` | read | yes | `kb-read` | MCP-first; CLI-fallback |
| `kb_graph` | `graph` | `--input JSON or flags` | read | yes | `kb-read` | MCP-first; CLI-fallback |
| `kb_semantic_advisor` | `semantic-advisor` | `--input JSON` | read | no | `local-read` | MCP-first; CLI-fallback |
| `kb_model_requirement` | `model-requirement` | `--input JSON` | read | yes | `kb-read` | MCP-first; CLI-fallback |
| `kb_suggest_predicates` | `suggest-predicates` | `--input JSON` | read | yes | `kb-read` | MCP-first; CLI-fallback |
| `kb_autopilot_generate` | `autopilot-generate` | `--input JSON` | read | no | `workspace-read` | MCP-first; CLI-fallback |
| `kb_validate_upsert` | `validate-upsert` | `--input JSON` | read | yes | `kb-read` | MCP-first; CLI-fallback |
| `kb_upsert` | `upsert` | `--input JSON` | write | yes | `kb-write, workspace-write` | MCP-first; CLI-fallback |
| `kb_delete` | `delete` | `--input JSON` | write | yes | `kb-write, workspace-write` | MCP-first; CLI-fallback |
| `kb_check` | `check` | `--input JSON or flags` | read | yes | `kb-read, workspace-read` | MCP-first; CLI-fallback |
| `kb_sparql_remote` | `sparql-remote` | `--input JSON` | read | no | `network-read` | MCP-first; CLI-fallback |

## JSON execution recipes

Use the project-local, non-installing runner from a trusted workspace. Stdin must contain exactly one UTF-8 JSON object.

```bash
echo '{"query":"authentication","type":"req","limit":10}' | npx --no-install kibi search --input -
```

```bash
echo '{"type":"req","id":"REQ-001","properties":{"title":"Test","status":"open"}}' | npx --no-install kibi upsert --input -
```

```bash
echo '{"rules":["required-fields","no-dangling-refs"]}' | bunx --no-install kibi check --input -
```

## Telemetry handling

`_diagnostic_telemetry` is adapter metadata, not business input. In CLI JSON mode the adapter may validate and extract it for CLI usage logging before shared execution. In MCP diagnostic mode the adapter enforces its configured telemetry requirement and strips the field before shared execution. Never copy telemetry into entity properties or operation business input.
