use std::thread;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Emitter, Manager};

use crate::commands::{GAME_OVER_EVENT, finalize_game};
use crate::state::AppState;

pub const GAME_STATE_EVENT: &str = "game-state";
const TICK: Duration = Duration::from_millis(4);
const IDLE_TICK: Duration = Duration::from_millis(50);
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
    let mut over_handled = false;
    let mut tick = TICK;
    loop {
        thread::sleep(tick);
        let now = Instant::now();
        let dt = now - last_tick;
        last_tick = now;
        let mut snapshot = None;
        let mut is_over = false;
        {
            let mut guard = state.game();
            match guard.as_mut() {
                Some(game) => {
                    game.update(dt);
                    is_over = game.is_over();
                    if !is_over {
                        over_handled = false;
                    }
                    if game.version() != emitted_version
                        && (game.has_events() || now - last_emit >= MIN_EMIT_INTERVAL)
                    {
                        emitted_version = game.version();
                        last_emit = now;
                        snapshot = Some(game.snapshot());
                    }
                    tick = if game.is_paused() || is_over {
                        IDLE_TICK
                    } else {
                        TICK
                    };
                }
                None => {
                    emitted_version = 0;
                    over_handled = false;
                    tick = IDLE_TICK;
                }
            }
        }
        if let Some(snapshot) = snapshot {
            let _ = app.emit(GAME_STATE_EVENT, &snapshot);
        }
        if is_over && !over_handled {
            over_handled = true;
            match finalize_game(&state) {
                Ok(info) => {
                    let _ = app.emit(GAME_OVER_EVENT, &info);
                }
                Err(error) => eprintln!("finalize game: {error}"),
            }
        }
    }
}
