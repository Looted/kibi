---
title: Agent bootstraps from interviewed knowledge sources with cited claims
status: active
tags:
  - bootstrap
  - knowledge-sources
id: SCEN-kibi-bootstrap-knowledge-sources
type: scenario
---
# Agent bootstraps from interviewed knowledge sources

Given a thin attached repository whose code alone does not explain product intent,
when the agent interviews the human, declares a Jira project as authoritative and an old wiki as stale,
and passes cited intent claims to `kb_plan_bootstrap`,
then a normative claim from the authoritative source becomes a `req` candidate whose evidence and `text_ref` cite its ticket,
prose the strict modeler cannot ground stays an authoring follow-up,
the stale source produces no candidate,
a claim citing an undeclared source is reported without blocking apply,
and editing any declared claim changes the plan hash.

When no knowledge sources were declared, a `needs_context` plan asks where product intent lives.
