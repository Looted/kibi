# Relationship Directions

## Direction Table

| Relationship | Source -> Target | Semantic Meaning |
|-------------|------------------|------------------|
| `implements` | symbol -> req | Production code symbol owns or implements requirement behavior |
| `specified_by` | req -> scenario | Requirement is specified by a BDD scenario |
| `verified_by` | req/scenario -> test | Requirement or scenario is verified by a test case |
| `validates` | test -> req/scenario | Test validates a requirement or scenario (inverse of verified_by) |
| `executable_for` | symbol -> test | Test symbol (code) is executable code for a test entity |
| `constrains` | req -> fact(subject) | Requirement constrains a strict-lane domain fact |
| `requires_property` | req -> fact(property_value) | Requirement requires a specific property value fact |
| `supersedes` | new-req -> old-req | New requirement formally replaces an old requirement |
| `covered_by` | symbol -> test | Production symbol has test coverage evidence |

## Valid Payload Examples

### implements
```yaml
relationships:
  - type: implements
    from: SYM-001
    to: REQ-001
```

### specified_by
```yaml
relationships:
  - type: specified_by
    from: REQ-001
    to: SCEN-001
```

### verified_by
```yaml
relationships:
  - type: verified_by
    from: REQ-001
    to: TEST-001
```

### validates
```yaml
relationships:
  - type: validates
    from: TEST-001
    to: SCEN-001
```

### executable_for
```yaml
relationships:
  - type: executable_for
    from: SYM-test-login
    to: TEST-001
```

### constrains
```yaml
relationships:
  - type: constrains
    from: REQ-019
    to: FACT-USER-ROLE
```

### requires_property
```yaml
relationships:
  - type: requires_property
    from: REQ-019
    to: FACT-LIMIT-3
```

### supersedes
```yaml
relationships:
  - type: supersedes
    from: REQ-001-v2
    to: REQ-001
```

### covered_by
```yaml
relationships:
  - type: covered_by
    from: SYM-handler
    to: TEST-005
```

## Invalid Test-Fact Shortcuts

Do not model small behavior fixes as direct test-fact pairs. Facts describe invariants; requirements or scenarios are verified by tests.

```yaml
# WRONG: fact -> test is not a valid verified_by shape
relationships:
  - type: verified_by
    from: FACT-HEADER-AVATAR-INITIAL-UPPERCASE
    to: TEST-AVATAR-HEADER-FALLBACK

# WRONG: test -> fact is not a valid validates shape
relationships:
  - type: validates
    from: TEST-AVATAR-HEADER-FALLBACK
    to: FACT-HEADER-AVATAR-INITIAL-UPPERCASE
```

Use a requirement as the verification target/source, then link that requirement to strict facts:

```yaml
relationships:
  - type: verified_by
    from: REQ-HEADER-AVATAR-INITIAL-UPPERCASE
    to: TEST-AVATAR-HEADER-FALLBACK
  - type: requires_property
    from: REQ-HEADER-AVATAR-INITIAL-UPPERCASE
    to: FACT-HEADER-AVATAR-INITIAL-UPPERCASE
```
