//! Per-session PTY state.

use std::io::Write;
use std::sync::{Arc, Mutex};

use portable_pty::{Child, ChildKiller, MasterPty, PtySize};

use super::backpressure::FlowControl;
use super::PtySessionSnapshot;

pub struct PtySession {
    pub session_id: String,
    pub workspace_id: String,
    pub pane_id: String,
    pub shell: String,
    pub cwd: String,
    pub startup_command: Option<String>,
    pub process_id: Option<u32>,
    pub master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pub child: Arc<Mutex<Box<dyn Child + Send + Sync>>>,
    pub killer: Arc<Mutex<Box<dyn ChildKiller + Send + Sync>>>,
    pub size: Arc<Mutex<PtySize>>,
    pub flow_control: Arc<FlowControl>,
    pub shutdown_tx: std::sync::mpsc::Sender<()>,
}

impl PtySession {
    pub fn snapshot(&self) -> PtySessionSnapshot {
        PtySessionSnapshot {
            session_id: self.session_id.clone(),
            workspace_id: self.workspace_id.clone(),
            pane_id: self.pane_id.clone(),
            shell: self.shell.clone(),
            cwd: self.cwd.clone(),
            startup_command: self.startup_command.clone(),
            rows: self.rows(),
            cols: self.cols(),
            process_id: self.process_id,
        }
    }

    pub fn rows(&self) -> u16 {
        self.size.lock().expect("PTY size mutex poisoned").rows
    }

    pub fn cols(&self) -> u16 {
        self.size.lock().expect("PTY size mutex poisoned").cols
    }
}
