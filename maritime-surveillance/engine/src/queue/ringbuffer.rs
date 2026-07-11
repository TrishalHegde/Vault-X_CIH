use crossbeam_channel::{bounded, Receiver, Sender};

pub struct RingBuffer<T> {
    sender: Sender<T>,
    receiver: Receiver<T>,
}

impl<T> RingBuffer<T> {
    /// Create a bounded queue
    pub fn new(capacity: usize) -> Self {
        let (sender, receiver) = bounded(capacity);

        Self { sender, receiver }
    }

    /// Clone producer
    pub fn producer(&self) -> Sender<T> {
        self.sender.clone()
    }

    /// Clone consumer
    pub fn consumer(&self) -> Receiver<T> {
        self.receiver.clone()
    }
}