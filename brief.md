## 1) Purpose and scope
The program (“KB”) is a repo-local, per-branch, queryable long-term memory for software projects that stores requirements, BDD behaviors, tests, architecture decisions (ADRs), feature flags, and events, plus the relationships between them.
It must be accessible to both humans (CLI now; editor/web UI later) and LLM agents via an MCP server over stdio, so an agent can read/write facts deterministically instead of editing ad-hoc documents. [swi-prolog.discourse](https://swi-prolog.discourse.group/t/scaling-to-billions-of-facts/380)

In v0, the deliverables are: (1) the KB store, (2) an MCP server exposing a small set of tools/resources, and (3) a project initializer that sets up storage and automation hooks.

Non-goals for v0: full web UI, full VS Code extension, cross-repo support, and deep language-specific symbol indexing.

## 2) Domain model (opinionated)
### 2.1 Entity types (fixed in v0)
The KB MUST support these entity types (stable IDs required):
- `req` (requirement)
- `scenario` (BDD behavior)
- `test` (unit/integration/e2e; kind is metadata)
- `adr` (architecture decision record)
- `flag` (feature flag)
- `event` (domain/system event)
- `symbol` (abstract code symbol: function/class/module; language-agnostic identifier)

Each entity MUST have: `id`, `title` (or short summary), `status`, `created_at`, `updated_at`, and `source` (provenance).

Each entity MAY have: `tags[]`, `owner`, `priority`, `severity`, `links[]` (URLs), and `text_ref` (pointer to Markdown/doc blob).

### 2.2 Relationship types (small set, extendable later)
The KB MUST support typed relationships (edges) between entities:
- `depends_on(req, req)`
- `specified_by(req, scenario)`
- `verified_by(req, test)`
- `implements(symbol, req)`
- `covered_by(symbol, test)`
- `constrained_by(symbol, adr)` and/or `affects(adr, symbol|component)`
- `guards(flag, symbol|event|req)`
- `publishes(symbol, event)` / `consumes(symbol, event)`
- `relates_to(a, b, kind)` (escape hatch; optional in v0)

The KB MUST store enough metadata on each relationship to support audit and conflict resolution (at minimum: `created_at`, `created_by`, `source`, optional `confidence`).

### 2.3 Consistency rules (first-class)
The KB MUST provide built-in validation rules (invokable by tool) such as:
- “Every `req` with `priority=must` has ≥1 `scenario` and ≥1 verifying `test`.”
- “No cycles in `depends_on` unless explicitly allowed.”
- “No `symbol` is linked to `req` IDs that do not exist.”

## 3) Storage, branching, and automation
### 3.1 Per-branch KB (copy-from-default-branch)
The KB MUST be stored per git branch.
On first use of a branch, if its KB does not exist, it MUST be created by copying the resolved default branch KB snapshot ("copy-from-default-branch" semantics).
The default branch is determined in this order: (1) `.kb/config.json` `defaultBranch` if set, (2) `origin/HEAD` if available, (3) falls back to `main` only if neither is set.
After creation, branch KBs MUST evolve independently (no implicit ongoing sync from the default branch).

### 3.2 Persistence (reliable, auditable)
The KB MUST provide durable persistence suitable for long-term project memory.
If implemented with SWI-Prolog’s `library(semweb/rdf_persistency)`, the store MUST use a directory-based layout where each RDF source is represented by a base snapshot file (binary) plus a journal file (Prolog terms) recording changes since the base state. [staff.fnwi.uva](https://staff.fnwi.uva.nl/u.endriss/teaching/prolog/prolog.pdf)
The store MUST use locking to prevent concurrent access to the same on-disk KB directory (attach attempts to a locked DB raise a permission error). [staff.fnwi.uva](https://staff.fnwi.uva.nl/u.endriss/teaching/prolog/prolog.pdf)
The system MUST NOT assume journals are merged automatically; merging/compaction MUST be an explicit maintenance operation because journals can serve as a changelog and merging large DBs can be slow. [staff.fnwi.uva](https://staff.fnwi.uva.nl/u.endriss/teaching/prolog/prolog.pdf)

If the implementation also uses SWI-Prolog `library(persistency)` for some “record-like” predicates, it MUST declare persistent predicates via `persistent/1`, and it MUST provide an internal module API (because the persistent DB is module-scoped by design). [geeksforgeeks](https://www.geeksforgeeks.org/artificial-intelligence/prolog-an-introduction/)
For multi-step updates (e.g., retract+assert), the implementation MUST guard both updates and relevant queries with `with_mutex/2` to maintain consistent states. [geeksforgeeks](https://www.geeksforgeeks.org/artificial-intelligence/prolog-an-introduction/)

### 3.3 Git hooks (keep KB up to date)
The initializer MUST be able to install git hooks either in `$GIT_DIR/hooks` or via `core.hooksPath`, and hooks without the executable bit MUST be treated as ignored. [academy.recforge](https://academy.recforge.com/course/prolog-language-a-comprehensive-guide-252/level-7-project-development-in-prolog/implementing-your-project-in-prolog)
The system MUST support `post-checkout` automation, which receives three parameters (old HEAD ref, new HEAD ref, and a flag indicating branch checkout vs file checkout). [academy.recforge](https://academy.recforge.com/course/prolog-language-a-comprehensive-guide-252/level-7-project-development-in-prolog/implementing-your-project-in-prolog)
The system SHOULD support `post-merge` automation, which runs after `git merge` (including the merge performed by `git pull`) and receives a parameter indicating squash/non-squash. [academy.recforge](https://academy.recforge.com/course/prolog-language-a-comprehensive-guide-252/level-7-project-development-in-prolog/implementing-your-project-in-prolog)

Hook responsibilities (v0):
- On `post-checkout` with branch switch flag, ensure branch KB exists (copy-from-default-branch if missing, using the resolver order above), then run a fast sync/update.
- On `post-merge`, run sync/update.
- Provide `kb gc` command that deletes KB directories for branches that no longer exist locally (best-effort cleanup; v0 does not rely on a “branch deleted” hook).

## 4) MCP server and CLI requirements
### 4.1 MCP transport and message safety (stdio first)
The MCP server MUST support stdio transport. [swi-prolog.discourse](https://swi-prolog.discourse.group/t/scaling-to-billions-of-facts/380)
In stdio transport, the client launches the MCP server as a subprocess, messages are JSON-RPC objects delimited by newlines, messages MUST NOT contain embedded newlines, and the server MUST NOT write anything to stdout that is not a valid MCP message (stderr may be used for logs). [swi-prolog.discourse](https://swi-prolog.discourse.group/t/scaling-to-billions-of-facts/380)

### 4.2 MCP tool surface (v0)
The MCP server MUST expose tools that cover these operations without requiring arbitrary Prolog execution:
- `kb.query`: query entities/edges by type, id, tags, and relationship patterns.
- `kb.upsert`: create/update entities and edges via a validated “changeset” payload.
- `kb.delete`: remove entities/edges (restricted; see safety).
- `kb.check`: run built-in consistency rules and return violations.
The MCP server is branch-aware: the server automatically resolves the active git branch on each request and attaches to the correct branch KB transparently. Branch management (ensure/gc) is handled via the CLI, not the MCP tool surface.

### 4.3 CLI (v0)
A CLI MUST be provided with at least:
- `kb init`: create `.kb/` layout, seed `main`, install hooks (optional flags to skip hooks).
- `kb sync`: scan project files and update derived facts (exact extractors are minimal in v0; see below).
- `kb query`: human-friendly query wrapper around MCP/DB.
- `kb gc`: cleanup stale branch stores.

## 5) Safety, extractors, and initial project setup
### 5.1 “Opinionated enough” defaults
`kb init` MUST create a deterministic repo-local directory layout (e.g., `.kb/config.json`, `.kb/branches/main/...`, `.kb/schema/...`) with sensible defaults so it works without customization.
The schema MUST be strict for core types/edges, and extensible by adding new types later (but not required in v0).

### 5.2 Automated extraction (minimal v0, pluggable later)
The system MUST support at least two extractors in v0:
- Markdown extractor: reads `req/scenario/test/adr/flag/event` documents from a conventional location (configurable) and imports IDs + metadata + declared links (e.g., frontmatter `links:`).
- Symbol link manifest extractor: imports `symbol` entities and `implements/covered_by/...` edges from a dedicated manifest file (JSON/YAML) so the system is language-agnostic on day 1.

The system SHOULD be designed so additional extractors (SCIP/LSP symbol resolution, test runner integration, CI coverage import) can be added without changing the core storage model.

### 5.3 Write governance (because the writer is an LLM)
All write operations (`kb.upsert`, `kb.delete`) MUST be validated (shape + required fields + referential integrity) before being applied.
The KB SHOULD keep an append-only audit log of applied changesets (who/when/source) to support rollback and debugging of agent behavior.
