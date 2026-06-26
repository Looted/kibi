# CLI Reference

This document provides complete command-by-command documentation for the kibi CLI.

## `kibi init`

Initializes a kibi project in the current directory.

**Behavior:**
- Creates `.kb/` directory structure
- Installs git hooks (pre-commit, post-checkout, post-merge, post-rewrite) by default
- Adds `.kb/` to `.gitignore`
- Creates default `config.json` with document path patterns
- Creates `documentation/symbols.yaml` and `documentation/symbol-coordinates.yaml` when they do not already exist

**Flags:**
- `--no-hooks` - Skip git hook installation (hooks are installed by default)

**Notes:**
- Hooks are installed by default. Only use `--no-hooks` if you specifically don't want automated syncing.
- The pre-commit hook blocks commits when `documentation/symbol-coordinates.yaml` has unstaged changes, forcing refreshed symbol coordinates to be staged with the related code changes.
- The pre-commit hook also blocks behavior-changing source edits that lack staged Kibi impact evidence (KB entity docs or refreshed manifest). Test-only and docs-only edits are exempt.
- Idempotent: safe to run multiple times
- After running, see the quick start guide in README.md for next steps

## `kibi sync`

Extracts entities and relationships from project documents and updates the knowledge base.

**Behavior:**
- Extracts entities from Markdown files with frontmatter
- Imports symbols from YAML manifests
- Updates KB for the current git branch
- Runs validation rules on the updated KB

**Flags:**
- `--validate-only` - Perform validation without making mutations
- `--rebuild` - Rebuild branch snapshot from scratch (discards current KB)
- `--refresh-symbol-coordinates` - Refresh symbol location data in `documentation/symbol-coordinates.yaml` during sync

**Notes (sync + MCP):**

- Rebuild with `--rebuild` replaces the on-disk branch KB snapshot while MCP can continue running.
- A running MCP session detects same-branch snapshot replacement before serving affected operations.
- If auto-refresh cannot complete during a transient publish conflict, MCP returns a recovery error; retry the tool call after the publish settles.

**Notes:**
- Supports these entity types: req, scenario, test, adr, flag, event, symbol, fact
- **Modeling:** Use `flag` for runtime/config gates; record bugs and workarounds as `fact` entities, usually with `fact_kind: observation` or `meta`. **Strict facts** (subject, property_value) drive contradiction checks, while observation/meta facts are non-blocking notes.
- Symbol manifests must be in YAML format
- Changes are committed to the branch KB's audit log

## `kibi query [type]`

Queries entities from the knowledge base.

**Syntax:**
```bash
kibi query [type] [--id ID] [--tag TAG] [--source PATH] [--relationships ID] [--format json|table] [--limit N] [--offset N]
```

**Arguments:**
- `[type]` - Optional entity type to query (req, scenario, test, adr, flag, event, symbol, fact)
- `--id ID` - Query by exact entity ID
- `--tag TAG` - Filter by tag
- `--source PATH` - Filter by source file path substring
- `--relationships ID` - Return relationships for a specific entity ID
- `--format json|table` - Output format (default: json)
- `--limit N` - Maximum number of results to return (default: 100)
- `--offset N` - Number of results to skip (pagination)

**Examples:**
```bash
# List all requirements as table
kibi query req --format table

# Find specific test
kibi query test --id TEST-001

# Find all entities with "security" tag
kibi query req --tag security --format table

# Find entities linked to a source file path
kibi query symbol --source src/auth/login.ts --format table

# Show relationships for one entity
kibi query --relationships REQ-001

# Get paginated results
kibi query scenario --limit 10 --offset 0
kibi query scenario --limit 10 --offset 10
```

**Notes:**
- Returns "No entities found" if query produces no results
- Results are deterministically ordered
- Type, ID, and tag filters can be combined

## `kibi search <query>`

Searches entity metadata and markdown body text for exploratory discovery.

**Syntax:**
```bash
kibi search <query> [--type TYPE] [--format json|table] [--limit N] [--offset N]
```

**Notes:**
- Searches markdown-backed knowledge and metadata
- Does not search raw code file bodies
- Use `kibi query` for exact follow-up lookups

## `kibi status`

Reports the current KB snapshot, branch, and freshness state.

**Syntax:**
```bash
kibi status [--format json|table]
```

## `kibi gaps [type]`

Runs curated missing/present relationship analysis.

**Syntax:**
```bash
kibi gaps [type] [--missing-rel RELS] [--present-rel RELS] [--tag TAGS] [--source PATH] [--limit N] [--offset N] [--format json|table]
```

**Examples:**
```bash
# Requirements missing scenarios or tests
kibi gaps req --missing-rel specified_by,verified_by --format table

# Source-linked gap analysis
kibi gaps req --source src/auth --missing-rel verified_by --format table
```

## `kibi coverage`

Generates curated coverage reports.

**Syntax:**
```bash
kibi coverage [--by req|symbol|type] [--tag TAGS] [--include-passing] [--no-include-transitive] [--limit N] [--offset N] [--format json|table]
```

**Notes:**
- Requirement coverage summaries distinguish evaluated must-priority requirements from `not_applicable` rows.
- `--include-passing` adds fully covered rows back into the result set.

## `kibi graph`

Runs bounded graph traversal from one or more seed IDs.

**Syntax:**
```bash
kibi graph --from IDS [--relationships RELS] [--direction outgoing|incoming|both] [--depth N] [--entity-types TYPES] [--max-nodes N] [--max-edges N] [--format json|table]
```

**Examples:**
```bash
# Follow requirement links outward
kibi graph --from REQ-001 --direction outgoing --depth 2 --format table

# Inspect both incoming and outgoing relationships
kibi graph --from REQ-001,TEST-001 --direction both --depth 2 --format json
```

## `kibi check`

Validates knowledge base integrity and runs inference rules.

**Behavior:**
- Validates required fields are present
- Checks requirement coverage (must-priority rules)
- Detects dangling references (entities that reference non-existent IDs)
- Detects cycles in dependency graphs
- Supports strict migration checks like `strict-fact-shape` and `strict-req-fact-pairing` (both default-off) for malformed typed facts and incomplete requirement/fact pairing
- With `--staged`, runs commit-time changed-file impact enforcement for behavior-changing source edits, including missing Kibi impact evidence, stale symbol coordinates, and changed behavioral symbols that are only linked through coarse class/module ownership
- Reports violations with actionable suggestions

**Flags:**
- `--staged` - Only check staged files (not whole repo)
- `--kb-path <path>` - Path to KB directory (optional)
- `--rules <rule1,rule2>` - Comma-separated list of rules to run (optional)
- `--min-links <N>` - Minimum requirement links per symbol for staged traceability (default: 1)
- `--dry-run` - Show staged-traceability effects without modifying files

**Examples:**
```bash
# Check entire KB
kibi check

# Check only staged changes
kibi check --staged

# Run specific rules
kibi check --rules must-priority-coverage,no-dangling-refs

# Opt into strict fact migration checks
kibi check --rules strict-fact-shape # Migration-oriented check

# Audit strict requirement/fact pairing during migration
kibi check --rules strict-req-fact-pairing
```

Agents should prefer MCP `kb_check({sourceFiles:[...], includeImpactDiagnostics:true, includeWorkingTreeDiff:true})` while editing. CLI `kibi check --staged` remains the git-hook and operator fallback once files are staged.

**See also:** [Staged Symbol Traceability](#staged-symbol-traceability) for `--staged` usage details.

## `kibi doctor`

Verifies environment setup and diagnostics.

**Behavior:**
- Checks SWI-Prolog installation and version
- Verifies `.kb/` directory exists
- Validates `.kb/config.json` syntax
- Checks git repository presence
- Verifies git hooks are installed and executable
- Reports issues with remediation suggestions

**Examples:**
```bash
kibi doctor
```

**Common Issues Found:**
- SWI-Prolog not found → See [install guide](install.md)
- `.kb/` missing → Run `kibi init`
- Git hooks missing → Run `kibi init`
- Config invalid → Check `.kb/config.json` syntax

## `kibi usage-metrics`

Reports adoption and quality metrics from `.kb/usage.log`.

**Syntax:**
```bash
kibi usage-metrics [--format json|table] [--limit N]
```

**Behavior:**
- Reads `.kb/usage.log` from the current repository
- Summarizes tool usage, branch activity, and success/error outcomes
- Reports telemetry completeness and zero-result rates
- Shows `kb_check` violation trend entries and grouped `kb_upsert` error categories
- Limits the zero-result source-file leaderboard with `--limit`

**Flags:**
- `--format json|table` - Output format (default: table)
- `--limit N` - Maximum number of top zero-result source files to include (default: 10)

**Examples:**
```bash
# Show the default table report
kibi usage-metrics

# Export the full report structure as JSON
kibi usage-metrics --format json

# Show only the top 5 zero-result source files
kibi usage-metrics --limit 5
```

**Notes:**
- Returns an error if `.kb/usage.log` does not exist in the current repository
- `--limit` must be a positive integer


## `kibi migrate`

Upgrades the branch knowledge base to the latest schema version.

**Behavior:**
- Upgrades entity schemas and internal storage formats
- Marks pre-existing coarse symbol links with `granularity_reason: legacy-link` when narrower exported symbols or class methods (`ClassName.methodName`) are already available
- Fixes legacy requirement modeling to follow strict fact-pairing rules
- Updates `.kb/config.json` with the latest `schemaVersion`
- Idempotent: safe to run if already on the latest version

**Flags:**
- `--dry-run` - Show what would be migrated without making changes
- `--yes` - Apply migration changes without prompting

**Notes:**
- Use `kibi status` to check if a migration is pending for your branch.
- Migration is recommended when upgrading `kibi-cli` or `kibi-mcp` packages.
- After migration, run `kibi sync --refresh-symbol-coordinates` if symbol coordinate diagnostics remain.

## `kibi gc`

Garbage collects stale branch knowledge bases.

**Behavior:**
- Lists branch KBs that no longer exist in git
- Optionally deletes stale branch KBs
- Safe by default (dry-run mode)

**Flags:**
- `--dry-run` - Only list stale branches (default)
- `--force` - Delete stale branches

**Examples:**
```bash
# List stale branches (safe)
kibi gc --dry-run

# Delete stale branches
kibi gc --force
```

**Notes:**
- Use `--dry-run` first to see what would be deleted
- Stale = branch exists in `.kb/branches/` but not in local `git branch` output

## `kibi branch`

Lists and manages branch knowledge bases.

**Syntax:**
```bash
kibi branch ensure [--from <branch>]
```

**Arguments:**
- `ensure` - Ensure the active branch has a branch-local KB snapshot

**Flags:**
- `--from <branch>` - Copy the new branch KB from an existing branch KB instead of creating an empty one

**Behavior:**
- Ensures the active git branch has a KB under `.kb/branches/<branch>`
- Creates an empty branch KB by default when one does not exist
- If `--from` is supplied and that branch KB exists, copies from it instead

**Examples:**
```bash
# Ensure the current branch has a KB
kibi branch ensure

# Seed the current branch KB from another branch KB
kibi branch ensure --from main
```

HT|## `kibi skills`
QN|
MV|Manage and inspect bundled agent skills. Skills are reusable Markdown guidance packages shipped with Kibi.
QN|
XW|**Behavior:**
TY|- Lists available bundled skills
TZ|- Loads a skill's manifest and body
BH|- Reads individual resources declared by a skill
JM|- Validates a local skill bundle directory
QN|
XQ|**Subcommands:**
PJ|
BV|```bash
QN|kibi skills list [--format json|table]
SV|kibi skills load <id> [--format json|markdown]
HY|kibi skills read <id> <resource> [--format text|json]
QB|kibi skills validate <path> [--format json|table]
BP|```
ZS|
JK|**Arguments:**
JB|- `list` - Show all bundled skills with ID, name, version, and description
XY|- `load <id>` - Load a skill by its bundled ID. Returns the skill body and manifest.
BJ|- `read <id> <resource>` - Read a specific resource file declared in the skill manifest
PX|- `validate <path>` - Validate a local skill bundle directory against the skill schema
PS|
XQ|**Flags:**
PX|- `--format json|table` - Output format for `list` and `validate` (default: table)
YR|- `--format json|markdown` - Output format for `load` (default: markdown)
SP|- `--format text|json` - Output format for `read` (default: text)
PT|
MT|**Examples:**
BV|```bash
QQ|# List all bundled skills
NZ|kibi skills list
TM|
MS|# Load the canonical usage skill as markdown
NB|kibi skills load kibi-usage --format markdown
NZ|
VW|# Read a specific resource from a skill
MB|kibi skills read kibi-usage resources/fact-lanes.md --format text
QJ|```
PY|
HX|**Notes:**
YS|- Skills are bundled with Kibi. Remote installation, marketplace, and script execution are not supported in v1.
QT|- OpenCode is an adapter for skill discovery, not the source of truth. The bundled skill set is authoritative.
XB

## Staged Symbol Traceability

The `kibi check --staged` command enforces traceability on code before commit.

**Purpose:**
Every new or modified code symbol (function, class, method, accessor, behavioral class property, or module) must be explicitly linked to at least one requirement before it can be committed. This prevents "orphan" code from being merged and catches edits hidden behind broad class/module links when a narrower changed anchor exists.

**Workflow Options:**
1. **Relationship-based (Preferred for Test/e2e):** Model the code as a symbol in your manifest (e.g., `documentation/symbols.yaml`), link it to a `TEST-*` entity with `executable_for` to establish its identity. The canonical traceability chain is `REQ-xxx` → `SCEN-xxx` → `TEST-xxx`. Use `covered_by` to link symbols to the tests that exercise them. This satisfies the staged check without modifying source code. Note that physical symbol coordinates are maintained separately in `documentation/symbol-coordinates.yaml` and must be refreshed via `kibi sync --refresh-symbol-coordinates` when code changes.
2. **Comment-based (Optional Shortcut):** Add an inline `// implements REQ-xxx` comment. This remains backward-compatible and useful for quick code-only changes.

**How to use:**
```bash
# Check staged files for traceability coverage
kibi check --staged
```

This command scans only files staged for commit and reports any new or modified symbols that do not have requirement links (either via inline comments or explicit KB relationships). It also reports stale symbol-coordinate evidence and `symbol_granularity_violation` when a changed behavioral member such as `UploadPageComponent.processingProgressLabel` is covered only by a coarse class/module relationship without an audited `granularity_reason`. If violations are found and this is run as a pre-commit hook, the commit will be blocked.

The staged CLI gate does not prove that linked prose still matches the source edit. Use the MCP impact check while editing to get `symbol_semantic_review_needed` guidance and inspect linked requirements/scenarios/tests before deciding whether to update KB entities.

**Scope Note**: Staged check handles explicitly modeled symbols and extracted TypeScript/JavaScript anchors, including exported class methods, accessors, and behavior-bearing class properties. Automatic extraction of framework-specific `test()` or `it()` callbacks is not currently supported.

**Inline Directive Syntax (Optional):**

Link a code symbol to a requirement by adding a comment:

```typescript
export function myFunc() { } // implements REQ-001
```

Link to multiple requirements:

```typescript
export class MyClass { } // implements REQ-001, REQ-002
```

**Supported languages:**
- TypeScript (`.ts`, `.tsx`)
- JavaScript (`.js`, `.jsx`)

**CLI Flags for staged checking:**
- `--staged` - Only check staged files
- `--min-links <N>` - Minimum requirement links per symbol (default: 1)
- `--kb-path <path>` - Path to KB directory
- `--rules <rule1,rule2>` - Specific rules to run
- `--dry-run` - Show what would be blocked without blocking commit

**See also:**
- [Troubleshooting](troubleshooting.md) - Hook repair and remediation
- [AGENTS.md](../AGENTS.md) - Agent-specific workflows

---

*For detailed system architecture, see [architecture.md](architecture.md)*
*For entity and relationship schemas, see [entity-schema.md](entity-schema.md)*
*For MCP server reference, see [mcp-reference.md](mcp-reference.md)*
