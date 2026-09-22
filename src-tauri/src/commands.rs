use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::db::{HIGH_SCORE_LIMIT, ScoreEntry};
use crate::error::{AppError, AppResult};
use crate::game::{Game, GameSummary, InputAction, Snapshot};
use crate::meta::{GameMeta, game_meta};
use crate::settings::{KeyAction, Settings, SettingsPatch, normalize_name};
use crate::state::AppState;

pub const GAME_OVER_EVENT: &str = "game-over";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameOverInfo {
    pub summary: GameSummary,
    pub rank: Option<usize>,
    pub recorded: bool,
    pub player_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubmitResult {
    pub id: i64,
    pub rank: usize,
}

fn persist_settings(state: &AppState, settings: Settings) -> AppResult<Settings> {
    let settings = settings.normalized();
    if let Some(game) = state.game().as_mut() {
        game.update_config(settings.game_config());
    }
    state.db().save_settings(&settings)?;
    *state.settings() = settings.clone();
    Ok(settings)
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> AppResult<Settings> {
    Ok(state.settings().clone())
}

#[tauri::command]
pub fn update_settings(state: State<'_, AppState>, patch: SettingsPatch) -> AppResult<Settings> {
    let current = state.settings().clone();
    persist_settings(&state, patch.apply(&current))
}

#[tauri::command]
pub fn assign_key(
    state: State<'_, AppState>,
    action: KeyAction,
    slot: usize,
    code: Option<String>,
) -> AppResult<Settings> {
    let current = state.settings().clone();
    let keys = current.keys.assign(action, slot, code);
    persist_settings(&state, Settings { keys, ..current })
}

#[tauri::command]
pub fn reset_settings(state: State<'_, AppState>) -> AppResult<Settings> {
    persist_settings(&state, Settings::default())
}

#[tauri::command]
pub fn get_game_meta() -> GameMeta {
    game_meta()
}

#[tauri::command]
pub fn get_high_scores(
    state: State<'_, AppState>,
    limit: Option<usize>,
) -> AppResult<Vec<ScoreEntry>> {
    state.db().top_scores(limit.unwrap_or(HIGH_SCORE_LIMIT))
}

#[tauri::command]
pub fn clear_high_scores(state: State<'_, AppState>) -> AppResult<()> {
    state.db().clear_scores()
}

#[tauri::command]
pub fn new_game(state: State<'_, AppState>) -> AppResult<Snapshot> {
    let config = state.settings().game_config();
    let mut game = Game::new(config);
    let snapshot = game.snapshot();
    *state.game() = Some(game);
    Ok(snapshot)
}

#[tauri::command]
pub fn game_input(state: State<'_, AppState>, action: InputAction) -> AppResult<()> {
    if let Some(game) = state.game().as_mut() {
        game.apply(action);
    }
    Ok(())
}

/// Resolves a raw keyboard event against the configured bindings and applies
/// the resulting engine input.
#[tauri::command]
pub fn key_input(state: State<'_, AppState>, code: String, pressed: bool) -> AppResult<()> {
    let input = state
        .settings()
        .keys
        .resolve(&code)
        .and_then(|action| action.input(pressed));
    if let Some(input) = input
        && let Some(game) = state.game().as_mut()
    {
        game.apply(input);
    }
    Ok(())
}

#[tauri::command]
pub fn end_game(state: State<'_, AppState>) -> AppResult<()> {
    *state.game() = None;
    Ok(())
}

/// Persists the finished game if it does not qualify for a name prompt. Safe to
/// call repeatedly: the game records itself once.
pub fn finalize_game(state: &AppState) -> AppResult<GameOverInfo> {
    let (summary, mut recorded) = {
        let guard = state.game();
        let game = guard.as_ref().ok_or(AppError::NoGame)?;
        if !game.is_over() {
            return Err(AppError::GameNotOver);
        }
        (game.summary(), game.is_recorded())
    };
    let player_name = state.settings().player_name.clone();
    let mut rank = None;
    if !recorded {
        rank = state
            .db()
            .qualifying_rank(summary.score, HIGH_SCORE_LIMIT)?;
        if rank.is_none() {
            state.db().insert_score(&player_name, &summary)?;
            if let Some(game) = state.game().as_mut() {
                game.mark_recorded();
            }
            recorded = true;
        }
    }
    Ok(GameOverInfo {
        summary,
        rank,
        recorded,
        player_name,
    })
}

#[tauri::command]
pub fn submit_score(state: State<'_, AppState>, name: String) -> AppResult<SubmitResult> {
    let name = normalize_name(&name);
    let summary = {
        let mut guard = state.game();
        let game = guard.as_mut().ok_or(AppError::NoGame)?;
        if !game.is_over() {
            return Err(AppError::GameNotOver);
        }
        if game.is_recorded() {
            return Err(AppError::AlreadyRecorded);
        }
        game.mark_recorded();
        game.summary()
    };
    let (id, rank) = {
        let db = state.db();
        let id = db.insert_score(&name, &summary)?;
        (id, db.rank_for(summary.score + 1)?)
    };
    let settings = {
        let mut settings = state.settings();
        if settings.player_name != name {
            settings.player_name = name;
            Some(settings.clone())
        } else {
            None
        }
    };
    if let Some(settings) = settings {
        state.db().save_settings(&settings)?;
    }
    Ok(SubmitResult { id, rank })
}

#[tauri::command]
pub fn quit(app: AppHandle) {
    app.exit(0);
}
