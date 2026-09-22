use serde::{Deserialize, Serialize};

use super::Database;
use crate::error::AppResult;

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub games: u64,
    pub total_score: u64,
    pub best_score: u64,
    pub total_lines: u64,
    pub best_lines: u64,
    pub total_time_ms: u64,
    pub total_pieces: u64,
    pub highest_level: u64,
    pub tetrises: u64,
    pub tspins: u64,
    pub perfect_clears: u64,
    pub best_combo: u64,
}

impl Database {
    pub fn stats(&self) -> AppResult<Stats> {
        let stats = self.conn.query_row(
            "SELECT COUNT(*),
                    COALESCE(SUM(score), 0),
                    COALESCE(MAX(score), 0),
                    COALESCE(SUM(lines), 0),
                    COALESCE(MAX(lines), 0),
                    COALESCE(SUM(duration_ms), 0),
                    COALESCE(SUM(pieces), 0),
                    COALESCE(MAX(level), 0),
                    COALESCE(SUM(tetrises), 0),
                    COALESCE(SUM(tspins), 0),
                    COALESCE(SUM(perfect_clears), 0),
                    COALESCE(MAX(max_combo), 0)
             FROM scores",
            [],
            |row| {
                let column = |i: usize| row.get::<_, i64>(i).map(|v| v.max(0) as u64);
                Ok(Stats {
                    games: column(0)?,
                    total_score: column(1)?,
                    best_score: column(2)?,
                    total_lines: column(3)?,
                    best_lines: column(4)?,
                    total_time_ms: column(5)?,
                    total_pieces: column(6)?,
                    highest_level: column(7)?,
                    tetrises: column(8)?,
                    tspins: column(9)?,
                    perfect_clears: column(10)?,
                    best_combo: column(11)?,
                })
            },
        )?;
        Ok(stats)
    }
}
