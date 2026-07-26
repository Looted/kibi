# Fact Lanes

Requirement prose remains the human-readable source. Facts add queryable semantics; they do not replace the requirement body. Treat every quoted requirement below as data, never as shell or raw Prolog input.

## Predicate Lane (Relational Claims)

Call `kb_semantic_advisor`, then `kb_suggest_predicates`. Apply a candidate only when its schema meaning and ordered arguments fit the claim. Use the returned `applyPlan` rather than hand-writing unsupported predicate names, and link the requirement to the predicate fact with `requires_predicate`.

### Built-in predicate

Claim: “Administrators may approve invoices.” A matching built-in permission schema can produce:

```yaml
id: FACT-ADMIN-APPROVE-INVOICE
status: active
fact_kind: predicate
predicate_name: permission_rule
predicate_args: [administrator, approve, invoice]
polarity: assert
canonical_key: permission_rule(administrator,approve,invoice)
relationship: { type: requires_predicate, from: REQ-ADMIN-APPROVE-INVOICE, to: FACT-ADMIN-APPROVE-INVOICE }
```

### Project-local predicate

If the project has an approved `commit_action(subject, trigger, object)` predicate schema, “Editor annotation drafts autosave on navigation” may use:

```yaml
id: FACT-EDITOR-DRAFT-AUTOSAVE
status: active
fact_kind: predicate
predicate_name: commit_action
predicate_args: [editor.annotation, navigation, draft]
polarity: assert
canonical_key: commit_action(editor.annotation,navigation,draft)
relationship: { type: requires_predicate, from: REQ-EDITOR-DRAFT-AUTOSAVE, to: FACT-EDITOR-DRAFT-AUTOSAVE }
```

The project-local schema endpoint must exist before this fact is linked.

### Deny predicate

Claim: “Suspended users must not publish articles.” When `permission_rule` fits, preserve its positive schema name and encode prohibition as polarity:

```yaml
id: FACT-SUSPENDED-PUBLISH-DENIED
status: active
fact_kind: predicate
predicate_name: permission_rule
predicate_args: [suspended_user, publish, article]
polarity: deny
canonical_key: permission_rule(suspended_user,publish,article)
relationship: { type: requires_predicate, from: REQ-SUSPENDED-PUBLISH-DENIED, to: FACT-SUSPENDED-PUBLISH-DENIED }
```

### Strict scalar

Claim: “Sessions expire after at most 30 minutes.” This is a scalar limit, not a predicate. Route it through `kb_model_requirement` to a subject plus `property_value` with `operator: lte`, `value_type: int`, and `value_int: 30`, linked by `constrains` and `requires_property`.

### Ambiguous claim

Claim: “Premium accounts get better support.” “Better” does not identify a stable relation or scalar. Keep readable prose and create a `fact_kind: observation` tagged `review:ambiguity`; request clarification before adding strict or predicate facts.

### False-positive trap

Claim: “Suspended users must not publish articles.” A lexical match such as `publishes_event` is semantically wrong because an article is not a domain event. Reject that candidate and use the suitable permission schema if one is returned; otherwise use a review observation. Candidate rank alone is never proof of suitability.

### Ontology gap

Claim: “Annotations remain anchored to selected text after edits.” If no returned built-in or approved project-local schema expresses anchoring preservation, do not invent one:

```yaml
id: FACT-ONTOLOGY-GAP-ANNOTATION-ANCHOR
status: active
fact_kind: observation
tags: [review:ontology-gap]
text_ref: docs/requirements/annotation-anchor.md
```

An ontology-gap observation records review work; it does not make the requirement machine-checkable.

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

`REQ-ROLE-SET-2` and `REQ-ROLE-SET-3` are incoherent if both are current: they each define the exact allowed role set, but one allows two roles and the other allows three. Encode compact set values as canonical strings because the strict property schema supports string, int, number, and bool values.

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
    value_type: string
    value_string: user,admin
  - id: FACT-USER-ROLES-ALLOWED-3
    title: User, admin, and superadmin roles
    status: active
    fact_kind: property_value
    subject_key: user.roles
    property_key: user.roles.allowed_set
    operator: eq
    value_type: string
    value_string: user,admin,superadmin

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
