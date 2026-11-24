# Kibi Workflow Rules

When working in a repository with a Kibi knowledge base (`.kb/manifest.json`), use Kibi through whichever approved interface is visible. MCP tools (`kb_*`, `kibi_kb_*`, or host-prefixed `*kb_*`) and the trusted project-local CLI JSON routes (`npx --no-install kibi <route> --input -`) are equal peers over the same operations.

## Interface Selection

1. Prefer visible `kb_*` MCP tools when present in the tool list.
2. Otherwise, when running in a trusted workspace with shell access, run the project-local CLI JSON route:
   `printf '%s\n' '{"query":"checkout","limit":10}' | npx --no-install kibi search --input -`
3. Never use a global installing runner (`npx kibi ...` without `--no-install`) and never read or edit `.kb/` files directly.

## Workflow

- **Discover before changing behavior:** run `kb_search` (with `sourceLocations` when editing a file) and `kb_query({id})` for the governing requirement. Read the requirement's statement and `why` before modifying code.
- **Respect firm rules:** a request that would make a recorded `firm` requirement or ADR false is a question, not a task. Name the rule and confirm with the user before changing the code or superseding the rule.
- **Record decisions:** record new user-stated rules with `kb_record` (or `kb_upsert` for updates, facts, scenarios, and symbol links). Create endpoints before linking and mutate sequentially.
- **Check before finishing:** run `kb_check({changed: true, sourceFiles: [...]})` on changed source files and resolve blocking findings before handing off.
- **Load Kibi skills when needed:** `kibi-usage`, `kibi-decisions`, `kibi-traceability`, `kibi-commit-review`, `kibi-freshness`, `kibi-bootstrap`, and `kibi-provable-code`.
