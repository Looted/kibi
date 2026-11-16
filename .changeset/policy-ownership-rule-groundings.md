---
"kibi-cli": patch
---

Check policy ownership and marker rules, such as those of `kibi-plugin-ui`, now count a requirement grounded by a rule. A quantified claim like `ui_pattern(V1, modal_alert_dialog) :- confirmation_dialog(V1)`, linked with `requires_rule`, owns the components that implement it, and its constant head arguments name the pattern whose markers apply.

`policy-ownership` and `policy-markers` read the head of each asserted rule (assert modality, positive head) linked with `requires_rule` alongside `requires_predicate` facts. A variable in the pattern argument position names no pattern, so no marker applies through it.
