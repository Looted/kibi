---
title: Provider setting source
status: active
tags:
  - ontology
  - plugins
  - configuration
fact_kind: predicate_schema
predicate_name: provider_setting_source
predicate_namespace: kibi.capability
predicate_arity: 3
argument_names:
  - setting
  - source
  - precedence
argument_types:
  - setting
  - config_source
  - precedence
argument_descriptions:
  - The provider setting being configured.
  - The source that supplies the setting.
  - The precedence or exclusion policy for that source.
aliases:
  - provider setting source
  - environment secret
  - programmatic option override
examples:
  - provider_setting_source(typesafe_api_key,process_environment,repository_plugin_config_forbidden)
id: FACT-SCHEMA-PROVIDER-SETTING-SOURCE
type: fact
---
Defines where a provider setting or secret comes from and which source wins. Reuse for environment variables, programmatic constructor options, and the rule that secrets stay outside repository plugin configuration.
