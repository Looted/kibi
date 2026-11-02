---
title: A maintainer proves environment, call and property claims against what kibi-plugin-treesitter reads from PHP, C, Bash and Terraform sources
status: active
priority: should
tags:
  - proof
  - source
  - multilingual
origin:
  kind: agent
  recorded_at: '2026-11-02T12:20:16.956Z'
id: SCEN-kibi-tree-sitter-script-references
type: scenario
---
Given a service with a PHP app, a C daemon, a Bash deploy script and a Terraform bucket whose requirements say which environment variables the PHP app and the deploy script may read, that the C daemon never calls system and which ACL values the bucket may set, when the maintainer runs kibi prove on source tests that read those references with the references reader through the release-qualified kibi-plugin-treesitter, then the plugin reads the syntax trees without running the code and the claims are derived at evidence level proved. Once the daemon calls system its claim is rejected with that name, and once an override file in the Terraform folder may replace the ACL the read is refused.
