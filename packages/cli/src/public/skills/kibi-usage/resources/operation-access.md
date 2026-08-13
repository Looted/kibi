# Kibi Operation Access Catalog

This table is the machine-readable interface map for Kibi's shared operation catalog. Every CLI route shown is dedicated; there is no generic operation runner. `--input JSON or flags` means the route supports exact MCP-shaped JSON from a file or stdin as well as its established human flags. `--input JSON` means the dedicated parity route is JSON-only.

| MCP tool name | CLI route | Input mode | Mutability | Requires Prolog | Effects | Interface |
|---|---|---|---|---|---|---|
| `kb_skills_list` | `skills-list` | `--input JSON` | read | no | `local-read` | peer; capability-selected |
| `kb_skills_load` | `skills-load` | `--input JSON` | read | no | `local-read` | peer; capability-selected |
| `kb_skills_read` | `skills-read` | `--input JSON` | read | no | `local-read` | peer; capability-selected |
| `kb_query` | `query` | `--input JSON or flags` | read | yes | `kb-read` | peer; capability-selected |
| `kb_search` | `search` | `--input JSON or flags` | read | yes | `kb-read` | peer; capability-selected |
| `kb_status` | `status` | `--input JSON or flags` | read | yes | `kb-read, workspace-read` | peer; capability-selected |
| `kb_find_gaps` | `find-gaps` | `--input JSON or flags` | read | yes | `kb-read` | peer; capability-selected |
| `kb_coverage` | `coverage` | `--input JSON or flags` | read | yes | `kb-read` | peer; capability-selected |
| `kb_graph` | `graph` | `--input JSON or flags` | read | yes | `kb-read` | peer; capability-selected |
| `kb_semantic_advisor` | `semantic-advisor` | `--input JSON` | read | no | `local-read` | peer; capability-selected |
| `kb_model_requirement` | `model-requirement` | `--input JSON` | read | yes | `kb-read` | peer; capability-selected |
| `kb_suggest_predicates` | `suggest-predicates` | `--input JSON` | read | yes | `kb-read` | peer; capability-selected |
| `kb_autopilot_generate` | `autopilot-generate` | `--input JSON` | read | no | `workspace-read` | peer; capability-selected |
| `kb_validate_upsert` | `validate-upsert` | `--input JSON` | read | yes | `kb-read` | peer; capability-selected |
| `kb_upsert` | `upsert` | `--input JSON` | write | yes | `kb-write, workspace-write` | peer; capability-selected |
| `kb_delete` | `delete` | `--input JSON` | write | yes | `kb-write, workspace-write` | peer; capability-selected |
| `kb_check` | `check` | `--input JSON or flags` | read | yes | `kb-read, workspace-read` | peer; capability-selected |
| `kb_sparql_remote` | `sparql-remote` | `--input JSON` | read | no | `network-read` | peer; capability-selected |
| `kb_compile_intent` | `compile-intent` | `--input JSON` | read | yes | `kb-read, workspace-read` | peer; capability-selected |
| `kb_apply_plan` | `apply-plan` | `--input JSON` | write | yes | `kb-read, kb-write, workspace-read` | peer; capability-selected |
| `kb_ingest_verification` | `ingest-verification` | `--input JSON` | write | yes | `kb-read, kb-write, workspace-read` | peer; capability-selected |

## JSON execution recipes

Use the project-local, non-installing runner from a trusted workspace. Stdin must contain exactly one UTF-8 JSON object.

```bash
echo '{"query":"authentication","type":"req","limit":10}' | npx --no-install kibi search --input -
```

```bash
echo '{"type":"req","id":"REQ-001","properties":{"title":"Test","status":"open"}}' | npx --no-install kibi upsert --input -
```

```bash
echo '{"rules":["required-fields","no-dangling-refs"]}' | npx --no-install kibi check --input -
```

## Telemetry handling

`_diagnostic_telemetry` is adapter metadata, not business input. In CLI JSON mode the adapter may validate and extract it for CLI usage logging before shared execution. In MCP diagnostic mode the adapter enforces its configured telemetry requirement and strips the field before shared execution. Never copy telemetry into entity properties or operation business input.
