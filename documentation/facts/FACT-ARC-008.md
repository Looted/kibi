---
id: FACT-ARC-008
title: Domain model uses Student/Instructor internally, mapped to Climber/Coach in UI
status: active
tags: [architecture, domain-model, user-roles]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T12:00:00Z
updated_at: 2026-02-20T12:00:00Z
fact_kind: meta
---

The Align project uses sport-neutral domain terminology internally but maps to target market-specific personas in the user interface.

## Internal Terminology

Code uses: `Student` and `Instructor` as the internal type names for user entities.
These terms are sport-neutral and avoid assumptions about specific sports (like assuming climbing context).

## User Interface Terminology

The user interface presents:

- **Climber** / **Student**: User seeking coaching services (upload video, receive feedback)
- **Coach** / **Instructor**: Expert providing analysis and feedback

## Domain Mapping

| Internal Code Type | User Interface Term |
| ------------------ | ------------------- | ------------------------------------------------- |
| `Student`          | Climber             | User seeking expert feedback from coach           |
| `Instructor`       | Coach               | Expert providing analysis and guidance to climber |

## Example Usage

```typescript
// User entity
const user: User = {
  id: "123",
  role: "student",
  // ...
};

// Instructor entity
const instructor = {
  id: "456",
  role: "instructor",
  // ...
};
```

## Rationale

This separation allows:

1. **Sport Neutral**: Platform can serve different sports without bias
2. **Extensibility**: Easy to add new sports or coaching styles
3. **Clear Communication**: Separation of user/instructor terminology improves clarity

## Implementation Notes

- All database schemas use `role` field to distinguish user types.
- Business logic should be role-agnostic where possible (e.g., both user types can upload videos and request coaching).

- UI uses the correct terminology based on user's role.
