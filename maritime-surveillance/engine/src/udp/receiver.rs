use crate::models::packet::TelemetryPacket;
use crossbeam_channel::Sender;
use std::net::SocketAddr;
use tokio::net::UdpSocket;

pub struct UdpReceiver {
    socket: UdpSocket,
}

impl UdpReceiver {
    pub async fn new(host: &str, port: u16) -> anyhow::Result<Self> {
        let address = format!("{}:{}", host, port);

        let socket = UdpSocket::bind(address).await?;

        Ok(Self { socket })
    }

    pub async fn start(
        &self,
        sender: Sender<TelemetryPacket>,
    ) -> anyhow::Result<()> {

        let mut buffer = [0u8; 2048];

        log::info!("UDP Receiver Started");

        loop {

            let (size, peer): (usize, SocketAddr) =
                self.socket.recv_from(&mut buffer).await?;

            let data = &buffer[..size];

            match serde_json::from_slice::<TelemetryPacket>(data) {

                Ok(packet) => {

                    log::debug!(
                        "Packet received from {} -> {:?}",
                        peer,
                        packet
                    );

                    if sender.send(packet).is_err() {

                        log::error!("Queue disconnected.");

                        break;
                    }
                }

                Err(err) => {

                    log::warn!(
                        "Invalid packet received: {}",
                        err
                    );
                }
            }
        }

        Ok(())
    }
}