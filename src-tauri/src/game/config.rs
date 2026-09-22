use std::time::Duration;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct GameConfig {
    pub start_level: u32,
    pub ghost_piece: bool,
    pub hold_enabled: bool,
    pub next_count: usize,
    pub das_ms: u64,
    pub arr_ms: u64,
    pub soft_drop_factor: u32,
    pub lock_delay_ms: u64,
    pub seed: Option<u64>,
}

impl Default for GameConfig {
    fn default() -> Self {
        Self {
            start_level: 1,
            ghost_piece: true,
            hold_enabled: true,
            next_count: 5,
            das_ms: 133,
            arr_ms: 20,
            soft_drop_factor: 20,
            lock_delay_ms: 500,
            seed: None,
        }
    }
}

impl GameConfig {
    pub fn das(&self) -> Duration {
        Duration::from_millis(self.das_ms)
    }

    pub fn arr(&self) -> Duration {
        Duration::from_millis(self.arr_ms)
    }

    pub fn lock_delay(&self) -> Duration {
        Duration::from_millis(self.lock_delay_ms)
    }
}
