//! Flow control antara reader PTY dan renderer frontend.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Condvar, Mutex};

/// Menahan reader thread saat batch yang belum di-ACK melebihi batas.
pub struct FlowControl {
    pending_batches: AtomicU64,
    max_pending: u64,
    condvar: Condvar,
    mutex: Mutex<()>,
}

impl FlowControl {
    pub fn new(max_pending: u64) -> Self {
        Self {
            pending_batches: AtomicU64::new(0),
            max_pending,
            condvar: Condvar::new(),
            mutex: Mutex::new(()),
        }
    }

    pub fn wait_until_ready(&self) {
        let guard = self.mutex.lock().expect("flow control mutex poisoned");
        let _guard = self
            .condvar
            .wait_while(guard, |_| {
                self.pending_batches.load(Ordering::Relaxed) >= self.max_pending
            })
            .expect("flow control condvar wait poisoned");
    }

    pub fn batch_sent(&self) {
        self.pending_batches.fetch_add(1, Ordering::Relaxed);
    }

    pub fn acknowledge(&self) {
        let current = self.pending_batches.load(Ordering::Relaxed);
        if current == 0 {
            return;
        }

        self.pending_batches.fetch_sub(1, Ordering::Relaxed);
        self.condvar.notify_one();
    }

    #[cfg(test)]
    pub fn pending_batches(&self) -> u64 {
        self.pending_batches.load(Ordering::Relaxed)
    }
}

#[cfg(test)]
mod tests {
    use super::FlowControl;

    #[test]
    fn tracks_pending_batches_without_underflow() {
        let control = FlowControl::new(2);

        control.batch_sent();
        control.batch_sent();
        control.acknowledge();
        control.acknowledge();
        control.acknowledge();

        assert_eq!(control.pending_batches(), 0);
    }
}
