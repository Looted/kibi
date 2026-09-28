---
id: FACT-SCHEMA-LOGICAL-REQUIREMENT-RULE
title: Logical requirement rule predicate schema
status: active
created_at: 2026-08-04T00:00:00.000Z
updated_at: 2026-08-04T00:00:00.000Z
source: documentation/facts/FACT-SCHEMA-LOGICAL-REQUIREMENT-RULE.md
tags:
  - lane:ontology
  - predicate-schema
  - requirements
  - prolog
fact_kind: predicate_schema
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_arity: 3
argument_names:
  - subject
  - obligation
  - outcome
argument_types:
  - entity_kind
  - constraint
  - logical_result
argument_descriptions:
  - Governed Kibi component, one of the declared component constants.
  - Canonical obligation or conflicting condition.
  - Required logical representation or validation outcome.
examples:
  - logical_requirement_rule(kibi.logic.coverage,every_atomic_clause,keyed_ground_fact)
argument_constants:
  subject:
    - kibi.audit.log
    - kibi.checks.contradictions
    - kibi.checks.core_rules
    - kibi.cli.check.staged
    - kibi.cli.doctor
    - kibi.cli.query
    - kibi.cli.startup
    - kibi.coverage.repair_plan
    - kibi.coverage.requirement
    - kibi.distribution.parity
    - kibi.engine.journal
    - kibi.engine.prolog_process
    - kibi.logic.coverage
    - kibi.mcp.tool_schema
    - kibi.migration.legacy_plan
    - kibi.modeling.predicates
    - kibi.proof.requirement
    - kibi.report.github
    - kibi.report.html
    - kibi.runtime.packaging
    - kibi.telemetry.acceptance
    - kibi.telemetry.remediation
    - kibi.testing.harness
argument_aliases:
  subject:
    audit_log_entry: kibi.audit.log
    canonical_github_pages_report: kibi.report.github
    cli_prolog_process: kibi.engine.prolog_process
    cli_startup: kibi.cli.startup
    core_validation: kibi.checks.core_rules
    distribution_parity_gate: kibi.distribution.parity
    distribution_parity_report: kibi.distribution.parity
    distribution_parity_runner: kibi.distribution.parity
    domain_contradiction_diagnostic: kibi.checks.contradictions
    kibi_doctor_command: kibi.cli.doctor
    kibi_github_report: kibi.report.github
    kibi_github_scaffold: kibi.report.github
    kibi_html_report: kibi.report.html
    kibi_query_command: kibi.cli.query
    kibi_report_workflow: kibi.report.github
    legacy_migration_planner: kibi.migration.legacy_plan
    legacy_migration_preview: kibi.migration.legacy_plan
    mcp_tool_schema: kibi.mcp.tool_schema
    predicate_suggestion: kibi.modeling.predicates
    prolog_engine_channel: kibi.engine.prolog_process
    published_kibi_runtime_package: kibi.runtime.packaging
    repair_planner: kibi.coverage.repair_plan
    requirement_coverage: kibi.coverage.requirement
    requirement_proof: kibi.proof.requirement
    requirement_repair_plan: kibi.coverage.repair_plan
    staged_validation_overlay: kibi.cli.check.staged
    telemetry_acceptance: kibi.telemetry.acceptance
    telemetry_remediation_items: kibi.telemetry.remediation
    telemetry_remediation_v1: kibi.telemetry.remediation
    usage_metrics_acceptance_gate: kibi.telemetry.acceptance
    usage_remediation_command: kibi.telemetry.remediation
type: fact
---

Defines the stable project ontology used to ground Kibi's logical-coverage requirement without turning graph relationship names into ontology predicates.
