---
title: A maintainer proves claims about a SWI-Prolog library against the predicates Kibi reads
status: active
priority: should
tags:
  - proof
  - certificate
  - prolog
origin:
  kind: agent
  recorded_at: '2026-10-31T08:34:13.280Z'
id: SCEN-kibi-multilingual-code-proofs
type: scenario
---
Given a SWI-Prolog pack whose requirements say which operators it defines, how many there are, which run statuses count as detected and which run state transitions exist, when the maintainer runs kibi prove on Prolog proof files whose contracts read operator/2 with arg 1, the detected/1 rule over status/1 and the transition/3 table, then Kibi loads the library with SWI-Prolog, reads every solution of those predicates itself and derives the claims at evidence level proved. A domain predicate that lacks an operator, a transition table with one extra transition and a detection rule that also counts survived runs are each rejected with what differs.