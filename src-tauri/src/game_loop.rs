use std::thread;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Emitter, Manager};

use crate::state::AppState;

pub const GAME_STATE_EVENT: &str = "game-state";
const TICK: Duration = Duration::from_millis(4);
const MIN_EMIT_INTERVAL: Duration = Duration::from_millis(8);

pub fn spawn(app: AppHandle) {
    thread::Builder::new()
        .name("game-loop".into())
        .spawn(move || run(app))
        .expect("spawn game loop");
}

fn run(app: AppHandle) {
    let state = app.state::<AppState>();
    let mut last_tick = Instant::now();
    let mut last_emit = Instant::now();
    let mut emitted_version = 0;
    loop {
        thread::sleep(TICK);
        let now = Instant::now();
        let dt = now - last_tick;
        last_tick = now;
        let snapshot = {
            let mut guard = state.game();
            match guard.as_mut() {
                Some(game) => {
                    game.update(dt);
                    let changed = game.version() != emitted_version;
                    if changed && now - last_emit >= MIN_EMIT_INTERVAL {
                        emitted_version = game.version();
                        last_emit = now;
                        Some(game.snapshot())
                    } else {
                        None
                    }
                }
                None => {
                    emitted_version = 0;
                    None
                }
            }
        };
        if let Some(snapshot) = snapshot {
            let _ = app.emit(GAME_STATE_EVENT, &snapshot);
        }
    }
}
