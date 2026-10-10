---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

`kb_model` (`mode: "predicates"`) now recognises everyday permission statements. "Suspended users must not publish articles." — the kibi-usage skill's own deny example — returns an applicable `permission_rule` candidate instead of an ontology-gap observation, and so do claims such as "Only editors may approve drafts.". Subject and actor keys derived from plurals are spelled correctly: "coaches" becomes `coach` (not `coache`), "policies" becomes `policy`, and singular words such as "access" or "analysis" keep their final "s".

Technical summary: the `permission_rule` applicability gate keeps its action-cue list and also accepts a common action verb (publish, approve, assign, view, edit, create, submit, share, complete and similar) when it directly follows the permission modal (`may`, `can`, `cannot`, `must not`, `is allowed to`, …), so a quota such as "Uploads must not exceed 10 MB." still does not read as a permission. Both `singularize` helpers (predicate modeling and the semantic advisor) now share `singularizeToken`: `-ches`/`-shes`/`-sses`/`-xes` drop "es", `-ies` becomes "y", and tokens ending in "ss", "us" or "is" are kept; each helper keeps its existing exceptions. kibi-usage 2.13.0 shows the four-argument `permission_rule(suspended_user,publish,articles,deny)` fact that `kb_model` plans for the fact-lanes deny example.
