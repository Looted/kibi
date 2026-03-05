
% Alternative: return JSON as a string binding instead of writing to stdout
check_all_json(JsonString) :-
    check_all(ViolationsDict),
    with_output_to_string(
        json_write_dict(current_output, ViolationsDict, [width(0)]),
        JsonString
    ).

% Helper: capture output to string
with_output_to_string(Goal, String) :-
    with_output_to(codes(Codes), Goal),
    string_codes(String, Codes).
