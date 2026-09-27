; Terraform-specific, top-level declaration candidates. Root scoping excludes nested
; lifecycle/provisioner/ingress blocks; host code decodes static string labels and
; derives qualified locators from block type plus label(s).

; resource "TYPE" "NAME" { ... } -> resource.TYPE.NAME
(config_file
  (body
    (block
      . (identifier) @block.type
      . (string_lit) @label.type
      . (string_lit) @label.name
      . (block_start)
    ) @definition.resource
    (#eq? @block.type "resource")
  )
)

; data "TYPE" "NAME" { ... } -> data.TYPE.NAME
(config_file
  (body
    (block
      . (identifier) @block.type
      . (string_lit) @label.type
      . (string_lit) @label.name
      . (block_start)
    ) @definition.data
    (#eq? @block.type "data")
  )
)

; One-label Terraform blocks. The block_start anchor rejects extra labels.
(config_file
  (body
    (block
      . (identifier) @block.type
      . (string_lit) @label.name
      . (block_start)
    ) @definition.module
    (#eq? @block.type "module")
  )
)

(config_file
  (body
    (block
      . (identifier) @block.type
      . (string_lit) @label.name
      . (block_start)
    ) @definition.variable
    (#eq? @block.type "variable")
  )
)

(config_file
  (body
    (block
      . (identifier) @block.type
      . (string_lit) @label.name
      . (block_start)
    ) @definition.output
    (#eq? @block.type "output")
  )
)

; Provider configuration is indexed as configuration metadata. An alias is a
; separate identity component: provider.NAME.ALIAS.
(config_file
  (body
    (block
      . (identifier) @block.type
      . (string_lit) @provider.name
      . (block_start)
    ) @configuration.provider
    (#eq? @block.type "provider")
  )
)

(config_file
  (body
    (block
      . (identifier) @block.type
      . (string_lit) @provider.name
      . (block_start)
      (body
        (attribute
          . (identifier) @provider.key
          . (expression
            (literal_value
              (string_lit) @provider.alias
            )
          )
        )
      )
    ) @configuration.provider_alias
    (#eq? @block.type "provider")
    (#eq? @provider.key "alias")
  )
)

; locals { name = ... } contains addressable local.NAME declarations; the locals
; wrapper itself is not emitted as a symbol.
(config_file
  (body
    (block
      . (identifier) @block.type
      . (block_start)
      (body
        (attribute
          . (identifier) @local.name
        ) @definition.local
      )
    ) @block.locals
    (#eq? @block.type "locals")
  )
)
