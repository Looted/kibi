---
title: A remote SPARQL query that is not a SELECT is refused before the endpoint is contacted
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:05:05.861Z'
id: SCEN-NEG-prolog-library-adoption-NON-SELECT-SPARQL
type: scenario
---
Given a packed workspace and a reachable SPARQL endpoint, when kibi sparql-remote is asked to run a DELETE query, then the command fails with an error saying the query must be a SELECT, and the endpoint receives no request.

This is the failure side of bounded library adoption: remote SPARQL stays SELECT-only, so an update query never leaves the workspace. documentation/tests/e2e/packed/prolog-library-adoption.test.ts "refuses a query that is not a SELECT before contacting the endpoint" exercises it.
