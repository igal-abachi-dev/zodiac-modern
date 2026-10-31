#[derive(Clone, Copy, PartialEq, Debug)]
pub enum Phase {
    Ready,
    Running,
    Success,
    Canceled,
}
pub struct Workflow {
    pub ready: bool,
    pub encrypt: bool,
    pub phase: Phase,
    pub progress: i32,
    pub generation: u64,
}
impl Default for Workflow {
    fn default() -> Self {
        Self {
            ready: false,
            encrypt: false,
            phase: Phase::Ready,
            progress: 0,
            generation: 0,
        }
    }
}
impl Workflow {
    pub fn start(&mut self, encrypt: bool) {
        if !self.ready || self.phase == Phase::Running {
            return;
        }
        self.generation += 1;
        self.encrypt = encrypt;
        self.phase = Phase::Running;
        self.progress = 0;
    }
    pub fn advance(&mut self, token: u64, milliseconds: u128) {
        if self.generation != token || self.phase != Phase::Running {
            return;
        }
        self.progress = self.progress.max((milliseconds / 20).min(100) as i32);
        if milliseconds >= 2000 {
            self.phase = Phase::Success;
        }
    }
    pub fn cancel(&mut self) {
        if self.phase == Phase::Running {
            self.generation += 1;
            self.phase = Phase::Canceled;
        }
    }
    pub fn reset(&mut self) {
        self.generation += 1;
        self.phase = Phase::Ready;
        self.progress = 0;
    }
    pub fn status(&self) -> &'static str {
        if !self.ready {
            return "Loading local interface…";
        }
        match self.phase {
            Phase::Ready => "Ready",
            Phase::Running => {
                if self.encrypt {
                    "Simulating encryption…"
                } else {
                    "Simulating decryption…"
                }
            }
            Phase::Success => "Simulation complete. No file was changed.",
            Phase::Canceled => "Simulation canceled.",
        }
    }
}
#[derive(Clone, Debug, PartialEq)]
pub struct Row {
    pub id: i32,
    pub value: i32,
}
impl Row {
    pub fn label(&self) -> String {
        format!("row-{} שלום", self.id)
    }
}
#[derive(Default)]
pub struct Workload {
    pub rows: Vec<Row>,
    pub next: i32,
    pub tick: i32,
    pub query: String,
    pub active: bool,
    pub generation: u64,
}
impl Workload {
    pub fn replace(&mut self, count: usize) {
        assert!(count <= 10000);
        self.stop();
        self.rows = (0..count)
            .map(|_| {
                let row = Row {
                    id: self.next,
                    value: 0,
                };
                self.next += 1;
                row
            })
            .collect();
        self.tick = 0;
        self.query.clear();
    }
    pub fn reverse(&mut self) {
        self.rows.reverse();
    }
    pub fn splice(&mut self) {
        let count = 10.min(self.rows.len());
        let added: Vec<_> = (0..10)
            .map(|_| {
                let row = Row {
                    id: self.next,
                    value: 0,
                };
                self.next += 1;
                row
            })
            .collect();
        self.rows.splice(0..count, added);
    }
    pub fn update(&mut self) {
        for row in self.rows.iter_mut().step_by(10) {
            row.value += 1;
        }
        self.tick += 1;
    }
    pub fn visible(&self) -> Vec<Row> {
        self.rows
            .iter()
            .filter(|r| r.label().contains(&self.query))
            .cloned()
            .collect()
    }
    pub fn stop(&mut self) {
        self.active = false;
        self.generation += 1;
    }
    pub fn remount(&mut self) {
        self.next = 0;
        self.replace(1000);
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn workflow_and_stale_generation() {
        let mut s = Workflow::default();
        s.start(true);
        assert_eq!(s.phase, Phase::Ready);
        s.ready = true;
        s.start(true);
        let old = s.generation;
        s.advance(old, 500);
        assert_eq!(s.progress, 25);
        s.cancel();
        s.advance(old, 2000);
        assert_eq!(s.phase, Phase::Canceled);
        s.reset();
        s.start(false);
        s.advance(s.generation, 2000);
        assert_eq!(s.phase, Phase::Success);
    }
    #[test]
    fn deterministic_list_contract() {
        let mut s = Workload::default();
        s.replace(1000);
        assert_eq!(s.rows[0].id, 0);
        s.replace(10000);
        assert_eq!(s.rows[0].id, 1000);
        s.replace(1000);
        s.reverse();
        assert_eq!(s.rows[0].id, 11999);
        s.splice();
        assert_eq!(s.rows[0].id, 12000);
        s.update();
        assert_eq!(s.rows[0].value, 1);
        assert_eq!(s.rows[1].value, 0);
        s.query = "row-12000 ".into();
        assert_eq!(s.visible().len(), 1);
        s.query = "ROW-".into();
        assert!(s.visible().is_empty());
        s.remount();
        assert_eq!(s.next, 1000);
        assert_eq!(s.tick, 0);
        assert!(s.query.is_empty());
    }
}
