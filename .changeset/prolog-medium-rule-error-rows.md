---
"kibi-core": patch
---

A rule code certificate whose predicate table holds an error row without its arguments is now rejected. Before, the check found the error, could not name the call that failed and accepted the certificate.
