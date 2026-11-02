use std::env;

fn start() {
    let port = env::var("PORT").unwrap();
    println!("listening on {}", port);
}

#[cfg(feature = "metrics")]
fn metrics() {}
