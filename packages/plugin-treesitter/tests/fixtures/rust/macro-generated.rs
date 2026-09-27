macro_rules! define_helper {
    () => {
        fn generated_from_macro() {}
    };
}

define_helper!();
fn declared_in_source() {}
