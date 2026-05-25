# Fact Lanes

## Strict Lane (Contradiction-Safe)

### fact_kind: subject
```yaml
id: FACT-USER-ROLE
title: User Role Assignment
status: active
fact_kind: subject
subject_key: user.role_assignment
```

### fact_kind: property_value
```yaml
id: FACT-LIMIT-3
title: Maximum of Three Roles
status: active
fact_kind: property_value
subject_key: user.role_assignment
property_key: max_roles
operator: lte
value_type: int
value_int: 3
```

## Context Lane (Non-Blocking)

### fact_kind: observation
For bug records, incident notes, and observed behavior.
```yaml
id: FACT-BUG-123
title: Login fails on Safari 17
status: active
fact_kind: observation
```

### fact_kind: meta
For governance notes, process commentary, and workaround documentation.
```yaml
id: FACT-WORKAROUND-456
title: Temporary cache bypass for v2 migration
status: active
fact_kind: meta
```
