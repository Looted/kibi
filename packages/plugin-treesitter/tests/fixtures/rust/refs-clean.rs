use std::env;
use std::io::{self, Write};

fn start() -> io::Result<()> {
    let port = env::var("PORT").unwrap_or_default();
    let mut out = io::stdout();
    out.write_all(port.as_bytes())?;
    out.flush()
}

#[cfg(test)]
mod tests {
    #[test]
    fn reads_port() {
        assert!(super::start().is_ok());
    }
}
