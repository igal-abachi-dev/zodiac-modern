#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod domain;
use domain::{Phase, Workflow, Workload};
use slint::{ComponentHandle, Model, Timer, TimerMode, VecModel};
use std::{
    cell::RefCell,
    rc::Rc,
    time::{Duration, Instant},
};
slint::include_modules!();

#[derive(Default)]
struct State {
    flow: Workflow,
    list: Workload,
    flow_timer: Timer,
    list_timer: Timer,
    open: bool,
}
impl State {
    fn stop(&mut self) {
        self.list_timer.stop();
        self.list.stop();
    }
    fn close(&mut self) {
        self.stop();
        self.flow_timer.stop();
        self.flow.generation += 1;
    }
}
fn publish_flow(ui: &BenchWindow, state: &State) {
    ui.set_ready(state.flow.ready);
    ui.set_busy(state.flow.phase == Phase::Running);
    ui.set_progress(state.flow.progress);
    ui.set_status(state.flow.status().into());
}
fn publish_list(ui: &BenchWindow, state: &State, model: &VecModel<RowData>) {
    let values: Vec<_> = state
        .list
        .visible()
        .iter()
        .map(|row| RowData {
            row_key: row.id,
            display_text: format!("{}: {}", row.label(), row.value).into(),
        })
        .collect();
    if values.len() == model.row_count() {
        for (index, row) in values.iter().enumerate() {
            if model.row_data(index).as_ref() != Some(row) {
                model.set_row_data(index, row.clone());
            }
        }
    } else {
        model.set_vec(values);
    }
    ui.set_summary(format!("{} rows; tick {}", model.row_count(), state.list.tick).into());
    ui.set_query(state.list.query.as_str().into());
    ui.set_active(state.list.active);
    ui.set_workbench_open(state.open);
}
fn main() -> Result<(), Box<dyn std::error::Error>> {
    slint::BackendSelector::new()
        .backend_name("winit".into())
        .renderer_name("skia".into())
        .select()?;
    let ui = BenchWindow::new()?;
    let state = Rc::new(RefCell::new(State::default()));
    let model = Rc::new(VecModel::<RowData>::default());
    ui.set_rows(model.clone().into());
    {
        let ui_weak = ui.as_weak();
        let state = state.clone();
        let model = model.clone();
        ui.on_filter(move |text| {
            let Some(ui) = ui_weak.upgrade() else { return };
            let mut state = state.borrow_mut();
            if !state.open {
                return;
            }
            state.list.query = text.into();
            publish_list(&ui, &state, &model);
        });
    }
    {
        let ui_weak = ui.as_weak();
        let state = state.clone();
        let model = model.clone();
        ui.on_action(move |action| {
            let Some(ui) = ui_weak.upgrade() else { return };
            let mut s = state.borrow_mut();
            match action {
                BenchAction::Encrypt | BenchAction::Decrypt => {
                    if !s.flow.ready || s.flow.phase == Phase::Running {
                        return;
                    }
                    s.flow.start(action == BenchAction::Encrypt);
                    let token = s.flow.generation;
                    let clock = Instant::now();
                    let weak = ui.as_weak();
                    let weak_state = Rc::downgrade(&state);
                    s.flow_timer.start(
                        TimerMode::Repeated,
                        Duration::from_millis(100),
                        move || {
                            let (Some(ui), Some(state)) = (weak.upgrade(), weak_state.upgrade())
                            else {
                                return;
                            };
                            let mut s = state.borrow_mut();
                            s.flow.advance(token, clock.elapsed().as_millis());
                            if s.flow.phase != Phase::Running {
                                s.flow_timer.stop();
                            }
                            publish_flow(&ui, &s);
                        },
                    );
                }
                BenchAction::Cancel => {
                    s.flow_timer.stop();
                    s.flow.cancel();
                }
                BenchAction::Reset => {
                    s.flow_timer.stop();
                    s.flow.reset();
                }
                BenchAction::Open => {
                    if !s.flow.ready || s.flow.phase == Phase::Running {
                        return;
                    }
                    s.open = true;
                    s.list.remount();
                }
                BenchAction::Back => {
                    s.stop();
                    s.open = false;
                    s.list = Workload::default();
                }
                BenchAction::Rows1000 | BenchAction::Rows10000 => {
                    if !s.open {
                        return;
                    }
                    s.stop();
                    s.list.replace(if action == BenchAction::Rows1000 {
                        1000
                    } else {
                        10000
                    });
                }
                BenchAction::Reverse => {
                    if s.open {
                        s.list.reverse();
                    }
                }
                BenchAction::Splice => {
                    if s.open {
                        s.list.splice();
                    }
                }
                BenchAction::Update => {
                    if s.open {
                        s.list.update();
                    }
                }
                BenchAction::Remount => {
                    if s.open {
                        s.stop();
                        s.list.remount();
                    }
                }
                BenchAction::Stop => s.stop(),
                BenchAction::Hz10 | BenchAction::Hz30 | BenchAction::Hz60 => {
                    if !s.open {
                        return;
                    }
                    s.stop();
                    s.list.active = true;
                    let token = s.list.generation;
                    let hz = match action {
                        BenchAction::Hz10 => 10,
                        BenchAction::Hz30 => 30,
                        _ => 60,
                    };
                    let clock = Instant::now();
                    let weak = ui.as_weak();
                    let weak_state = Rc::downgrade(&state);
                    let model = model.clone();
                    s.list_timer.start(
                        TimerMode::Repeated,
                        Duration::from_nanos(1_000_000_000 / hz),
                        move || {
                            let (Some(ui), Some(state)) = (weak.upgrade(), weak_state.upgrade())
                            else {
                                return;
                            };
                            let mut s = state.borrow_mut();
                            if !s.open || !s.list.active || s.list.generation != token {
                                return;
                            }
                            if clock.elapsed() >= Duration::from_secs(2) {
                                s.stop();
                            } else {
                                s.list.update();
                            }
                            publish_list(&ui, &s, &model);
                        },
                    );
                }
            }
            publish_flow(&ui, &s);
            publish_list(&ui, &s, &model);
        });
    }
    {
        let state = state.clone();
        ui.window().on_close_requested(move || {
            state.borrow_mut().close();
            slint::CloseRequestResponse::HideWindow
        });
    }
    // Publish semantic readiness after show() and an event-loop turn. This
    // selected WGPU surface does not expose a graphics API notifier by default.
    // This endpoint means the local UI can accept actions, not physical paint.
    ui.show()?;
    let weak = ui.as_weak();
    let ready_state = state.clone();
    slint::Timer::single_shot(Duration::ZERO, move || {
        if let Some(ui) = weak.upgrade() {
            let mut s = ready_state.borrow_mut();
            s.flow.ready = true;
            publish_flow(&ui, &s);
        }
    });
    slint::run_event_loop()?;
    state.borrow_mut().close();
    Ok(())
}
