---
title: Native Linux CLI diagnostics preserve results and bound private metadata
status: open
priority: must
tags:
  - prolog
  - spike
  - linux
  - diagnostics
  - review:context-missing
text_ref: scripts/swipl-spike.py
semantic_text: On Linux, native CLI diagnostics must preserve the monitored command exit code and stdout and stderr. On Linux, native CLI diagnostics must observe descendants launched by background threads while sampling at most 256 processes and 256 tasks per process. Native CLI diagnostic samples must omit command arguments and environment variables. An unavailable native CLI diagnostic output must preserve a successful monitored command result and stdout and stderr.
semantic_clauses:
  - On Linux, native CLI diagnostics must preserve the monitored command exit code and stdout and stderr
  - On Linux, native CLI diagnostics must observe descendants launched by background threads while sampling at most 256 processes and 256 tasks per process
  - Native CLI diagnostic samples must omit command arguments and environment variables
  - An unavailable native CLI diagnostic output must preserve a successful monitored command result and stdout and stderr
logic_claims:
  - CLAIM-3DBAB91DDA7FD513
  - CLAIM-F0A7ABEF357F32A5
  - CLAIM-6A42D5EC74AED462
  - CLAIM-86A9DCA7DEE3EE2A
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2d01ed5580cb7dc8902d924f42f194dc0896e08bcb5033e723317ec1640ae682
semantic_inventory:
  - claim_key: CLAIM-3DBAB91DDA7FD513
    claim_text: On Linux, native CLI diagnostics must preserve the monitored command exit code and stdout and stderr
    role: normative
    span:
      start: 0
      end: 100
    status: modeled
  - claim_key: CLAIM-F0A7ABEF357F32A5
    claim_text: On Linux, native CLI diagnostics must observe descendants launched by background threads while sampling at most 256 processes and 256 tasks per process
    role: normative
    span:
      start: 102
      end: 253
    status: modeled
  - claim_key: CLAIM-6A42D5EC74AED462
    claim_text: Native CLI diagnostic samples must omit command arguments and environment variables
    role: normative
    span:
      start: 255
      end: 338
    status: modeled
  - claim_key: CLAIM-86A9DCA7DEE3EE2A
    claim_text: An unavailable native CLI diagnostic output must preserve a successful monitored command result and stdout and stderr
    role: normative
    span:
      start: 340
      end: 457
    status: modeled
id: REQ-native-cli-suite-diagnostics
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
On Linux, native CLI diagnostics must preserve the monitored command exit code and stdout and stderr. On Linux, native CLI diagnostics must observe descendants launched by background threads while sampling at most 256 processes and 256 tasks per process. Native CLI diagnostic samples must omit command arguments and environment variables. An unavailable native CLI diagnostic output must preserve a successful monitored command result and stdout and stderr.
