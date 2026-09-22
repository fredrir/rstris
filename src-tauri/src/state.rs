use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard, PoisonError};

use crate::db::Database;
use crate::game::Game;
use crate::settings::Settings;

pub struct AppState {
    db_path: PathBuf,
    db: Mutex<Database>,
    game: Mutex<Option<Game>>,
    settings: Mutex<Settings>,
}

impl AppState {
    pub fn new(db_path: PathBuf, db: Database, settings: Settings) -> Self {
        Self {
            db_path,
            db: Mutex::new(db),
            game: Mutex::new(None),
            settings: Mutex::new(settings),
        }
    }

    pub fn db_path(&self) -> &Path {
        &self.db_path
    }

    pub fn db(&self) -> MutexGuard<'_, Database> {
        lock(&self.db)
    }

    pub fn game(&self) -> MutexGuard<'_, Option<Game>> {
        lock(&self.game)
    }

    pub fn settings(&self) -> MutexGuard<'_, Settings> {
        lock(&self.settings)
    }
}

fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(PoisonError::into_inner)
}
