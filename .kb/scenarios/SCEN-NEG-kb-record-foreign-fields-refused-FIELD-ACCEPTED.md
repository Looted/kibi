---
title: A kb_record that accepts a modeling field is refused
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T06:42:52.461Z'
id: SCEN-NEG-kb-record-foreign-fields-refused-FIELD-ACCEPTED
type: scenario
---
Given a kb_record that accepts a field other than its own, such as facts, when it is checked, then it is refused: kb_record must refuse every input field other than its own.
