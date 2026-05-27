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

## Granular Facts for Coherence Checks

Granular strict facts work best when each `property_value` represents one semantic claim about one `subject_key` and one `property_key`. This lets `domain-contradictions` compare current requirements that constrain the same subject and require incompatible values.

### Role set conflict

`REQ-ROLE-SET-2` and `REQ-ROLE-SET-3` are incoherent if both are current: they each define the exact allowed role set, but one allows two roles and the other allows three.

```yaml
subject:
  id: FACT-USER-ROLES
  title: User roles
  status: active
  fact_kind: subject
  subject_key: user.roles

property_values:
  - id: FACT-USER-ROLES-ALLOWED-2
    title: User and admin roles only
    status: active
    fact_kind: property_value
    subject_key: user.roles
    property_key: user.roles.allowed_set
    operator: eq
    value_type: list
    value_json: '["user", "admin"]'
  - id: FACT-USER-ROLES-ALLOWED-3
    title: User, admin, and superadmin roles
    status: active
    fact_kind: property_value
    subject_key: user.roles
    property_key: user.roles.allowed_set
    operator: eq
    value_type: list
    value_json: '["user", "admin", "superadmin"]'

relationships:
  - { type: constrains, from: REQ-ROLE-SET-2, to: FACT-USER-ROLES }
  - { type: requires_property, from: REQ-ROLE-SET-2, to: FACT-USER-ROLES-ALLOWED-2 }
  - { type: constrains, from: REQ-ROLE-SET-3, to: FACT-USER-ROLES }
  - { type: requires_property, from: REQ-ROLE-SET-3, to: FACT-USER-ROLES-ALLOWED-3 }
```

### Permission actor conflict

`REQ-ADMIN-CAN-MANAGE-BILLING` and `REQ-ONLY-SUPERADMIN-MANAGES-BILLING` conflict when both define the exact allowed actor for the same permission.

```yaml
subject:
  id: FACT-BILLING-MANAGE
  title: Billing management permission
  status: active
  fact_kind: subject
  subject_key: billing.manage

property_values:
  - id: FACT-BILLING-MANAGE-ACTOR-ADMIN
    title: Admin can manage billing
    status: active
    fact_kind: property_value
    subject_key: billing.manage
    property_key: billing.manage.allowed_actor
    operator: eq
    value_type: string
    value_string: admin
  - id: FACT-BILLING-MANAGE-ACTOR-SUPERADMIN
    title: Only superadmin can manage billing
    status: active
    fact_kind: property_value
    subject_key: billing.manage
    property_key: billing.manage.allowed_actor
    operator: eq
    value_type: string
    value_string: superadmin
```

When a contradiction is intentional evolution rather than a real conflict, link the replaced requirement to the replacement requirement with `supersedes`.

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
