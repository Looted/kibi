---
title: Pipeline validation rejects unsafe artifacts before consumer smoke
status: active
tags:
  - prolog
  - build
  - pipeline
  - validation
id: SCEN-prolog-build-pipeline-validation
type: scenario
---
Given pinned build inputs and one of the four launch targets, when the public pipeline commands and artifact helpers validate temporary prefixes and archives, then valid metadata round-trips and corruption, unsafe extraction, incompatible native metadata, and failed smoke commands are rejected. The consumer smoke sets the extracted home and removes inherited loader overrides. These local controls validate the pipeline boundary using synthetic byte artifacts and controlled native-tool outputs; successful real platform builds and clean-runner smoke require the separate native Actions acceptance record.