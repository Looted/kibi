# Phase 3: Host-Level Capability Requirements

**Status:** Proposed / Blocked on OpenCode Host Support  
**Package:** kibi-opencode  
**Related:** REQ-opencode-kibi-plugin-v1

## Overview

Phase 3 features require new OpenCode plugin hooks or APIs that do not currently exist. These capabilities would enable true enforcement (not just guidance) of Kibi-first workflows.

---

## Feature 1: File Read/Open Context Injection

### Goal
When a file is opened or read by the agent, automatically surface linked Kibi entities (requirements, tests, ADRs, symbols) without requiring the agent to remember to query.

### Current Behavior
- Plugin can only inject guidance into system prompts
- Agent must proactively run `kb_query` by `sourceFile`
- No automatic context surfacing

### Desired Behavior
- Hook into file-read/file-open operations
- Inject Kibi context hints into the file content or as side-channel metadata
- Example: Opening `src/auth/login.ts` shows "This file implements REQ-001, REQ-002"

### Proposed Host API

```typescript
// New hook: file.read.transform
hooks["file.read.transform"] = async (input, output) => {
  const filePath = input.path;
  // Query Kibi for linked entities
  const linkedEntities = await queryKibiBySourceFile(filePath);
  // Inject context into file metadata or content preview
  output.metadata.kibiContext = linkedEntities;
};
```

### Implementation Notes
- Would require the host to expose file-content interception hooks
- Currently deferred per README: "OpenCode's current plugin surface does not expose file-content interception hooks"
- Symbol metadata from `documentation/symbols.yaml` would feed this feature

### Value
- **Very High**: Best way to make Kibi contextual without relying on agent memory
- Eliminates "I forgot to query Kibi" problem
- Makes traceability visible at point of use

---

## Feature 2: Tool and Action Observation

### Goal
Detect whether the agent actually used `kb_query` before making implementation decisions or KB mutations.

### Current Behavior
- Plugin can only provide guidance via prompts
- No visibility into whether agent actually queried Kibi
- Cannot enforce "query-first" rule

### Desired Behavior
- Observe tool calls (kb_query, kb_upsert, etc.)
- Track query patterns before code edits
- Warn or block if implementation proceeds without prior context lookup

### Proposed Host API

```typescript
// New hook: tool.execute.before
hooks["tool.execute.before"] = async (input) => {
  const toolName = input.toolName;
  const params = input.params;
  
  // Track that kb_query was called
  if (toolName === "kibi_kb_query") {
    recordQueryContext(input.context);
  }
};

// New hook: file.edit.before
hooks["file.edit.before"] = async (input) => {
  const hasQueryContext = checkRecentQuery(input.filePath);
  if (!hasQueryContext) {
    // Could warn, delay, or require confirmation
    return { 
      warning: "No Kibi query detected for this file. Consider running kb_query first."
    };
  }
};
```

### Implementation Notes
- Requires host to expose tool-call lifecycle hooks
- Would need to track temporal relationship between query and edit
- Could be privacy-sensitive (observing all tool calls)

### Value
- **Very High**: Enables true query-first enforcement
- Moves from "guidance" to "enforcement"
- Critical for regulated/safety-critical workflows

---

## Feature 3: Pre-Apply Output Interception

### Goal
Inspect large generated comments or prose before they are written into files, and redirect durable knowledge toward appropriate Kibi entities.

### Current Behavior
- Plugin detects file edits after they happen
- Comments are already in code by the time plugin sees them
- Can only warn, not prevent

### Desired Behavior
- Intercept assistant outputs before apply
- Analyze for durable knowledge patterns
- Prompt to convert to KB entities instead of comments
- Example: "This 20-line technical explanation looks like an ADR. Create ADR-XXX instead of commenting?"

### Proposed Host API

```typescript
// New hook: output.apply.before
hooks["output.apply.before"] = async (input) => {
  const content = input.content;
  const filePath = input.filePath;
  
  // Analyze for durable knowledge
  const suggestion = classifyKnowledge(content);
  if (suggestion && suggestion.confidence === "high") {
    return {
      prompt: `This content looks like a ${suggestion.type}. Create a KB entity instead of a comment?`,
      actions: ["Create KB entity", "Keep as comment", "Cancel"]
    };
  }
};
```

### Implementation Notes
- Requires host to expose output interception before apply
- UI/UX challenge: how to present choices without breaking flow
- Similar to existing code action patterns

### Value
- **High**: Catches durable knowledge before it becomes technical debt
- Most direct implementation of "Kibi over comments" principle
- Reduces cleanup work later

---

## Feature 4: Notification/Toast API

### Goal
Replace log-only warnings with visible UI notifications/toasts for important Kibi guidance.

### Current Behavior
- Warnings go to console logs only
- Easy to miss in chat flow
- Config has `ux.toast*` options but implementation doesn't use them

### Desired Behavior
- Real toast notifications for critical warnings (.kb edits, repeated patterns)
- Non-blocking but highly visible
- User-configurable per category

### Proposed Host API

```typescript
// New API: host.notifications
const notification = {
  type: "warning" | "info" | "error",
  title: "Kibi: Manual .kb edit detected",
  message: "Direct edits to .kb/** are discouraged. Use MCP tools instead.",
  actions: ["Learn more", "Dismiss"]
};

await host.showNotification(notification);
```

### Implementation Notes
- Requires host to expose UI notification API
- Currently `ux.toast*` config exists but is unused
- Would need graceful fallback to logs if host doesn't support

### Value
- **Medium-High**: Makes guidance much harder to miss
- Improves compliance through visibility
- Better UX for critical warnings

---

## Dependencies and Ordering

### Recommended Implementation Order

1. **File Read/Open Context Injection** - Highest impact, enables query-first behavior passively
2. **Tool and Action Observation** - Enables true enforcement
3. **Pre-Apply Output Interception** - Completes the comment-to-KB pipeline
4. **Notification/Toast API** - Nice-to-have UX improvement

### Technical Dependencies

- All features require new OpenCode host API surface
- File injection and pre-apply interception need content interception hooks
- Tool observation needs tool-call lifecycle hooks
- Notifications need UI exposure API

### Alternative Approaches (Without Host Changes)

If host support is not forthcoming:

1. **Strengthen prompt guidance** (already done in Phase 1-2)
2. **Post-hoc analysis** - Analyze conversation history for query patterns
3. **User education** - Document importance of query-first in onboarding
4. **IDE extensions** - Build separate VS Code extension for file-context injection

---

## Specification for OpenCode Team

### Request
Add the following plugin hooks/APIs to enable Kibi enforcement:

1. **`file.read.transform`** - Transform or annotate file content when read
2. **`tool.execute.before/after`** - Observe tool calls for pattern enforcement  
3. **`output.apply.before`** - Intercept outputs before application
4. **`host.showNotification`** - Display non-blocking UI notifications

### Use Case
Enable AI agents to maintain traceability between code and requirements by:
- Surfacing linked requirements when files are opened
- Enforcing query-before-edit patterns
- Redirecting durable knowledge from comments to structured entities

### Priority
High for regulated/safety-critical development workflows.

---

## Acceptance Criteria (for when host support exists)

- [ ] File open automatically shows linked Kibi entities
- [ ] Tool observation tracks kb_query usage before edits
- [ ] Warning shown when edit proceeds without prior query
- [ ] Long comments can be intercepted and redirected to KB entities
- [ ] .kb edit warnings appear as toasts, not just logs
- [ ] All features gracefully degrade when host doesn't support them

---

*Documented: 2026-03-17*
*Phase: 3 of 3 (Blocked on Host Support)*
