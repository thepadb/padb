// Rebuilds when a migration is added or changed, so `sqlx::migrate!` embeds it
fn main() {
    println!("cargo:rerun-if-changed=migrations");
}
