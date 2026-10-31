---
title: A maintainer proves environment, call and import claims against what kibi-plugin-treesitter reads from Go, Java, C# and Rust sources
status: active
priority: should
tags:
  - proof
  - source
  - multilingual
origin:
  kind: agent
  recorded_at: '2026-10-31T16:49:13.831Z'
id: SCEN-kibi-tree-sitter-references
type: scenario
---
Given a service with a Go server, a Java client, a C# gateway and a Rust worker whose requirements say which environment variables the Go server and the Rust worker may read, that the Java client never calls System.exit and which namespaces the C# gateway may import, when the maintainer runs kibi prove on source tests that read those references with the references reader, then the read is refused with what to install while kibi-plugin-treesitter is active for symbols only, and once kibi.reference-extractor.v1 is activated the release-qualified plugin reads the syntax trees without compiling or running the code and the claims are derived at evidence level proved. Once the Rust worker reads another variable, a re-run rejects its claim with that name.