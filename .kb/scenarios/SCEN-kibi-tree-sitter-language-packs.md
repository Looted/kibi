---
title: A Go and Rust project installs only the grammar packs it uses
status: active
priority: should
tags:
  - plugin
  - multilingual
origin:
  kind: agent
  recorded_at: '2026-11-01T16:04:43.311Z'
id: SCEN-kibi-tree-sitter-language-packs
type: scenario
---
Given a project with Go and Rust sources and kibi-plugin-treesitter installed without its grammar packs, when the maintainer runs kibi doctor, then it names kibi-lang-go and kibi-lang-rust at the versions the plugin pins and the install line; until they are installed, symbol extraction and reference reads of those files are refused as unsupported with that line, and Python files are refused the same way until kibi-lang-python is installed. Once the packs are installed, the plugin checks their versions and grammar SHA-256 against its catalog and analyzes the files. In a grammar repository whose bindings tree-sitter generated (linguist-generated in .gitattributes, or a @generated header), kibi doctor asks only for the packs of hand-written sources and of generated files the KB references, counts the generated files it skipped, and never asks for a pack listed in package.json kibi.declinedLanguagePacks; a staged change to a declined-language or generated file without its pack gets a whole-file review instead of the missing-pack block.