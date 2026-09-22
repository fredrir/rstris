use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::db::{HIGH_SCORE_LIMIT, ScoreEntry, Stats};
use crate::error::{AppError, AppResult};
use crate::game::{Game, GameSummary, InputAction, Snapshot};
use crate::settings::{Settings, normalize_name};
use crate::state::AppState;

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

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> AppResult<Settings> {
    Ok(state.settings().clone())
}

#[tauri::command]
pub fn save_settings(state: State<'_, AppState>, settings: Settings) -> AppResult<Settings> {
    let settings = settings.normalized();
    if let Some(game) = state.game().as_mut() {
        game.update_config(settings.game_config());
    }
    state.db().save_settings(&settings)?;
    *state.settings() = settings.clone();
    Ok(settings)
}

#[tauri::command]
pub fn reset_settings(state: State<'_, AppState>) -> AppResult<Settings> {
    save_settings(state, Settings::default())
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
pub fn get_stats(state: State<'_, AppState>) -> AppResult<Stats> {
    state.db().stats()
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

#[tauri::command]
pub fn get_game_state(state: State<'_, AppState>) -> AppResult<Option<Snapshot>> {
    Ok(state.game().as_mut().map(Game::snapshot))
}

#[tauri::command]
pub fn end_game(state: State<'_, AppState>) -> AppResult<()> {
    *state.game() = None;
    Ok(())
}

#[tauri::command]
pub fn game_over_info(state: State<'_, AppState>) -> AppResult<GameOverInfo> {
    let (summary, recorded) = {
        let guard = state.game();
        let game = guard.as_ref().ok_or(AppError::NoGame)?;
        if !game.is_over() {
            return Err(AppError::GameNotOver);
        }
        (game.summary(), game.is_recorded())
    };
    let rank = if recorded {
        None
    } else {
        state
            .db()
            .qualifying_rank(summary.score, HIGH_SCORE_LIMIT)?
    };
    let player_name = state.settings().player_name.clone();
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
pub fn get_db_path(state: State<'_, AppState>) -> AppResult<String> {
    Ok(state.db_path().display().to_string())
}

#[tauri::command]
pub fn quit(app: AppHandle) {
    app.exit(0);
}
