use rusqlite::{OptionalExtension, params};

use super::Database;
use crate::error::AppResult;
use crate::settings::Settings;

impl Database {
    pub fn load_settings(&self) -> AppResult<Option<Settings>> {
        let json: Option<String> = self
            .conn
            .query_row("SELECT json FROM settings WHERE id = 1", [], |row| {
                row.get(0)
            })
            .optional()?;
        match json {
            Some(json) => Ok(Some(serde_json::from_str::<Settings>(&json)?.normalized())),
            None => Ok(None),
        }
    }

    pub fn save_settings(&self, settings: &Settings) -> AppResult<()> {
        self.conn.execute(
            "INSERT INTO settings (id, json, updated_at)
             VALUES (1, ?1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
             ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at",
            params![serde_json::to_string(settings)?],
        )?;
        Ok(())
    }
}
