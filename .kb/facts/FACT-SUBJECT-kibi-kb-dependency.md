---
title: Kibi KB dependency
status: active
fact_kind: subject
subject_key: kibi.kb_dependency
canonical_key: kibi.kb_dependency
text_ref: REQ-kb-dependency-untrusted-input
tags:
  - lane:strict
  - dependencies
origin:
  kind: agent
  recorded_at: '2026-11-12T14:39:50.387Z'
id: FACT-SUBJECT-kibi-kb-dependency
type: fact
---

A KB dependency: another project's knowledge base a project imports by git URL and ref. Kibi refuses values that could run code, such as a URL or ref starting with a hyphen, and never loads plugins or env files the checkout declares. It is read-only knowledge, not a package dependency.
