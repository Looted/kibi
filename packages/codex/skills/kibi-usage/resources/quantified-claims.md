# Quantified claims: model the dimension

When a claim says every, each, all, any, only, at least, at most, exactly, a
role, a status or a count, ground it on what varies, never on `= true`: an int
count or bound (`role_count eq 1`, `uninstrumented_loaded_files eq 0`), a set,
or a typed rule with a `forall` variable. Keep `value_type: bool` for genuinely
binary properties (a flag is on). A `shadow_analysis` cue from `kb_model`
(`mode: "analyze"`) with `kind: quantifier` or `numeric` and `represented:
false` means the planned grounding hides the dimension. When
`mode: "predicates"` finds no schema for such a claim, do not stop at the
ontology-gap observation: call `kb_model` with `mode: "requirement"` and an
int `subjectKey`/`propertyKey`/`operator`/`value` for the count, and keep the
gap only when no count, set or rule expresses the claim.

Specify the requirement with scenarios that carry their inputs. Each scenario
sets `expects` and `assumes` its own `property_value` fact: same `subject_key`
and `property_key` as the grounding, with the scenario's value. These
assumed-value facts are linked only by the scenario's `assumes`, never by the
requirement, so a forbidden value does not contradict the grounding; it is
what makes the scenario a rejection. Write at least:

- a success scenario assuming an allowed value (`expects: success`);
- a rejection scenario assuming a forbidden value (`expects: rejection`, or
  `error`); a scenario that only describes the refusal in prose, without
  `expects` and `assumes`, does not count;
- for a quantified claim, cases at zero, one and many when they differ.

```json
{"type":"fact","id":"FACT-member-role-count-2","properties":{"title":"Member holds two roles","status":"active","fact_kind":"property_value","subject_key":"organization.member","property_key":"role_count","operator":"eq","value_type":"int","value_int":2}}
{"type":"scenario","id":"SCEN-member-two-roles-rejected","properties":{"title":"A member with two roles is rejected","status":"active","expects":"rejection"},"relationships":[{"type":"assumes","from":"SCEN-member-two-roles-rejected","to":"FACT-member-role-count-2"}]}
```

Then send `specified_by` to every scenario in the requirement's write.
Details: `resources/fact-lanes.md`, Model the Dimension, Not the Verdict.
