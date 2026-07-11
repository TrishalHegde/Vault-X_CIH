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
}

impl Settings {
    pub fn new() -> Self {
        dotenv().ok();

        Self {
            udp_host: env::var("UDP_HOST").unwrap(),

            udp_port: env::var("UDP_PORT")
                .unwrap()
                .parse()
                .unwrap(),

            database_host: env::var("DATABASE_HOST").unwrap(),

            database_port: env::var("DATABASE_PORT")
                .unwrap()
                .parse()
                .unwrap(),

            database_user: env::var("DATABASE_USER").unwrap(),

            database_password: env::var("DATABASE_PASSWORD").unwrap(),

            database_name: env::var("DATABASE_NAME").unwrap(),

            h3_resolution: env::var("H3_RESOLUTION")
                .unwrap()
                .parse()
                .unwrap(),

            buffer_size: env::var("BUFFER_SIZE")
                .unwrap()
                .parse()
                .unwrap(),

            worker_threads: env::var("WORKER_THREADS")
                .unwrap()
                .parse()
                .unwrap(),
        }
    }
}