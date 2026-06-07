% Module: kibi_sparql_client
% Explicit remote SPARQL client wrapper.

:- module(kibi_sparql_client, [
    remote_sparql_select_json/4
]).

:- use_module(library(error)).
:- use_module(library(http/json)).
:- use_module(library(semweb/sparql_client)).

remote_sparql_select_json(Endpoint, Query, Options, JsonString) :-
    validate_non_empty_atom(endpoint, Endpoint),
    validate_non_empty_atom(query, Query),
    validate_remote_endpoint(Endpoint),
    validate_select_query(Query),
    validate_sparql_options(Options, SparqlOptions),
    sparql_query(Query, Rows, [endpoint(Endpoint), variable_names(Variables)|SparqlOptions]),
    maplist(row_json(Variables), Rows, JsonRows),
    with_output_to(string(JsonString), json_write_dict(current_output, _{rows: JsonRows}, [])).

validate_non_empty_atom(Name, Value) :-
    must_be(atom, Value),
    (   Value == ''
    ->  throw(error(domain_error(non_empty_atom, Name), _))
    ;   true
    ).

validate_remote_endpoint(Endpoint) :-
    (   sub_atom(Endpoint, 0, _, _, 'http://')
    ;   sub_atom(Endpoint, 0, _, _, 'https://')
    ),
    endpoint_host(Endpoint, Host),
    \+ local_or_private_host(Host),
    !.
validate_remote_endpoint(Endpoint) :-
    (   sub_atom(Endpoint, 0, _, _, 'http://')
    ;   sub_atom(Endpoint, 0, _, _, 'https://')
    ),
    !,
    throw(error(domain_error(public_remote_endpoint, Endpoint), _)).
validate_remote_endpoint(Endpoint) :-
    throw(error(domain_error(remote_http_endpoint, Endpoint), _)).

validate_select_query(Query) :-
    normalize_space(atom(Normalized), Query),
    downcase_atom(Normalized, Lower),
    sub_atom(Lower, 0, 6, After, 'select'),
    (   After =:= 0
    ;   sub_atom(Lower, 6, 1, _, ' ')
    ;   sub_atom(Lower, 6, 1, _, '*')
    ),
    !.
validate_select_query(Query) :-
    throw(error(domain_error(sparql_select_query, Query), _)).

endpoint_host(Endpoint, Host) :-
    strip_endpoint_scheme(Endpoint, WithoutScheme),
    segment_before(WithoutScheme, '/', WithoutPath),
    segment_before(WithoutPath, '?', WithoutQuery),
    segment_before(WithoutQuery, '#', Authority),
    strip_userinfo(Authority, HostWithPort),
    strip_port(HostWithPort, Host0),
    downcase_atom(Host0, Host).

strip_endpoint_scheme(Endpoint, WithoutScheme) :-
    sub_atom(Endpoint, 0, 7, _, 'http://'),
    !,
    sub_atom(Endpoint, 7, _, 0, WithoutScheme).
strip_endpoint_scheme(Endpoint, WithoutScheme) :-
    sub_atom(Endpoint, 0, 8, _, 'https://'),
    sub_atom(Endpoint, 8, _, 0, WithoutScheme).

segment_before(Atom, Delimiter, Segment) :-
    sub_atom(Atom, Before, _, _, Delimiter),
    !,
    sub_atom(Atom, 0, Before, _, Segment).
segment_before(Atom, _Delimiter, Atom).

strip_userinfo(Authority, HostWithPort) :-
    sub_atom(Authority, _, _, After, '@'),
    !,
    sub_atom(Authority, _, After, 0, HostWithPort).
strip_userinfo(Authority, Authority).

strip_port(HostWithPort, Host) :-
    sub_atom(HostWithPort, 0, 1, _, '['),
    sub_atom(HostWithPort, 1, Length, _, ']'),
    !,
    sub_atom(HostWithPort, 1, Length, _, Host).
strip_port(HostWithPort, Host) :-
    segment_before(HostWithPort, ':', Host).

local_or_private_host(localhost).
local_or_private_host('0.0.0.0').
local_or_private_host('::1').
local_or_private_host(Host) :-
    sub_atom(Host, _, _, 0, '.localhost').
local_or_private_host(Host) :-
    sub_atom(Host, 0, _, _, '127.').
local_or_private_host(Host) :-
    sub_atom(Host, 0, _, _, '10.').
local_or_private_host(Host) :-
    sub_atom(Host, 0, _, _, '192.168.').
local_or_private_host(Host) :-
    sub_atom(Host, 0, _, _, '169.254.').
local_or_private_host(Host) :-
    sub_atom(Host, 0, _, _, 'fe80:').
local_or_private_host(Host) :-
    sub_atom(Host, 0, 2, _, Prefix),
    memberchk(Prefix, ['fc', 'fd']).
local_or_private_host(Host) :-
    sub_atom(Host, 0, _, _, '172.'),
    atomic_list_concat([_, SecondAtom|_], '.', Host),
    atom_number(SecondAtom, Second),
    Second >= 16,
    Second =< 31.

validate_sparql_options([], []).
validate_sparql_options([result_format(json)|Rest], SparqlOptions) :-
    !,
    validate_sparql_options(Rest, SparqlOptions).
validate_sparql_options([timeout(Timeout)|Rest], [timeout(Timeout)|SparqlOptions]) :-
    !,
    validate_sparql_options(Rest, SparqlOptions).
validate_sparql_options([Option|_], _) :-
    throw(error(domain_error(sparql_client_option, Option), _)).

row_json(Variables, Row, Dict) :-
    Row =.. [row|Values],
    pairs_json(Variables, Values, Pairs),
    dict_create(Dict, row, Pairs).

pairs_json([], [], []).
pairs_json([Variable|Variables], [Value|Values], [Variable-JsonValue|Pairs]) :-
    sparql_value_json(Value, JsonValue),
    pairs_json(Variables, Values, Pairs).

sparql_value_json(Value, JsonValue) :-
    atomic(Value),
    !,
    JsonValue = Value.
sparql_value_json(literal(Value), JsonValue) :-
    !,
    sparql_value_json(Value, JsonValue).
sparql_value_json(type(_Type, Value), JsonValue) :-
    !,
    sparql_value_json(Value, JsonValue).
sparql_value_json(Value, JsonValue) :-
    term_string(Value, JsonValue).
