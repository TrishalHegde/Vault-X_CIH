mod alerts;
mod config;
mod models;
mod processor;
mod queue;
mod spatial;
mod storage;
mod udp;
mod utils;

use config::settings::Settings;
use processor::pipeline::ProcessingPipeline;
use storage::postgres::PostgresWriter;
use udp::receiver::UdpReceiver;
use utils::logger::init_logger;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_logger();

    let settings = Settings::new();

    log::info!("==================================");
    log::info!("Maritime Surveillance Engine");
    log::info!("==================================");

    let pipeline = ProcessingPipeline::new(
        settings.buffer_size,
        settings.buffer_size,
        settings.h3_resolution,
    )?;

    pipeline.start_workers(settings.worker_threads);

    let connection_string = format!(
        "host={} port={} user={} password={} dbname={}",
        settings.database_host,
        settings.database_port,
        settings.database_user,
        settings.database_password,
        settings.database_name
    );

    let db = PostgresWriter::new(&connection_string).await?;

    let alert_receiver = pipeline.alert_receiver();

    tokio::spawn(async move {
        while let Ok(alert) = alert_receiver.recv() {
            if let Err(e) = db.insert_alert(&alert).await {
                log::error!("Database insert failed: {}", e);
            } else {
                log::info!("Alert stored for vessel {}", alert.mmsi);
            }
        }
    });

    let receiver = UdpReceiver::new(
        &settings.udp_host,
        settings.udp_port,
    )
    .await?;

    receiver
        .start(pipeline.telemetry_sender())
        .await?;

    Ok(())
}