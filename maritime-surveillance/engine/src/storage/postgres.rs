use anyhow::Result;
use tokio_postgres::{Client, NoTls};

use crate::models::alert::Alert;

pub struct PostgresWriter {
    client: Client,
}

impl PostgresWriter {
    pub async fn new(connection: &str) -> Result<Self> {
    println!("Connecting using:\n{}", connection);

    let (client, connection) =
        tokio_postgres::connect(connection, NoTls).await?;

    tokio::spawn(async move {
        if let Err(e) = connection.await {
            log::error!("Database connection error: {}", e);
        }
    });

    Ok(Self { client })
}

        

    pub async fn insert_alert(&self, alert: &Alert) -> Result<()> {
    let mmsi = alert.mmsi.to_string();

    self.client
        .execute(
            "INSERT INTO active_alerts
            (mmsi, latitude, longitude, speed)
            VALUES ($1, $2, $3, $4)",
            &[
                &mmsi,
                &alert.latitude,
                &alert.longitude,
                &alert.speed,
            ],
        )
        .await?;

    Ok(())

    }
}