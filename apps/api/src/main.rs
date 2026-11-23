//! Serves the public and internal routers on separate ports. See ADR 0014

use std::env;
use std::net::SocketAddr;

use sqlx::PgPool;
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
    let database_url = env::var("DATABASE_URL").map_err(|_| "DATABASE_URL is not set")?;
    let db = PgPool::connect(&database_url).await?;
    // See ADR 0017
    sqlx::migrate!("./migrations").run(&db).await?;

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
        axum::serve(public, padb_api::public_router(db.clone())).with_graceful_shutdown(shutdown()),
        axum::serve(internal, padb_api::internal_router(db)).with_graceful_shutdown(shutdown()),
    )?;
    Ok(())
}

/// Resolves on Ctrl+C, or on SIGTERM, which is how `docker stop` asks a container to finish.
async fn shutdown() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Ctrl+C handler installs");
    };
    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("SIGTERM handler installs")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! {
        () = ctrl_c => {},
        () = terminate => {},
    }
}
