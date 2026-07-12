use dotenvy::dotenv;
use std::env;

#[derive(Debug, Clone)]
pub struct Settings {
    pub udp_host: String,
    pub udp_port: u16,

    pub database_host: String,
    pub database_port: u16,
    pub database_user: String,
    pub database_password: String,
    pub database_name: String,

    pub h3_resolution: u8,

    pub buffer_size: usize,

    pub worker_threads: usize,

    pub ws_port: u16,
}

impl Settings {
    pub fn new() -> Self {
        dotenv().ok();

        Self {
            udp_host: env::var("UDP_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),

            udp_port: env::var("UDP_PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .unwrap_or(8080),

            database_host: env::var("DATABASE_HOST").unwrap_or_else(|_| "localhost".to_string()),

            database_port: env::var("DATABASE_PORT")
                .unwrap_or_else(|_| "5433".to_string())
                .parse()
                .unwrap_or(5433),

            database_user: env::var("DATABASE_USER").unwrap_or_else(|_| "postgres".to_string()),

            database_password: env::var("DATABASE_PASSWORD").unwrap_or_else(|_| "hackathon".to_string()),

            database_name: env::var("DATABASE_NAME").unwrap_or_else(|_| "postgres".to_string()),

            h3_resolution: env::var("H3_RESOLUTION")
                .unwrap_or_else(|_| "7".to_string())
                .parse()
                .unwrap_or(7),

            buffer_size: env::var("BUFFER_SIZE")
                .unwrap_or_else(|_| "10000".to_string())
                .parse()
                .unwrap_or(10000),

            worker_threads: env::var("WORKER_THREADS")
                .unwrap_or_else(|_| "8".to_string())
                .parse()
                .unwrap_or(8),

            ws_port: env::var("WS_PORT")
                .unwrap_or_else(|_| "3001".to_string())
                .parse()
                .unwrap_or(3001),
        }
    }
}