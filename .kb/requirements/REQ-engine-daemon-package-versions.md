---
title: The engine daemon never serves a client with other package versions
status: open
priority: must
tags:
  - engine
  - daemon
  - prolog
semantic_text: The engine daemon handshake must report the package versions the daemon was built from. The engine daemon must reject every request except handshake and stop from a client with other package versions. The engine client must replace a daemon with other package versions instead of reusing it. Kibi doctor must report the package versions of the live engine daemon.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c5f74a923d19597827d14c1d6fe6ea3ba0234a31133a81e4b4561fecf4ed488f
semantic_inventory:
  - claim_key: CLAIM-ECDC9151C939A0B8
    claim_text: The engine daemon handshake must report the package versions the daemon was built from
    role: normative
    span:
      start: 0
      end: 86
    status: modeled
  - claim_key: CLAIM-0A7F801E4BEB1559
    claim_text: The engine daemon must reject every request except handshake and stop from a client with other package versions
    role: exception
    span:
      start: 88
      end: 199
    status: modeled
  - claim_key: CLAIM-AE067AA00E707120
    claim_text: The engine client must replace a daemon with other package versions instead of reusing it
    role: normative
    span:
      start: 201
      end: 290
    status: modeled
  - claim_key: CLAIM-E4168DAB01A0EB66
    claim_text: Kibi doctor must report the package versions of the live engine daemon
    role: normative
    span:
      start: 292
      end: 362
    status: modeled
logic_claims:
  - CLAIM-ECDC9151C939A0B8
  - CLAIM-0A7F801E4BEB1559
  - CLAIM-AE067AA00E707120
  - CLAIM-E4168DAB01A0EB66
origin:
  kind: agent
  recorded_at: '2026-10-08T21:05:34.278Z'
id: REQ-engine-daemon-package-versions
type: req
---
The engine daemon handshake must report the package versions the daemon was built from. The engine daemon must reject every request except handshake and stop from a client with other package versions. The engine client must replace a daemon with other package versions instead of reusing it. Kibi doctor must report the package versions of the live engine daemon.

## Context

Round 8 of the external onboarding evaluation found an engine daemon started by an older kibi-cli through a git hook serving a newer MCP client without complaint: the client sent package versions only from an environment variable, the daemon compared them only when that variable was set, and the built version string reached only the SWI-Prolog child. The daemon and the client now use the built versions, and a mismatch is reconciled like a different SWI-Prolog. Requested by the project owner after the evaluation report.

## Source

> Onboarding evaluation round 8, finding K17: client and daemon use the built package versions, the client stops and replaces a daemon with other versions, and kibi doctor reports the running daemon's versions.
