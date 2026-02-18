# Kibi v0.0.1 Release Notes - Functional Alpha

**Release Date**: 2026-02-18  
**Status**: Functional Alpha / Early Preview

## Overview

Kibi v0.0.1 marks the first public release of the Kibi knowledge base system. This "Functional Alpha" is an early preview intended for small projects and early adopters who want to explore branch-aware, queryable project memory with strong test coverage and core workflows in place. While the system is fully functional and stable for its intended scope, performance and some features are not yet production-grade. Feedback from early users will directly shape the next phase of development.

## What's Working

### Core Features
- All 7 entity types supported: requirements, scenarios, tests, ADRs, flags, events, and symbols
- Branch-aware knowledge base with copy-from-main isolation and git integration
- CLI with 8 commands: init, sync, query, check, gc, branch, doctor, and more
- MCP server with 8 functional tools for agent and automation workflows
- VS Code extension builds and activates on workspaces with `.kb/`
- Typed relationships between entities are fully functional
- Idempotent operations prevent data corruption
- Git hooks integration (post-checkout, post-merge) for seamless KB sync
- No known crash or hanging issues

### Quality Assurance
- 162/162 automated tests passing (100%)
- Manual QA confirms all core workflows: init, sync, query, check, gc, branch
- All entity types can be created, queried, and validated

## Known Limitations

See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) for full details.

- Sync operations: 1.4–1.8s (3–6x slower than target)
- Query operations: up to 675x slower than ambitious targets
- Validation not enforced for all required fields
- CLI lacks `--branch` parameter (use MCP for branch-specific queries)
- Branch list command incomplete
- Incremental sync slower than full sync

## Who Should Use Kibi v0

**Recommended for:**
- Early adopters willing to provide feedback
- Small projects (fewer than 100 entities)
- Proof-of-concept implementations
- Local development workflows

**Not recommended for:**
- Large-scale production deployments
- Projects with more than 1000 entities
- Performance-critical or mission-critical systems

## What's Next in v0.1

**Primary focus:** Performance optimization (targeting 10x improvement)
- Persistent Prolog process to reduce startup overhead
- Query result caching
- Incremental sync with true change detection

**Additional priorities:**
- Validation enforcement for required fields
- CLI `--branch` parameter
- Branch list command
- Incremental sync optimization

## Getting Started

See [README.md](README.md) for installation and quick start instructions.

## Feedback Welcome

Kibi v0.0.1 is a functional alpha, not a production release. Your feedback is essential—please report issues, suggest improvements, and help shape the future of Kibi. Performance and feature enhancements are the top priorities for v0.1.
