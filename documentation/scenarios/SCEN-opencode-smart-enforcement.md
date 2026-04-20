---
id: SCEN-opencode-smart-enforcement
title: Smart Enforcement Posture and Risk Classification
type: scenario
status: active
created_at: 2026-04-03T00:00:00Z
updated_at: 2026-04-20T00:00:00Z
source: documentation/scenarios/SCEN-opencode-smart-enforcement.md
priority: must
tags:
  - enforcement
  - opencode
  - kibi-first
  - guidance
  - risk-classification
links:
  - type: verified_by
    target: TEST-opencode-smart-enforcement
---

## Scenario: Posture Detection and Dynamic Guidance

The OpenCode Kibi Plugin must adjust its guidance based on the repository's Kibi state (posture) and the risk of the current agent action.

### Posture State Detection

**Given** an OpenCode session is starting
**When** the plugin checks the repository state
**Then** it must correctly classify the posture as:
- `root_active` if `.kb/config.json` is at the repo root.
- `root_partial` if root `.kb/config.json` exists but configured KB targets are missing.
- `root_uninitialized` if no root `.kb/config.json` exists but the root declares Kibi intent; agents should use `/init-kibi` for retroactive bootstrap.
- `vendored_only` if only vendored Kibi markers are present under nested/vendor paths.
- `hybrid_root_plus_vendored` if a root `.kb/config.json` coexists with vendored Kibi markers.
- `maintenance_degraded` as an overlay when maintenance execution is unavailable or disabled.

### Risk Class Triggers

**Given** the posture is `root_active`
**When** an agent edits a file in `src/` without adding `// implements REQ-xxx`
**Then** the plugin must classify this as `traceability_candidate`
**And** inject guidance nudging the agent to add requirement links.

**When** an agent edits a file in `documentation/requirements/`
**Then** the plugin must classify this as `req_policy_candidate`
**And** inject guidance about SCEN/TEST separation.

**When** an agent attempts to edit a file under `.kb/relationships/`
**Then** the plugin must classify this as `manual_kb_edit`
**And** emit a loud warning directing the agent to use `kb_upsert` or `kb_delete`.

### Token Budget Compliance

**Given** the plugin is injecting guidance
**When** multiple guidance candidates are available (e.g., traceability + structural)
**Then** it must combine them into a single block
**And** truncate to a maximum of 5 bullet points or 120 words.

### Risky-Edit Briefing Cue

**Given** the posture is `root_active` and the action is an authoritative risky edit
**When** the plugin has enough prompt budget to add a discovery cue
**Then** it may mention `/brief-kibi` and `kb_briefing_generate` inside the same single guidance block
**And** it must suppress that cue when `maintenance_degraded` is active.

### Cache Invalidation

**Given** the plugin has cached the current posture as `root_active`
**When** the user switches to a branch that has not yet been initialized with Kibi
**Then** the plugin must detect the branch change
**And** invalidate the cache, re-detecting the posture as `uninitialized`.

### Degraded Mode Handling

**Given** a repository with a corrupted `.kb/config.json`
**When** the plugin attempts to detect posture
**Then** it must fail gracefully, preserving the underlying posture decision
**And** apply `maintenance_degraded` as an overlay until the user/operator repairs setup outside the agent session.
### Targeted Validation Routing

**Given** the posture is `root_active` and targeted checks are enabled
**When** an agent edits a code file classified as `traceability_candidate`
**Then** the plugin must schedule a sync with reason `smart-enforcement.traceability` and rule `symbol-traceability`.

**When** an agent edits a fact KB document
**Then** the plugin must include `strict-fact-shape` along with `required-fields` and `no-dangling-refs` in the scheduled validation.

### Source-Linked Micro-Brief Guidance

**Given** the posture is `root_active`
**When** an agent edits a code file that has existing requirement links in `documentation/symbols.yaml`
**And** the action is classified as `behavior_candidate` or `traceability_candidate`
**Then** the injected guidance must prepend `- Existing Kibi links: REQ-001, REQ-002` (up to 3 IDs) to the risk-class guidance.

**When** the same action is performed again and the context is cached
**Then** the guidance must be suppressed (including the micro-brief) to minimize noise.
