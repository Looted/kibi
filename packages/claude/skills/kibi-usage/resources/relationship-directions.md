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
| `restates` | req -> req | Requirement intentionally restates another current requirement (for example a product requirement echoed in a platform requirement); suppresses `domain-redundancy` for that pair without retiring either side |
| `covered_by` | symbol -> test | Production symbol has test coverage evidence |

## Valid Payload Examples

### implements
```yaml
relationships:
  - type: implements
    from: SYM-operation-execute-check
    to: REQ-cli-check
```

### specified_by
```yaml
relationships:
  - type: specified_by
    from: REQ-mcp-search-discovery
    to: SCEN-mcp-search-discovery
```

### verified_by
```yaml
relationships:
  - type: verified_by
    from: REQ-mcp-search-discovery
    to: TEST-mcp-search-discovery
```

### validates
```yaml
relationships:
  - type: validates
    from: TEST-mcp-search-discovery
    to: SCEN-mcp-search-discovery
```

### executable_for
```yaml
relationships:
  - type: executable_for
    from: SYM-test-login
    to: TEST-mcp-search-discovery
```

### constrains
```yaml
relationships:
  - type: constrains
    from: REQ-cli-check
    to: FACT-SUBJECT-KIBI-CHECK
```

### requires_property
```yaml
relationships:
  - type: requires_property
    from: REQ-cli-check
    to: FACT-PROP-CHECK-FAILURE-EXIT-CODE
```

### supersedes
```yaml
relationships:
  - type: supersedes
    from: REQ-opencode-kibi-briefing-v2
    to: REQ-opencode-kibi-briefing-v1
```

A `-v2` suffix is acceptable only for a direct superseding replacement like
this one; otherwise name the new requirement by the behavior it governs.

### restates
```yaml
# Illustrative: a product requirement echoes a platform requirement verbatim.
relationships:
  - type: restates
    from: REQ-billing-invoice-retention
    to: REQ-platform-record-retention
```

Use `restates` only when two current requirements deliberately ground the same
logical term (same predicate, property tuple, or rule semantic key). It keeps
both requirements current and tells `domain-redundancy` the duplication is
intentional. If one requirement replaces the other, use `supersedes` instead.

### covered_by
```yaml
relationships:
  - type: covered_by
    from: SYM-operation-execute-check
    to: TEST-mcp-search-discovery
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
