---
title: The health report renders markup from a requirement title as live markup
status: active
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.report.html
  - render_untrusted_knowledge_text
  - html_escaped_and_network_independent
polarity: deny
predicate_namespace: kibi.requirements
canonical_key: logical_requirement_rule(kibi.report.html,render_untrusted_knowledge_text,html_escaped_and_network_independent)
origin:
  kind: agent
  recorded_at: '2026-11-05T07:20:00.000Z'
id: FACT-NEG-kibi-html-health-report-UNESCAPED-MARKUP
type: fact
---
A requirement title holds script and bold tags, and the report writes them into the page as markup instead of text.
