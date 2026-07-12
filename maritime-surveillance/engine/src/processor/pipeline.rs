use std::sync::Arc;

use crate::{
    models::{alert::Alert, packet::TelemetryPacket},
    processor::worker::Worker,
    queue::ringbuffer::RingBuffer,
    spatial::geofence::GeofenceEngine,
    state::SharedState,
};

pub struct ProcessingPipeline {
    telemetry_queue: RingBuffer<TelemetryPacket>,
    alert_queue: RingBuffer<Alert>,
    geofence: Arc<GeofenceEngine>,
    state: Arc<SharedState>,
}

impl ProcessingPipeline {
    pub fn new(
        packet_capacity: usize,
        alert_capacity: usize,
        resolution: u8,
        state: Arc<SharedState>,
    ) -> anyhow::Result<Self> {
        let mut geofence = GeofenceEngine::new(resolution)?;
        geofence.load_demo_zone()?;

        Ok(Self {
            telemetry_queue: RingBuffer::new(packet_capacity),
            alert_queue: RingBuffer::new(alert_capacity),
            geofence: Arc::new(geofence),
            state,
        })
    }

    pub fn start_workers(&self, worker_count: usize) {
        for _ in 0..worker_count {
            let worker = Worker::new(
                self.telemetry_queue.consumer(),
                self.alert_queue.producer(),
                self.geofence.clone(),
                self.state.clone(),
            );

            worker.start();
        }
    }

    pub fn telemetry_sender(
        &self,
    ) -> crossbeam_channel::Sender<TelemetryPacket> {
        self.telemetry_queue.producer()
    }

    pub fn alert_receiver(
        &self,
    ) -> crossbeam_channel::Receiver<Alert> {
        self.alert_queue.consumer()
    }
}