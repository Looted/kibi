; Capture out-of-class definitions like `void api::Widget::run(int) {}`.
(function_declarator
  declarator: (qualified_identifier
    name: (qualified_identifier
      name: (identifier) @name
    )
  )) @definition.method

; Operator names use a dedicated node and are absent from the upstream tags query.
(function_declarator
  declarator: (operator_name) @name) @definition.method

(function_declarator
  declarator: (qualified_identifier
    name: (operator_name) @name)) @definition.method

; Destructors use a dedicated grammar node instead of an identifier/operator name.
(function_declarator declarator: (destructor_name) @name) @definition.method

(function_declarator
  declarator: (qualified_identifier
    (destructor_name) @name)) @definition.method
