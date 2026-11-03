:- use_module(library(plunit)).
:- use_module(library(http/thread_httpd)).
:- use_module(library(http/http_open)).
:- use_module(library(http/json)).
:- use_module('../src/sparql_client.pl').
:- use_module(test_helpers).

% Every request goes to a stub SPARQL server on a loopback port: a proxy
% hook routes every host to it, so no request leaves the machine, even one
% a broken validation lets through.

:- multifile socket:proxy_for_url/3.
:- dynamic socket:proxy_for_url/3.
:- dynamic stub_reply/2.
:- dynamic stub_request/1.
:- dynamic stub_port/1.

stub_handler(Request) :-
    assertz(stub_request(Request)),
    stub_reply(ContentType, Body),
    format("Content-type: ~w~n~n~w", [ContentType, Body]).

start_stub :-
    http_server(stub_handler, [port(Port), workers(1)]),
    assertz(stub_port(Port)),
    asserta(socket:proxy_for_url(_, _, proxy('127.0.0.1', Port))).

stop_stub :-
    retract(stub_port(Port)),
    retractall(socket:proxy_for_url(_, _, proxy('127.0.0.1', Port))),
    http_stop_server(Port, []).

with_stub(Body, Goal) :-
    retractall(stub_reply(_, _)),
    retractall(stub_request(_)),
    assertz(stub_reply('application/sparql-results+json', Body)),
    call(Goal).

% The stub answers after half a second, and then with an error.
slow_stub :-
    retractall(stub_reply(_, _)),
    assertz((stub_reply(_, _) :- sleep(0.5), fail)).

endpoint('http://sparql.example.org/sparql').


query('SELECT ?s ?n WHERE { ?s ?p ?n }').

run_select(Body, Options, Json) :-
    endpoint(Endpoint),
    query(Query),
    with_stub(Body, remote_sparql_select_json(Endpoint, Query, Options, Json)).

rejects(Endpoint, Formal) :-
    query(Query),
    catch(remote_sparql_select_json(Endpoint, Query, [], _), error(Error, _), true),
    Error == Formal.

:- begin_tests(sparql_client_rows, [setup(start_stub), cleanup(stop_stub)]).

test(rows_become_json_objects_named_by_the_query_variables) :-
    atomic_list_concat([
        '{"head":{"vars":["s","n"]},"results":{"bindings":[',
        '{"s":{"type":"uri","value":"http://ex.org/a"},"n":{"type":"literal","value":"plain"}},',
        '{"s":{"type":"uri","value":"http://ex.org/b"},"n":{"type":"literal","value":"7",',
        '"datatype":"http://www.w3.org/2001/XMLSchema#integer"}},',
        '{"s":{"type":"uri","value":"http://ex.org/c"},"n":{"type":"literal","value":"chat","xml:lang":"fr"}},',
        '{"s":{"type":"uri","value":"http://ex.org/d"}}]}}'
    ], Body),
    run_select(Body,
           [], Json),
    string(Json),
    atom_json_dict(Json, Dict, []),
    Dict = _{rows: [_{n: "plain", s: "http://ex.org/a"}, _{n: "7", s: "http://ex.org/b"},
                     _{n: "chat", s: "http://ex.org/c"}, _{n: null, s: "http://ex.org/d"}]}.

test(no_rows_give_an_empty_list) :-
    run_select('{"head":{"vars":["s"]},"results":{"bindings":[]}}', [], Json),
    Json == "{\"rows\": []}".

test(sends_the_query_to_the_endpoint_path) :-
    run_select('{"head":{"vars":[]},"results":{"bindings":[]}}', [result_format(json), timeout(5)], _),
    stub_request(Request),
    memberchk(path('/sparql'), Request),
    memberchk(search(Search), Request),
    query(Query),
    Search == [query=Query].

test(a_timeout_bounds_the_request) :-
    endpoint(Endpoint),
    query(Query),
    slow_stub,
    catch(remote_sparql_select_json(Endpoint, Query, [timeout(0.1)], _), Error, true),
    subsumes_term(error(proxy_error(tried([error(_, error(timeout_error(read, _), _))-_])), _), Error).

test(rejects_a_non_select_query_before_sending_it) :-
    endpoint(Endpoint),
    with_stub('{"head":{"vars":[]},"results":{"bindings":[]}}',
              catch(remote_sparql_select_json(Endpoint, 'ASK {}', [], _), error(Error, _), true)),
    Error == domain_error(sparql_select_query, 'ASK {}'),
    \+ stub_request(_).

:- end_tests(sparql_client_rows).

:- begin_tests(sparql_client_validation, [setup(start_stub), cleanup(stop_stub)]).

test(rejects_a_non_atom_endpoint, [throws(error(type_error(atom, "http://x.org"), _))]) :-
    remote_sparql_select_json("http://x.org", 'SELECT * {}', [], _).

test(rejects_a_non_atom_query, [throws(error(type_error(atom, "SELECT * {}"), _))]) :-
    remote_sparql_select_json('http://x.org', "SELECT * {}", [], _).

test(rejects_an_empty_endpoint, [throws(error(domain_error(non_empty_atom, endpoint), _))]) :-
    remote_sparql_select_json('', 'SELECT * {}', [], _).

test(rejects_an_empty_query, [throws(error(domain_error(non_empty_atom, query), _))]) :-
    remote_sparql_select_json('http://x.org', '', [], _).

test(rejects_non_http_endpoints) :-
    forall(member(Endpoint, ['file:///tmp/kb.ttl', 'ftp://x.org/sparql', 'HTTP://x.org/', 'httpx://x.org', 'http:/x.org']),
           rejects(Endpoint, domain_error(remote_http_endpoint, Endpoint))).

test(rejects_local_and_private_hosts) :-
    forall(member(Endpoint, [
               'http://localhost/sparql', 'https://LOCALHOST:3030/sparql', 'http://db.localhost',
               'http://0.0.0.0', 'http://127.0.0.1:8080', 'http://10.1.2.3?x', 'http://192.168.0.1#f',
               'http://169.254.169.254/latest', 'http://user:pw@127.0.0.1/', 'http://[::1]:3030/sparql',
               'http://[fe80::1]/', 'http://[fc00::1]/', 'http://[FD12::1]', 'http://172.16.0.1',
               'http://172.31.255.255'
           ]),
           rejects(Endpoint, domain_error(public_remote_endpoint, Endpoint))).

test(accepts_public_hosts) :-
    forall(member(Endpoint, [
               'http://sparql.example.org', 'https://sparql.example.org/sparql',
               'http://localhost.example.org', 'http://x.org/127.0.0.1', 'http://127.0.0.1@x.org',
               'http://fdic.gov', 'http://fcc.gov', 'http://[2001:db8::1]:8080/', 'http://172.15.0.1',
               'http://172.32.0.1', 'http://172.x.0.1', 'http://8.8.8.8', 'http://x.org:10/',
               'http://110.0.0.1', 'http://1127.0.0.1'
           ]),
           kibi_sparql_client:validate_remote_endpoint(Endpoint)).

test(accepts_select_queries) :-
    forall(member(Query, [
               'SELECT * WHERE { ?s ?p ?o }', 'select ?s {}', 'SELECT*{}', 'select',
               '  \n\tSELECT ?s {}', 'PREFIX ex: <http://ex.org/>\nSELECT ?s {}',
               'base <http://ex.org/>\n\n  Prefix  ex: <x>\r\nSelect\n* {}',
               'PREFIX\tex: <x>\nSELECT ?s {}'
           ]),
           kibi_sparql_client:validate_select_query(Query)).

test(rejects_other_queries) :-
    forall(member(Query, [
               'CONSTRUCT WHERE { ?s ?p ?o }', 'ASK {}', 'selection {}', 'selec', 'PREFIX ex: <x>',
               'PREFIX ex: <x> SELECT * {}', 'prefixed\nSELECT * {}', 'xselect * {}',
               '# SELECT\nASK {}'
           ]),
           (   catch(kibi_sparql_client:validate_select_query(Query), error(Error, _), true),
               Error == domain_error(sparql_select_query, Query)
           )).

test(rejects_unknown_options, [throws(error(domain_error(sparql_client_option, result_format(xml)), _))]) :-
    remote_sparql_select_json('http://sparql.example.org', 'SELECT * {}', [result_format(xml)], _).

test(rejects_an_unknown_option_after_known_ones, [throws(error(domain_error(sparql_client_option, retries(2)), _))]) :-
    kibi_sparql_client:validate_sparql_options([result_format(json), timeout(3), retries(2)], _).

test(keeps_only_the_timeout_option) :-
    kibi_sparql_client:validate_sparql_options([result_format(json), timeout(3), result_format(json), timeout(4)], Options),
    Options == [timeout(3), timeout(4)].

test(validation_leaves_no_choicepoint) :-
    first_answer_is_last(kibi_sparql_client:validate_remote_endpoint('http://user@sparql.example.org:8080/sparql?x#y')),
    first_answer_is_last(kibi_sparql_client:validate_remote_endpoint('https://[2001:db8::1]:8080/')),
    first_answer_is_last(kibi_sparql_client:validate_select_query('PREFIX ex: <x>\nSELECT * {}')),
    first_answer_is_last(kibi_sparql_client:validate_sparql_options([result_format(json), timeout(3)], _)).

test(prints_unexpected_values) :-
    kibi_sparql_client:row_json(v(a, b, c), row(f(x), literal(type(t, 1)), 2.5), Dict),
    Dict == row{a: "f(x)", b: 1, c: 2.5}.

:- end_tests(sparql_client_validation).
