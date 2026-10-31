---
title: A Go and Rust project installs only the grammar packs it uses
status: active
priority: should
tags:
  - plugin
  - multilingual
origin:
  kind: agent
  recorded_at: '2026-10-31T18:28:55.522Z'
id: SCEN-kibi-tree-sitter-language-packs
type: scenario
---
Given a project with Go and Rust sources and kibi-plugin-treesitter installed without its grammar packs, when the maintainer runs kibi doctor, then it names kibi-lang-go and kibi-lang-rust at the versions the plugin pins and the install line; until they are installed, symbol extraction and reference reads of those files are refused as unsupported with that line, while Python stays analyzed by the built-in grammar. Once the packs are installed, the plugin checks their versions and grammar SHA-256 against its catalog and analyzes the files.