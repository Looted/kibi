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
    % sparql_query/3 yields one row(...) per solution, and its variable
    % names come as a v(...) term.
    findall(JsonRow,
        (   sparql_query(Query, Row, [endpoint(Endpoint), variable_names(Names)|SparqlOptions]),
            row_json(Names, Row, JsonRow)
        ),
        JsonRows),
    with_output_to(string(JsonString), json_write_dict(current_output, _{rows: JsonRows}, [])).

validate_non_empty_atom(Name, Value) :-
    must_be(atom, Value),
    (   Value == ''
    ->  throw(error(domain_error(non_empty_atom, Name), _))
    ;   true
    ).

validate_remote_endpoint(Endpoint) :-
    (   strip_endpoint_scheme(Endpoint, WithoutScheme)
    ->  endpoint_host(WithoutScheme, Host),
        (   local_or_private_host(Host)
        ->  throw(error(domain_error(public_remote_endpoint, Endpoint), _))
        ;   true
        )
    ;   throw(error(domain_error(remote_http_endpoint, Endpoint), _))
    ).

% The query must be a SELECT once PREFIX and BASE lines are skipped.
validate_select_query(Query) :-
    split_string(Query, "\n", "", RawLines),
    strip_sparql_prelude(RawLines, RemainingLines),
    atomic_list_concat(RemainingLines, ' ', Remainder),
    downcase_atom(Remainder, Lower),
    sub_atom(Lower, 0, 6, After, 'select'),
    (   After =:= 0
    ;   sub_atom(Lower, 6, 1, _, Next),
        memberchk(Next, [' ', '*'])
    ),
    !.
validate_select_query(Query) :-
    throw(error(domain_error(sparql_select_query, Query), _)).

% A query of prelude lines alone has no SELECT to find: on it,
% strip_sparql_prelude/2 fails.
strip_sparql_prelude([Line | Rest], Result) :-
    normalize_space(atom(Trimmed), Line),
    (   (   Trimmed == ''
        ;   is_prelude_line(Trimmed)
        )
    ->  strip_sparql_prelude(Rest, Result)
    ;   Result = [Trimmed | Rest]
    ).

% Line is space-normalized, so its first word ends at the first space.
is_prelude_line(Line) :-
    downcase_atom(Line, Lower),
    atomic_list_concat([FirstToken | _], ' ', Lower),
    memberchk(FirstToken, [prefix, base]).

endpoint_host(WithoutScheme, Host) :-
    segment_before(WithoutScheme, '/', WithoutPath),
    segment_before(WithoutPath, '?', WithoutQuery),
    segment_before(WithoutQuery, '#', Authority),
    strip_userinfo(Authority, HostWithPort),
    strip_port(HostWithPort, Host0),
    downcase_atom(Host0, Host).

strip_endpoint_scheme(Endpoint, WithoutScheme) :-
    member(Scheme, ['http://', 'https://']),
    atom_concat(Scheme, WithoutScheme, Endpoint).

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

% A bracketed IPv6 literal ([::1]:8080) keeps its colons.
strip_port(HostWithPort, Host) :-
    atom_concat('[', Rest, HostWithPort),
    !,
    segment_before(Rest, ']', Host).
strip_port(HostWithPort, Host) :-
    segment_before(HostWithPort, ':', Host).

local_or_private_host(Host) :-
    (   memberchk(Host, [localhost, '0.0.0.0', '::1'])
    ;   sub_atom(Host, _, _, 0, '.localhost')
    ;   member(Prefix, ['127.', '10.', '192.168.', '169.254.', 'fe80:']),
        sub_atom(Host, 0, _, _, Prefix)
    ;   % Unique local IPv6 (fc00::/7); only an IPv6 literal contains a
        % colon, so host names such as fdic.gov stay public.
        sub_atom(Host, 0, 2, _, Prefix),
        memberchk(Prefix, [fc, fd]),
        sub_atom(Host, _, _, _, ':')
    ;   atomic_list_concat(['172', SecondAtom|_], '.', Host),
        atom_number(SecondAtom, Second),
        Second >= 16,
        Second =< 31
    ).

validate_sparql_options([], []).
validate_sparql_options([result_format(json)|Rest], SparqlOptions) :-
    !,
    validate_sparql_options(Rest, SparqlOptions).
validate_sparql_options([timeout(Timeout)|Rest], [timeout(Timeout)|SparqlOptions]) :-
    !,
    validate_sparql_options(Rest, SparqlOptions).
validate_sparql_options([Option|_], _) :-
    throw(error(domain_error(sparql_client_option, Option), _)).

row_json(Names, Row, Dict) :-
    Names =.. [_|Variables],
    Row =.. [row|Values],
    pairs_json(Variables, Values, Pairs),
    dict_create(Dict, row, Pairs).

pairs_json([], [], []).
pairs_json([Variable|Variables], [Value|Values], [Variable-JsonValue|Pairs]) :-
    sparql_value_json(Value, JsonValue),
    pairs_json(Variables, Values, Pairs).

% sparql_query/3 binds a variable a row leaves unbound to '$null$'.
sparql_value_json('$null$', null) :-
    !.
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
sparql_value_json(lang(_Lang, Value), JsonValue) :-
    !,
    sparql_value_json(Value, JsonValue).
sparql_value_json(Value, JsonValue) :-
    term_string(Value, JsonValue).
