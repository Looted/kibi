---
title: An ambiguous header or Perl/Prolog file is refused a language guess and reported as ambiguous
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:04:06.697Z'
id: SCEN-NEG-multilingual-language-catalog-AMBIGUOUS-HEADER
type: scenario
---
Given an installed Kibi and a staged change with a .h header and a .pl file that carry no consistent explicit language signal, when source analysis classifies them, then neither file is assigned a provider: each is reported unsupported with language c-or-cpp or perl-or-prolog and a source_language_ambiguous diagnostic.

This is the failure side of ambiguity retention in the language catalog: an extension shared by two languages must not be resolved by guessing. documentation/tests/e2e/packed/multilingual-language-catalog.test.ts "runs offline qualified catalog, ambiguity, and exact-index ownership behavior from installed tarballs" exercises it.
