pub mod scores;
pub mod settings;

use std::path::Path;

use rusqlite::Connection;
use rusqlite_migration::{M, Migrations};

use crate::error::AppResult;

pub use scores::ScoreEntry;

pub const HIGH_SCORE_LIMIT: usize = 10;

pub struct Database {
    conn: Connection,
}

fn migrations() -> Migrations<'static> {
    Migrations::new(vec![M::up(
        "CREATE TABLE settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            json TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            score INTEGER NOT NULL,
            level INTEGER NOT NULL,
            lines INTEGER NOT NULL,
            start_level INTEGER NOT NULL,
            duration_ms INTEGER NOT NULL,
            pieces INTEGER NOT NULL,
            max_combo INTEGER NOT NULL,
            tetrises INTEGER NOT NULL,
            tspins INTEGER NOT NULL,
            perfect_clears INTEGER NOT NULL,
            played_at TEXT NOT NULL
        );
        CREATE INDEX scores_rank_idx ON scores (score DESC, played_at ASC);",
    )])
}

impl Database {
    pub fn open(path: &Path) -> AppResult<Self> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir)?;
        }
        Self::init(Connection::open(path)?)
    }

    pub fn open_in_memory() -> AppResult<Self> {
        Self::init(Connection::open_in_memory()?)
    }

    fn init(mut conn: Connection) -> AppResult<Self> {
        conn.execute_batch("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;")?;
        migrations().to_latest(&mut conn)?;
        Ok(Self { conn })
    }

    pub fn schema_version(&self) -> AppResult<u32> {
        Ok(self
            .conn
            .query_row("PRAGMA user_version", [], |row| row.get(0))?)
    }
}
