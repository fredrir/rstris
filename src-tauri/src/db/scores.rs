use rusqlite::{Row, params};
use serde::{Deserialize, Serialize};

use super::Database;
use crate::error::AppResult;
use crate::game::GameSummary;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoreEntry {
    pub id: i64,
    pub name: String,
    pub score: u64,
    pub level: u32,
    pub lines: u32,
    pub start_level: u32,
    pub duration_ms: u64,
    pub pieces: u32,
    pub max_combo: u32,
    pub tetrises: u32,
    pub tspins: u32,
    pub perfect_clears: u32,
    pub played_at: String,
}

const COLUMNS: &str = "id, name, score, level, lines, start_level, duration_ms, pieces, max_combo, tetrises, tspins, perfect_clears, played_at";

fn read_entry(row: &Row<'_>) -> rusqlite::Result<ScoreEntry> {
    Ok(ScoreEntry {
        id: row.get(0)?,
        name: row.get(1)?,
        score: row.get::<_, i64>(2)? as u64,
        level: row.get(3)?,
        lines: row.get(4)?,
        start_level: row.get(5)?,
        duration_ms: row.get::<_, i64>(6)? as u64,
        pieces: row.get(7)?,
        max_combo: row.get(8)?,
        tetrises: row.get(9)?,
        tspins: row.get(10)?,
        perfect_clears: row.get(11)?,
        played_at: row.get(12)?,
    })
}

impl Database {
    pub fn insert_score(&self, name: &str, summary: &GameSummary) -> AppResult<i64> {
        self.conn.execute(
            "INSERT INTO scores (name, score, level, lines, start_level, duration_ms, pieces, max_combo, tetrises, tspins, perfect_clears, played_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
            params![
                name,
                summary.score as i64,
                summary.level,
                summary.lines,
                summary.start_level,
                summary.duration_ms as i64,
                summary.pieces,
                summary.max_combo,
                summary.tetrises,
                summary.tspins,
                summary.perfect_clears,
            ],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn top_scores(&self, limit: usize) -> AppResult<Vec<ScoreEntry>> {
        let mut stmt = self.conn.prepare(&format!(
            "SELECT {COLUMNS} FROM scores ORDER BY score DESC, played_at ASC, id ASC LIMIT ?1"
        ))?;
        let rows = stmt.query_map([limit as i64], read_entry)?;
        Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
    }

    pub fn score_by_id(&self, id: i64) -> AppResult<Option<ScoreEntry>> {
        let mut stmt = self
            .conn
            .prepare(&format!("SELECT {COLUMNS} FROM scores WHERE id = ?1"))?;
        let mut rows = stmt.query_map([id], read_entry)?;
        Ok(rows.next().transpose()?)
    }

    pub fn rank_for(&self, score: u64) -> AppResult<usize> {
        let above: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM scores WHERE score >= ?1",
            [score as i64],
            |row| row.get(0),
        )?;
        Ok(above as usize + 1)
    }

    pub fn qualifying_rank(&self, score: u64, limit: usize) -> AppResult<Option<usize>> {
        let rank = self.rank_for(score)?;
        Ok((rank <= limit).then_some(rank))
    }

    pub fn clear_scores(&self) -> AppResult<()> {
        self.conn.execute("DELETE FROM scores", [])?;
        Ok(())
    }
}
