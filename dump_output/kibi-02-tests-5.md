# Pack: kibi-02-tests (Part 5)


This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where security check has been disabled.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Security check has been disabled - content may contain sensitive information
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
test/
  fixtures/
    events/
      EVT-001.md
      EVT-002.md
    flags/
      FLAG-001.md
    requirements/
      REQ-001.md
      REQ-002.md
    scenarios/
      SCEN-001.md
      SCEN-002.md
    tests/
      TEST-001.md
      TEST-002.md
    flag-example.md
    req-example.md
    scenario-example.md
    symbol-example.md
    symbols-manifest.yaml
    symbols.yaml
    test-example.md
tests/
  test1.md
```

# Files

## File: test/fixtures/events/EVT-001.md
```markdown
---
id: EVT-001
title: Sample event EVT-001
status: recorded
created_at: 2026-02-17T13:30:00Z
updated_at: 2026-02-17T13:30:00Z
source: https://example.com/fixtures/events/EVT-001
tags:
  - sample
owner: backend
priority: low
links:
  - TEST-001
---

Payload: { sample: true }
```

## File: test/fixtures/events/EVT-002.md
```markdown
---
id: EVT-002
title: Sample event EVT-002
status: recorded
created_at: 2026-02-17T13:32:00Z
updated_at: 2026-02-17T13:32:00Z
source: https://example.com/fixtures/events/EVT-002
tags:
  - sample
owner: backend
priority: low
links:
  - TEST-002
---

Payload: { sample: false }
```

## File: test/fixtures/flags/FLAG-001.md
```markdown
---
id: FLAG-001
title: Sample flag FLAG-001
status: disabled
created_at: 2026-02-17T13:25:00Z
updated_at: 2026-02-17T13:25:00Z
source: https://example.com/fixtures/flags/FLAG-001
tags:
  - sample
owner: infra
priority: low
links:
  - REQ-001
---

Description: Feature flag used in tests.
```

## File: test/fixtures/requirements/REQ-001.md
```markdown
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

Placeholder: This is a sample requirement used for tests.
```

## File: test/fixtures/requirements/REQ-002.md
```markdown
---
id: REQ-002
title: Sample requirement REQ-002 with dependency
status: open
created_at: 2026-02-17T13:05:00Z
updated_at: 2026-02-17T13:05:00Z
source: https://example.com/fixtures/requirements/REQ-002
tags:
  - sample
owner: product-team
priority: low
links:
  - REQ-001
---

Placeholder: Requirement depending on REQ-001.
```

## File: test/fixtures/scenarios/SCEN-001.md
```markdown
---
id: SCEN-001
title: Sample scenario SCEN-001
status: draft
created_at: 2026-02-17T13:10:00Z
updated_at: 2026-02-17T13:10:00Z
source: https://example.com/fixtures/scenarios/SCEN-001
tags:
  - sample
owner: ux
priority: medium
links:
  - REQ-001
---

Steps:
1. Do something
2. Verify outcome
```

## File: test/fixtures/scenarios/SCEN-002.md
```markdown
---
id: SCEN-002
title: Sample scenario SCEN-002 linked to REQ-002
status: draft
created_at: 2026-02-17T13:12:00Z
updated_at: 2026-02-17T13:12:00Z
source: https://example.com/fixtures/scenarios/SCEN-002
tags:
  - sample
owner: ux
priority: low
links:
  - REQ-002
---

Steps:
1. Precondition
2. Action
```

## File: test/fixtures/tests/TEST-001.md
```markdown
---
id: TEST-001
title: Sample test TEST-001
status: planned
created_at: 2026-02-17T13:15:00Z
updated_at: 2026-02-17T13:15:00Z
source: https://example.com/fixtures/tests/TEST-001
tags:
  - sample
owner: qa
priority: high
links:
  - SCEN-001
---

Test cases:
- sample assertion
```

## File: test/fixtures/tests/TEST-002.md
```markdown
---
id: TEST-002
title: Sample test TEST-002 linked to REQ-002
status: planned
created_at: 2026-02-17T13:17:00Z
updated_at: 2026-02-17T13:17:00Z
source: https://example.com/fixtures/tests/TEST-002
tags:
  - sample
owner: qa
priority: low
links:
  - SCEN-002
---

Test cases:
- sample assertion 2
```

## File: test/fixtures/flag-example.md
```markdown
---
id: flag-001
title: Password reset feature flag
status: enabled
created_at: 2026-02-17T12:20:00Z
updated_at: 2026-02-17T12:20:00Z
source: https://example.com/flags/reset-password
tags:
  - feature
owner: infra
priority: low
links:
  - req-001
---

Description: Toggle to enable/disable password reset flows during deploys.
```

## File: test/fixtures/req-example.md
```markdown
---
id: req-001
title: User can reset password
status: open
created_at: 2026-02-17T12:00:00Z
updated_at: 2026-02-17T12:00:00Z
source: https://example.com/requirements/req-001
tags:
  - auth
  - ux
owner: product-team
priority: high
severity: minor
links:
  - req-000
text_ref: https://example.com/docs/reset-password
---

Description: Users must be able to reset their password when they forget it. Flow includes email verification and temporary token expiry.
```

## File: test/fixtures/scenario-example.md
```markdown
---
id: scenario-001
title: Reset password happy path
status: draft
created_at: 2026-02-17T12:05:00Z
updated_at: 2026-02-17T12:05:00Z
source: https://example.com/scenarios/reset-password
tags:
  - auth
owner: ux-lead
priority: medium
links:
  - req-001
---

Steps:
1. User clicks "Forgot password"
2. User enters registered email
3. User clicks link in email and sets new password
```

## File: test/fixtures/symbol-example.md
```markdown
---
id: symbol-io-logger
title: IO logger
status: defined
created_at: 2026-02-17T12:30:00Z
updated_at: 2026-02-17T12:30:00Z
source: https://example.com/symbols/io-logger
tags:
  - logging
owner: libs-team
priority: medium
links:
  - req-001
---

Definition: A reusable logging component that publishes "log.created" events.
```

## File: test/fixtures/symbols-manifest.yaml
```yaml
symbols:
  - id: symbol-io-logger
    title: IO logger
    source: https://example.com/symbols/io-logger
    status: defined
    tags: [logging]
```

## File: test/fixtures/symbols.yaml
```yaml
symbols:
  - id: symbol-io-logger
    title: IO logger
    source: https://example.com/symbols/io-logger
    status: defined
    tags: [logging]
  - id: symbol-auth-service
    title: Auth service
    source: https://example.com/symbols/auth-service
    status: defined
    tags: [auth]
    links: [REQ-001]
```

## File: test/fixtures/test-example.md
```markdown
---
id: test-001
title: Reset password verification
status: planned
created_at: 2026-02-17T12:10:00Z
updated_at: 2026-02-17T12:10:00Z
source: https://example.com/tests/test-001
tags:
  - auth
owner: qa-team
priority: high
links:
  - scenario-001
---

Test cases:
- Verify email is sent
- Verify token expires after 1 hour
```

## File: tests/test1.md
```markdown
---
title: Feature Test
status: passing
tags: [test]
links:
  - type: validates
    target: req1
---

# Feature Test
```


---

#### 🔙 PREVIOUS PART: [kibi-02-tests-4.md](file:kibi-02-tests-4.md)


---

# ✅ END OF ARCHIVE
