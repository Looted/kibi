---
"kibi-core": patch
---

Fix the Prolog remote SPARQL client (`remote_sparql_select_json/4`): it failed on every query that reached the endpoint, because it treated the one row `sparql_query/3` returns per answer as a list of rows. It now returns every row, with unbound variables as `null` and language-tagged literals as their text. Queries whose PREFIX or BASE declarations sit on their own lines are accepted again (normalizing the whole query first had joined them to the SELECT line), bracketed IPv6 loopback and unique-local endpoints such as `http://[::1]:3030/` are refused like other local hosts, and public host names that start with `fc` or `fd` (such as `fdic.gov`) are no longer mistaken for private IPv6 addresses.
