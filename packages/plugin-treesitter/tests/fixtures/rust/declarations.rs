pub struct Box;
pub trait Reader { fn read(&self); }
impl Reader for Box { fn read(&self) {} }
impl Box { fn same(&self) {} }
fn same() {}
const LABEL: &str = "🙂"; fn after_emoji() {}
