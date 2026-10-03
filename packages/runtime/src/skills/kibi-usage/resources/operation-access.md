# Kibi Operation Access Catalog

Generated from the public `OperationSpec` catalog. CLI JSON and MCP structured
content use the same `KibiResult` envelope (protocol 1); result data is versioned
per operation. Effects are authoritative for mutability and adapter annotations.

| Operation | CLI route | Input mode | Mutability | Requires Prolog | Effects | Interface | Result version | Destructive | Retry safety | Open-world | Output schema |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `kb_skills_list` | `skills-list` | --input JSON | read | no | local-read | peer; capability-selected | kibi.kb_skills_list.v1 | no | safe | no | yes |
| `kb_skills_load` | `skills-load` | --input JSON | read | no | local-read | peer; capability-selected | kibi.kb_skills_load.v1 | no | safe | no | yes |
| `kb_skills_read` | `skills-read` | --input JSON | read | no | local-read | peer; capability-selected | kibi.kb_skills_read.v1 | no | safe | no | yes |
| `kb_skills` | `skill` | --input JSON | read | no | local-read | peer; capability-selected | kibi.kb_skills.v1 | no | safe | no | yes |
| `kb_query` | `query` | --input JSON or flags | read | yes | kb-read | peer; capability-selected | kibi.kb_query.v1 | no | safe | no | yes |
| `kb_search` | `search` | --input JSON or flags | read | yes | kb-read | peer; capability-selected | kibi.kb_search.v1 | no | safe | no | yes |
| `kb_status` | `status` | --input JSON or flags | read | no | kb-read, workspace-read | peer; capability-selected | kibi.kb_status.v1 | no | safe | no | yes |
| `kb_find_gaps` | `find-gaps` | --input JSON or flags | read | yes | kb-read | peer; capability-selected | kibi.kb_find_gaps.v1 | no | safe | no | yes |
| `kb_coverage` | `coverage` | --input JSON or flags | read | yes | kb-read | peer; capability-selected | kibi.kb_coverage.v1 | no | safe | no | yes |
| `kb_graph` | `graph` | --input JSON or flags | read | yes | kb-read | peer; capability-selected | kibi.kb_graph.v1 | no | safe | no | yes |
| `kb_semantic_advisor` | `semantic-advisor` | --input JSON | read | no | local-read | peer; capability-selected | kibi.kb_semantic_advisor.v1 | no | safe | no | yes |
| `kb_model_requirement` | `model-requirement` | --input JSON | read | yes | kb-read | peer; capability-selected | kibi.kb_model_requirement.v1 | no | safe | no | yes |
| `kb_suggest_predicates` | `suggest-predicates` | --input JSON | read | yes | kb-read | peer; capability-selected | kibi.kb_suggest_predicates.v1 | no | safe | no | yes |
| `kb_model` | `model` | --input JSON | read | yes | kb-read | peer; capability-selected | kibi.kb_model.v1 | no | safe | no | yes |
| `kb_plan_bootstrap` | `plan-bootstrap` | --input JSON | read | no | workspace-read | peer; capability-selected | kibi.kb_plan_bootstrap.v1 | no | safe | no | yes |
| `kb_validate_upsert` | `validate-upsert` | --input JSON | read | yes | kb-read | peer; capability-selected | kibi.kb_validate_upsert.v1 | no | safe | no | yes |
| `kb_upsert` | `upsert` | --input JSON | write | yes | kb-write, workspace-write | peer; capability-selected | kibi.kb_upsert.v1 | yes | unsafe | no | yes |
| `kb_delete` | `delete` | --input JSON | write | yes | kb-write, workspace-write | peer; capability-selected | kibi.kb_delete.v1 | yes | unsafe | no | yes |
| `kb_check` | `check` | --input JSON or flags | read | yes | kb-read, workspace-read | peer; capability-selected | kibi.kb_check.v1 | no | safe | no | yes |
| `kb_prepare_impact_review` | `prepare-impact-review` | --input JSON | read | no | workspace-read, kb-read | peer; capability-selected | kibi.kb_prepare_impact_review.v1 | no | safe | no | yes |
| `kb_sparql_remote` | `sparql-remote` | --input JSON | read | no | network-read | peer; capability-selected | kibi.kb_sparql_remote.v1 | no | safe | yes | yes |
| `kb_compile_intent` | `compile-intent` | --input JSON | read | yes | kb-read, workspace-read | peer; capability-selected | kibi.kb_compile_intent.v1 | no | safe | no | yes |
| `kb_apply_plan` | `apply-plan` | --input JSON | write | yes | kb-read, kb-write, workspace-read, workspace-write | peer; capability-selected | kibi.kb_apply_plan.v1 | yes | unsafe | no | yes |
| `kb_ingest_proof` | `ingest-proof` | --input JSON | write | yes | kb-read, kb-write, workspace-read | peer; capability-selected | kibi.kb_ingest_proof.v1 | yes | unsafe | no | yes |

## MCP tools versus catalog operations

The MCP server registers 16 tools. Most carry their catalog operation name; the
operations below are reached through a consolidated MCP call instead, while the
CLI keeps their dedicated routes. Result payloads (for example
`recommended_tools`, `suggested_next_tool`, or repair-plan steps) still name
catalog operations, so translate them with this list.

- `kb_skills_list`: MCP `kb_skills` with `action: "list"`; CLI `kibi skills list` (`skills-list`)
- `kb_skills_load`: MCP `kb_skills` with `action: "load"`; CLI `kibi skills load` (`skills-load`)
- `kb_skills_read`: MCP `kb_skills` with `action: "read"`; CLI `kibi skills read` (`skills-read`)
- `kb_semantic_advisor`: MCP `kb_model` with `mode: "analyze"`; CLI `kibi semantic-advisor` (`semantic-advisor`)
- `kb_model_requirement`: MCP `kb_model` with `mode: "requirement"`; CLI `kibi model-requirement` (`model-requirement`)
- `kb_suggest_predicates`: MCP `kb_model` with `mode: "predicates"`; CLI `kibi suggest-predicates` (`suggest-predicates`)
- `kb_validate_upsert`: MCP `kb_upsert` with `dryRun: true`; CLI `kibi validate-upsert` (`validate-upsert`)
- `kb_sparql_remote`: MCP `kb_sparql_remote`, registered only when `KIBI_MCP_OPTIONAL_TOOLS` names it; CLI `kibi sparql-remote` (`sparql-remote`)

The consolidated tools also have their own CLI routes: `kibi skill` for
`kb_skills` and `kibi model` for `kb_model`. `kb_job_status` is likewise
opt-in through `KIBI_MCP_OPTIONAL_TOOLS`; without it, `kb_check` with
`async: true` runs synchronously.

## JSON execution recipe

Use a trusted project-local, non-installing runner. Stdin contains one UTF-8 JSON
object and stdout contains the versioned result envelope:

```bash
printf '%s\n' '{"query":"authentication","limit":10}' | npx --no-install kibi search --input -
```

`_diagnostic_telemetry` is adapter metadata, not business input. Never copy it
into entity properties. On `committed_with_repairs`, follow typed required
`nextActions` and do not retry the original mutation.

`workspaceRoot` is an MCP-only routing argument naming the directory a call is
about (see the kibi-usage skill). The CLI JSON routes do not accept it; they
always run in the current directory.
