pub mod commands;
pub mod db;
pub mod error;
pub mod game;
pub mod game_loop;
pub mod meta;
pub mod settings;
pub mod state;

use tauri::Manager;

use db::Database;
use state::AppState;

pub const DB_FILE_NAME: &str = "rstris.sqlite3";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let path = app.path().app_data_dir()?.join(DB_FILE_NAME);
            let db = Database::open(&path)?;
            let settings = db.load_settings()?.unwrap_or_default();
            app.manage(AppState::new(db, settings));
            game_loop::spawn(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::update_settings,
            commands::assign_key,
            commands::reset_settings,
            commands::get_game_meta,
            commands::get_high_scores,
            commands::clear_high_scores,
            commands::new_game,
            commands::game_input,
            commands::key_input,
            commands::end_game,
            commands::submit_score,
            commands::quit,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run rstris");
}
