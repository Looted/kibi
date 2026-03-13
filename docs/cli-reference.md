# CLI Reference

This document provides complete command-by-command documentation for the kibi CLI.

## `kibi init`

Initializes a kibi project in the current directory.

**Behavior:**
- Creates `.kb/` directory structure
- Installs git hooks (pre-commit, post-checkout, post-merge, post-rewrite) by default
- Adds `.kb/` to `.gitignore`
- Creates default `config.json` with document path patterns

**Flags:**
- `--no-hooks` - Skip git hook installation (hooks are installed by default)

**Notes:**
- Hooks are installed by default. Only use `--no-hooks` if you specifically don't want automated syncing.
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

**Notes:**
- Supports these entity types: req, scenario, test, adr, flag, event, fact
- Symbol manifests must be in YAML format
- Changes are committed to the branch KB's audit log

## `kibi query <type>`

Queries entities from the knowledge base.

**Syntax:**
```bash
kibi query <type> [--id ID] [--tag TAG] [--format json|table] [--limit N] [--offset N]
```

**Arguments:**
- `<type>` - Entity type to query (req, scenario, test, adr, flag, event, symbol, fact)
- `--id ID` - Query by exact entity ID
- `--tag TAG` - Filter by tag
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

# Get paginated results
kibi query scenario --limit 10 --offset 0
kibi query scenario --limit 10 --offset 10
```

**Notes:**
- Returns "No entities found" if query produces no results
- Results are deterministically ordered
- Type, ID, and tag filters can be combined

## `kibi check`

Validates knowledge base integrity and runs inference rules.

**Behavior:**
- Validates required fields are present
- Checks requirement coverage (must-priority rules)
- Detects dangling references (entities that reference non-existent IDs)
- Detects cycles in dependency graphs
- Reports violations with actionable suggestions

**Flags:**
- `--staged` - Only check staged files (not whole repo)
- `--kb-path <path>` - Path to KB directory (optional)
- `--rules <rule1,rule2>` - Comma-separated list of rules to run (optional)

**Examples:**
```bash
# Check entire KB
kibi check

# Check only staged changes
kibi check --staged

# Run specific rules
kibi check --rules must-priority-coverage,no-dangling-refs
```

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
- Git hooks missing → Run `kibi init` or `kibi init --hooks`
- Config invalid → Check `.kb/config.json` syntax

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
- Stale = branch exists in `.kb/branches/` but not in `git branch -r`

## `kibi branch`

Lists and manages branch knowledge bases.

**Syntax:**
```bash
kibi branch [--list]
```

**Flags:**
- `--list` - List all branch KBs (default behavior)

**Behavior:**
- Lists all branch KBs in `.kb/branches/`
- Default branch resolution order: `.kb/config.json` `defaultBranch` → `origin/HEAD` → `main`
- On new branch checkout: copies from default branch (if exists) or creates fresh KB

**Examples:**
```bash
# List all branch KBs
kibi branch --list
```

## Staged Symbol Traceability

The `kibi check --staged` command enforces traceability on code before commit.

**Purpose:**
Every new or modified code symbol (function, class, module) must be explicitly linked to at least one requirement before it can be committed. This prevents "orphan" code from being merged.

**How to use:**
```bash
# Check staged files for traceability coverage
kibi check --staged
```

This command scans only files staged for commit and reports any new or modified symbols that do not have requirement links. If violations are found and this is run as a pre-commit hook, the commit will be blocked.

**The `implements REQ-xxx` directive syntax:**

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
