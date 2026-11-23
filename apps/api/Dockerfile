# Builds without BuildKit features, so the legacy builder works too.
# Built from the repo root: docker build -f apps/api/Dockerfile .

FROM rust:1-slim-trixie AS build
WORKDIR /src
# Checks queries against the committed .sqlx data, so the build needs no database
ENV SQLX_OFFLINE=true
COPY rust-toolchain.toml Cargo.toml Cargo.lock ./
COPY .sqlx .sqlx
COPY apps/api apps/api
RUN cargo build --release --locked -p padb-api \
    && cp target/release/padb-api /padb-api

FROM gcr.io/distroless/cc-debian13:nonroot
COPY --from=build /padb-api /usr/local/bin/padb-api
# Internal listens on all interfaces so the website can reach it over the private
# container network; only the public port is ever published. See ADR 0014
ENV PUBLIC_ADDR=0.0.0.0:3000 \
    INTERNAL_ADDR=0.0.0.0:3001
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/padb-api"]
