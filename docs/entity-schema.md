# Entity Schema Documentation

This document describes the entity and relationship schema for the Kibi Knowledge Base. It covers all supported entity types, their properties, relationship types, and provides frontmatter examples for each entity and relationship.

---

## Entity Types

Kibi supports seven entity types:

| Type     | Description                                                        |
|----------|--------------------------------------------------------------------|
| req      | Software requirement specifying functionality or constraints       |
| scenario | BDD scenario describing user behavior (Given/When/Then)            |
| test     | Unit, integration, or e2e test case                                |
| adr      | Architecture Decision Record documenting technical choices         |
| flag     | Feature flag controlling functionality rollout                     |
| event    | Domain or system event published/consumed by components            |
| symbol   | Abstract code symbol (function, class, module) - language-agnostic |

---

### Common Properties (All Entities)

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier (SHA256 or explicit frontmatter)|
| title        | Yes      | string         | Short summary/name                               |
| status       | Yes      | string         | Entity status (see below for values)             |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | Provenance (file path, URL, or reference)        |
| tags[]       | No       | array[string]  | Array of tags                                    |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | Priority level (must, should, could)             |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | Array of URLs                                    |
| text_ref     | No       | string         | Pointer to Markdown/doc blob                     |

---

### Entity Type Details & Example Frontmatter

#### Requirement (`req`)

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier                                |
| title        | Yes      | string         | Requirement summary                              |
| status       | Yes      | string         | open, in_progress, closed, deprecated            |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | Provenance                                       |
| tags[]       | No       | array[string]  | Tags                                             |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | must, should, could                              |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | URLs                                             |
| text_ref     | No       | string         | Markdown/doc pointer                             |

**Example:**
```yaml
---
id: REQ-001
title: Sample requirement REQ-001
status: open
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/requirements/REQ-001
tags:
  - sample
owner: product-team
priority: medium
links: []
---
```

#### Scenario (`scenario`)

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier                                |
| title        | Yes      | string         | Scenario summary                                 |
| status       | Yes      | string         | draft, active, deprecated                        |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | Provenance                                       |
| tags[]       | No       | array[string]  | Tags                                             |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | Priority level                                   |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | URLs                                             |
| text_ref     | No       | string         | Markdown/doc pointer                             |

**Example:**
```yaml
---
id: SCEN-001
title: Sample scenario SCEN-001
status: active
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/scenarios/SCEN-001
tags:
  - sample
---
```

#### Test (`test`)

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier                                |
| title        | Yes      | string         | Test summary                                     |
| status       | Yes      | string         | passing, failing, skipped, pending               |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | Provenance                                       |
| tags[]       | No       | array[string]  | Tags                                             |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | Priority level                                   |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | URLs                                             |
| text_ref     | No       | string         | Markdown/doc pointer                             |

**Example:**
```yaml
---
id: TEST-001
title: Sample test TEST-001
status: passing
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/tests/TEST-001
tags:
  - sample
---
```

#### ADR (`adr`)

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier                                |
| title        | Yes      | string         | ADR summary                                      |
| status       | Yes      | string         | proposed, accepted, deprecated, superseded       |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | Provenance                                       |
| tags[]       | No       | array[string]  | Tags                                             |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | Priority level                                   |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | URLs                                             |
| text_ref     | No       | string         | Markdown/doc pointer                             |

**Example:**
```yaml
---
id: ADR-001
title: Sample ADR ADR-001
status: accepted
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/adrs/ADR-001
tags:
  - architecture
---
```

#### Flag (`flag`)

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier                                |
| title        | Yes      | string         | Flag summary                                     |
| status       | Yes      | string         | active, inactive, deprecated                     |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | Provenance                                       |
| tags[]       | No       | array[string]  | Tags                                             |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | Priority level                                   |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | URLs                                             |
| text_ref     | No       | string         | Markdown/doc pointer                             |

**Example:**
```yaml
---
id: FLAG-001
title: Sample flag FLAG-001
status: active
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/flags/FLAG-001
tags:
  - rollout
---
```

#### Event (`event`)

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier                                |
| title        | Yes      | string         | Event summary                                    |
| status       | Yes      | string         | active, deprecated                               |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | Provenance                                       |
| tags[]       | No       | array[string]  | Tags                                             |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | Priority level                                   |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | URLs                                             |
| text_ref     | No       | string         | Markdown/doc pointer                             |

**Example:**
```yaml
---
id: EVENT-001
title: Sample event EVENT-001
status: active
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/events/EVENT-001
tags:
  - domain
---
```

#### Symbol (`symbol`)

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier                                |
| title        | Yes      | string         | Symbol summary                                   |
| status       | Yes      | string         | active, deprecated, removed                      |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | Provenance                                       |
| tags[]       | No       | array[string]  | Tags                                             |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | Priority level                                   |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | URLs                                             |
| text_ref     | No       | string         | Markdown/doc pointer                             |

**Example:**
```yaml
---
id: SYMBOL-001
title: Sample symbol SYMBOL-001
status: active
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/symbols/SYMBOL-001
tags:
  - code
---
```

---

## Relationship Types

Kibi supports ten relationship types. Each relationship has metadata:

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| created_by   | Yes      | string         | Creator identifier                               |
| source       | Yes      | string         | Provenance                                       |
| confidence   | No       | string/number  | Optional confidence level                        |

### Relationship Table

| Relationship         | Source Entity         | Target Entity         | Description                                      |
|---------------------|----------------------|----------------------|--------------------------------------------------|
| depends_on          | req                  | req                  | Requirement depends on another requirement        |
| specified_by        | req                  | scenario             | Requirement specified by scenario                 |
| verified_by         | req                  | test                 | Requirement verified by test                      |
| implements          | symbol               | req                  | Symbol implements requirement                     |
| covered_by          | symbol               | test                 | Symbol covered by test                            |
| constrained_by      | symbol               | adr                  | Symbol constrained by ADR                         |
| affects             | adr                  | symbol/component     | ADR affects symbol/component                      |
| guards              | flag                 | symbol/event/req     | Flag guards symbol, event, or requirement         |
| publishes           | symbol               | event                | Symbol publishes event                            |
| consumes            | symbol               | event                | Symbol consumes event                             |
| relates_to          | a                    | b                    | Generic relationship (escape hatch)               |

---

### Relationship Examples

**depends_on**
```yaml
# req REQ-002 depends_on req REQ-001
relationship:
  type: depends_on
  source: REQ-002
  target: REQ-001
  created_at: 2026-02-17T13:10:00Z
  created_by: analyst
  source: https://example.com/fixtures/requirements/REQ-002
```

**specified_by**
```yaml
# req REQ-001 specified_by scenario SCEN-001
relationship:
  type: specified_by
  source: REQ-001
  target: SCEN-001
  created_at: 2026-02-17T13:15:00Z
  created_by: analyst
  source: https://example.com/fixtures/requirements/REQ-001
```

**verified_by**
```yaml
# req REQ-001 verified_by test TEST-001
relationship:
  type: verified_by
  source: REQ-001
  target: TEST-001
  created_at: 2026-02-17T13:20:00Z
  created_by: qa
  source: https://example.com/fixtures/tests/TEST-001
```

**implements**
```yaml
# symbol SYMBOL-001 implements req REQ-001
relationship:
  type: implements
  source: SYMBOL-001
  target: REQ-001
  created_at: 2026-02-17T13:25:00Z
  created_by: dev
  source: https://example.com/fixtures/symbols/SYMBOL-001
```

**covered_by**
```yaml
# symbol SYMBOL-001 covered_by test TEST-001
relationship:
  type: covered_by
  source: SYMBOL-001
  target: TEST-001
  created_at: 2026-02-17T13:30:00Z
  created_by: dev
  source: https://example.com/fixtures/tests/TEST-001
```

**constrained_by**
```yaml
# symbol SYMBOL-001 constrained_by adr ADR-001
relationship:
  type: constrained_by
  source: SYMBOL-001
  target: ADR-001
  created_at: 2026-02-17T13:35:00Z
  created_by: architect
  source: https://example.com/fixtures/adrs/ADR-001
```

**affects**
```yaml
# adr ADR-001 affects symbol SYMBOL-001
relationship:
  type: affects
  source: ADR-001
  target: SYMBOL-001
  created_at: 2026-02-17T13:40:00Z
  created_by: architect
  source: https://example.com/fixtures/adrs/ADR-001
```

**guards**
```yaml
# flag FLAG-001 guards req REQ-001
relationship:
  type: guards
  source: FLAG-001
  target: REQ-001
  created_at: 2026-02-17T13:45:00Z
  created_by: devops
  source: https://example.com/fixtures/flags/FLAG-001
```

**publishes**
```yaml
# symbol SYMBOL-001 publishes event EVENT-001
relationship:
  type: publishes
  source: SYMBOL-001
  target: EVENT-001
  created_at: 2026-02-17T13:50:00Z
  created_by: dev
  source: https://example.com/fixtures/symbols/SYMBOL-001
```

**consumes**
```yaml
# symbol SYMBOL-001 consumes event EVENT-001
relationship:
  type: consumes
  source: SYMBOL-001
  target: EVENT-001
  created_at: 2026-02-17T13:55:00Z
  created_by: dev
  source: https://example.com/fixtures/symbols/SYMBOL-001
```

**relates_to**
```yaml
# Generic relationship between any two entities
relationship:
  type: relates_to
  source: ENTITY-A
  target: ENTITY-B
  kind: custom
  created_at: 2026-02-17T14:00:00Z
  created_by: analyst
  source: https://example.com/fixtures/entities/ENTITY-A
```

---

## Notes
- All entity and relationship types are fixed in v0; extensibility is planned for future versions.
- IDs must be stable and unique (content-based SHA256 or explicit frontmatter).
- Relationship metadata supports audit and conflict resolution.
- Status values are entity-type specific (see above).

---

End of schema documentation.
