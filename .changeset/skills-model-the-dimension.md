---
"kibi-runtime": minor
"kibi-cli": minor
"kibi-codex": minor
"kibi-claude": minor
"kibi-cursor": minor
"kibi-zcode": minor
---

The kibi-usage skill (2.35.0) now teaches agents to model the dimension of a quantified claim instead of its verdict. A claim that says every, each, all, at most, exactly, a role, a status or a count is grounded on an integer count or bound, a set or a typed rule over a variable, not on `= true`, so Kibi has something that can vary. The skill tells agents to act on the advisor's unrepresented quantifier or numeric cue, and to try an integer count with `kb_model` (`mode: "requirement"`) before settling for an ontology gap.

Requirements are now specified by scenarios that carry their inputs. Each scenario sets `expects` and assumes its own `property_value` fact on the grounding's subject and property: a success scenario with an allowed value, at least one rejection or error scenario with a forbidden value, and zero, one and many cases for quantified claims. The skill states that an assumed forbidden value is linked only from the scenario and does not contradict the requirement.

SkillOpt gains two quantified-claim cases in the rule-lane-modeling family, scored on a non-boolean grounding and on rejection and success scenarios that assume their inputs.
