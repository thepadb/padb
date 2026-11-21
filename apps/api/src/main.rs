//! Serves the public and internal routers on separate ports. See ADR 0014

use std::env;
use std::net::SocketAddr;

use tokio::net::TcpListener;

/// Reads a socket address from `variable`, falling back to `default` when it is unset.
fn socket_addr_from_env(variable: &str, default: &str) -> Result<SocketAddr, String> {
    let value = env::var(variable).unwrap_or_else(|_| default.to_owned());
    value
        .parse()
        .map_err(|error| format!("{variable} is not a socket address ({value}): {error}"))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Public listens everywhere; internal stays on this machine unless pointed at the private network.
    let public = TcpListener::bind(socket_addr_from_env("PUBLIC_ADDR", "0.0.0.0:3000")?).await?;
    let internal =
        TcpListener::bind(socket_addr_from_env("INTERNAL_ADDR", "127.0.0.1:3001")?).await?;
    println!(
        "public API on http://{}, internal API on http://{}",
        public.local_addr()?,
        internal.local_addr()?
    );

    tokio::try_join!(
        axum::serve(public, padb_api::public_router()).with_graceful_shutdown(shutdown()),
        axum::serve(internal, padb_api::internal_router()).with_graceful_shutdown(shutdown()),
    )?;
    Ok(())
}

async fn shutdown() {
    tokio::signal::ctrl_c()
        .await
        .expect("Ctrl+C handler installs");
}
