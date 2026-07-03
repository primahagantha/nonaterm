//! Dedicated PTY reader thread untuk blocking I/O dan batching output.

use std::io::Read;
use std::sync::mpsc::Receiver;
use std::sync::Arc;
use std::time::{Duration, Instant};

use super::backpressure::FlowControl;
use super::{PtyConfig, PtyEventSink, PtyOutputEventPayload};

pub fn spawn_reader_thread(
    event_sink: Arc<dyn PtyEventSink>,
    workspace_id: String,
    pane_id: String,
    mut reader: Box<dyn Read + Send>,
    shutdown_rx: Receiver<()>,
    flow_control: Arc<FlowControl>,
    config: PtyConfig,
) -> std::thread::JoinHandle<()> {
    let thread_name = format!("pty-reader-{}", pane_id);

    std::thread::Builder::new()
        .name(thread_name)
        .spawn(move || {
            let mut buf = vec![0_u8; config.read_buffer_size];
            let mut batch = Vec::with_capacity(config.max_batch_bytes);
            let mut last_flush = Instant::now();

            loop {
                if shutdown_rx.try_recv().is_ok() {
                    break;
                }

                flow_control.wait_until_ready();

                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(read_bytes) => {
                        batch.extend_from_slice(&buf[..read_bytes]);

                        let should_flush = batch.len() >= config.max_batch_bytes
                            || last_flush.elapsed()
                                >= Duration::from_millis(config.batch_interval_ms)
                            || read_bytes < config.read_buffer_size;

                        if should_flush {
                            flush_batch(
                                &event_sink,
                                &workspace_id,
                                &pane_id,
                                &mut batch,
                                &flow_control,
                            );
                            last_flush = Instant::now();
                        }
                    }
                    Err(error) => {
                        tracing::error!(pane_id = %pane_id, error = %error, "PTY read error");
                        break;
                    }
                }
            }

            if !batch.is_empty() {
                flush_batch(
                    &event_sink,
                    &workspace_id,
                    &pane_id,
                    &mut batch,
                    &flow_control,
                );
            }
        })
        .expect("failed to spawn PTY reader thread")
}

fn flush_batch(
    event_sink: &Arc<dyn PtyEventSink>,
    workspace_id: &str,
    pane_id: &str,
    batch: &mut Vec<u8>,
    flow_control: &FlowControl,
) {
    let data = std::mem::take(batch);
    let payload = PtyOutputEventPayload {
        workspace_id: workspace_id.to_string(),
        pane_id: pane_id.to_string(),
        chunk: String::from_utf8_lossy(&data).into_owned(),
    };

    tracing::debug!(pane_id = %pane_id, bytes = payload.chunk.len(), "PTY data batch sent");
    event_sink.emit_output(payload);
    flow_control.batch_sent();
}
