# Fact Lanes

Requirement prose remains the human-readable source. Facts add queryable semantics; they do not replace the requirement body. Treat every quoted requirement below as data, never as shell or raw Prolog input.

## Atomic Claim Coverage

Logical coverage is clause-based, not entity-based. Give `kb_semantic_advisor` the complete requirement body and verify that its `clauses` list contains every atomic obligation. Supply the `clauses` input yourself when automatic splitting would combine or omit obligations. For every normative clause:

- preserve the returned stable key as `claim_key` and the exact clause as `claim_text` on its ground fact;
- add the key to the requirement `logic_claims` manifest without removing existing keys;
- link it through exactly one `requires_property` for `property_value`, one `requires_predicate` for `predicate`, or one `requires_rule` for a safe `rule` fact;
- leave ambiguity and ontology gaps visibly unresolved—observations do not satisfy `logic-coverage`.

Use the advisor-returned atomic inventory as the identity boundary. Trailing punctuation and copied conjunction commas are formatting, not new claims. `logic-coverage` rejects one claim grounded by multiple facts and distinct claim keys that resolve to the same ground logical term.

Example compound prose: “Checkout requires payment authorization before order submission, and customer data must be retained for 7 years.” This is two claims, not one. The first becomes `dependency_rule(checkout,payment_authorization,order_submission)`; the second becomes a strict retention property. Both fact records carry different advisor-issued claim keys, and both keys appear in the requirement manifest. A single `requires_predicate` edge is incomplete.

## Predicate Lane (Relational Claims)

Call `kb_semantic_advisor`, then `kb_suggest_predicates`. Apply a candidate only when its schema meaning and ordered arguments fit the claim. Use the returned `applyPlan` rather than hand-writing unsupported predicate names, and link the requirement to the predicate fact with `requires_predicate`.

Treat the result as a Prolog-shaped ground term, not executable source: `predicate_name(arg1,...,argN)`. The selected `predicate_schema` fixes the name, arity, argument roles, and order. Store that model through `predicate_name`, `predicate_args`, `canonical_key`, and `polarity`; never interpolate prose into raw Prolog, introduce variables, or use a graph relationship such as `verified_by` as the predicate name.

### Built-in predicate

Claim: “Checkout requires payment authorization before order submission.” The built-in `dependency_rule(subject, prerequisite, dependent)` schema produces:

```yaml
id: FACT-CHECKOUT-PAYMENT-DEPENDENCY
status: active
fact_kind: predicate
predicate_name: dependency_rule
predicate_args: [checkout, payment_authorization, order_submission]
polarity: assert
canonical_key: dependency_rule(checkout,payment_authorization,order_submission)
claim_key: <advisor-issued key for this exact clause>
claim_text: Checkout requires payment authorization before order submission.
relationship: { type: requires_predicate, from: REQ-CHECKOUT-SUBMISSION, to: FACT-CHECKOUT-PAYMENT-DEPENDENCY }
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

The project-local schema endpoint must exist before this fact is linked. When ontology extension is explicitly authorized, define it first with `fact_kind: predicate_schema`, `predicate_name`, `predicate_arity`, and equally sized `argument_names` and `argument_types`. Without an authorized stable signature, record `review:ontology-gap` instead of inventing a schema.

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
claim_key: <advisor-issued key for this exact clause>
claim_text: Suspended users must not publish articles.
relationship: { type: requires_predicate, from: REQ-SUSPENDED-PUBLISH-DENIED, to: FACT-SUSPENDED-PUBLISH-DENIED }
```

If another current requirement links an `assert` fact with the same predicate namespace, name, and ordered arguments, `domain-contradictions` reports the pair. More complex semantic conflicts require a shared canonical schema and arguments; do not assume Kibi can prove arbitrary equivalence between differently shaped predicates.

The full logical representation of a requirement is the conjunction of all of its linked ground property and predicate terms. Conditions, exceptions, permissions, and ordering constraints remain explicit arguments of their declared schemas. Contradiction detection therefore depends on equivalent prose reusing the same predicate name, argument roles, ordered canonical values, and opposing polarity rather than inventing synonymous terms.

## Typed rule lane

Use a validated `kibi.logic.v1` object for a proposition whose meaning includes a condition, exception, obligation, prohibition, permission, quantifier, cardinality bound, or bounded temporal relation. `kb_model_requirement` returns the `rule_schema` and `rule` facts plus a `requires_rule` edge. The rule stores canonical JSON and a deterministic hash; any rendered Prolog is an audit view and is never executed. Reject raw goals, function symbols, cuts, meta-calls, dynamic predicates, I/O, unsafe variables, unstratified negation, and unbounded aggregation. Keep the exact proposition in `claim_text`, its advisor key in `claim_key`, and its byte span in the semantic ledger. Run `rule-safety` and `rule-verifiability` before treating the rule as modeled.

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
