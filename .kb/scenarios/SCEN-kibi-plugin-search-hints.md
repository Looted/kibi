---
title: kibi-plugin-search-hints matches reworded questions offline and is offered to large KBs
status: active
tags:
  - search
  - plugins
origin:
  kind: agent
  recorded_at: '2026-10-29T19:18:47.256Z'
id: SCEN-kibi-plugin-search-hints
type: scenario
---
Given kibi-plugin-search-hints is installed, when it receives a question and the current entities, then it tokenizes them exactly as the upstream tokenizer does, embeds them with the bundled potion-base-8M table without network access, and returns the closest entities by cosine similarity, reusing cached vectors whose content is unchanged. Given a KB with 50 or more requirement documents, when bootstrap plans, then it offers the plugin in replace mode unless the project activated or declined it.
