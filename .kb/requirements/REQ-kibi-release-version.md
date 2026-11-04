---
title: Every Kibi release has one release version and a manifest of its packages
status: open
priority: must
tags:
  - release
  - versioning
  - doctor
semantic_text: Every Kibi release must have one release version of the form YYYY.M.N. The kibi-core package must ship a release manifest that lists the version of every publishable Kibi package in the release and the KB schema, operation protocol and plugin API versions of the release. The kibi --version command must print the release version next to the kibi-cli version. Kibi doctor must warn when an installed Kibi package has a version other than the version its release lists.
logic_claims:
  - CLAIM-0E6C6FF79086369F
  - CLAIM-45360A0AE6CDB83C
  - CLAIM-19E4636BA27FFC5F
  - CLAIM-0A2FEF2046303DC2
origin:
  kind: agent
  recorded_at: '2026-11-04T05:40:00.000Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ddb180fea3b7db532aedb028fb24047c6076a6ad33a69e06788079f2ac4efcd6
semantic_inventory:
  - claim_key: CLAIM-0E6C6FF79086369F
    claim_text: Every Kibi release must have one release version of the form YYYY.M.N
    role: normative
    status: modeled
    span:
      start: 0
      end: 69
  - claim_key: CLAIM-45360A0AE6CDB83C
    claim_text: The kibi-core package must ship a release manifest that lists the version of every publishable Kibi package in the release and the KB schema, operation protocol and plugin API versions of the release
    role: normative
    status: modeled
    span:
      start: 71
      end: 270
  - claim_key: CLAIM-19E4636BA27FFC5F
    claim_text: The kibi --version command must print the release version next to the kibi-cli version
    role: normative
    status: modeled
    span:
      start: 272
      end: 358
  - claim_key: CLAIM-0A2FEF2046303DC2
    claim_text: Kibi doctor must warn when an installed Kibi package has a version other than the version its release lists
    role: normative
    status: modeled
    span:
      start: 360
      end: 467
id: REQ-kibi-release-version
type: req
required_evidence: tested
---
Every Kibi release must have one release version of the form YYYY.M.N. The kibi-core package must ship a release manifest that lists the version of every publishable Kibi package in the release and the KB schema, operation protocol and plugin API versions of the release. The kibi --version command must print the release version next to the kibi-cli version. Kibi doctor must warn when an installed Kibi package has a version other than the version its release lists.

## Context

Each Kibi package carries its own semantic version, so nothing said which kibi-cli, kibi-mcp and kibi-core versions were released together, and backward-compatibility work had no single version to key off. The maintainer asked for semver practices that fit a multi-package project and approved one calendar release version per release, backed by a manifest of exact package versions, plus explicit compatibility versions (KB schema, operation protocol, plugin API). The maintainer chose not to lock cli, mcp, core and runtime to one shared package version, because the release version already names the set.

## Source

Maintainer request, 2026-11-04:

> In case of versioning, we're doing a basic semver. This however makes it difficult to figure out which packages come with with. There is no single kibi version. I was thinking about doing backwards compatibility feature and the versioning makes it harder. Are there any other semver practices that would work for us?

The maintainer approved the release-version, manifest and compatibility-version design ("Yes, please.") and declined a shared package version for cli, mcp, core and runtime ("No, the release version covers it").