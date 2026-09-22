use serde::{Deserialize, Serialize};

use crate::game::GameConfig;

pub const MAX_NAME_LEN: usize = 16;
pub const MAX_KEYS_PER_ACTION: usize = 2;
pub const DEFAULT_PLAYER_NAME: &str = "Player";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub player_name: String,
    pub start_level: u32,
    pub ghost_piece: bool,
    pub hold_enabled: bool,
    pub next_count: usize,
    pub das_ms: u64,
    pub arr_ms: u64,
    pub soft_drop_factor: u32,
    pub lock_delay_ms: u64,
    pub sound_enabled: bool,
    pub sound_volume: u8,
    pub keys: KeyBindings,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct KeyBindings {
    pub move_left: Vec<String>,
    pub move_right: Vec<String>,
    pub soft_drop: Vec<String>,
    pub hard_drop: Vec<String>,
    pub rotate_cw: Vec<String>,
    pub rotate_ccw: Vec<String>,
    pub rotate_180: Vec<String>,
    pub hold: Vec<String>,
    pub pause: Vec<String>,
}

impl Default for Settings {
    fn default() -> Self {
        let game = GameConfig::default();
        Self {
            player_name: DEFAULT_PLAYER_NAME.to_string(),
            start_level: game.start_level,
            ghost_piece: game.ghost_piece,
            hold_enabled: game.hold_enabled,
            next_count: game.next_count,
            das_ms: game.das_ms,
            arr_ms: game.arr_ms,
            soft_drop_factor: game.soft_drop_factor,
            lock_delay_ms: game.lock_delay_ms,
            sound_enabled: true,
            sound_volume: 60,
            keys: KeyBindings::default(),
        }
    }
}

impl Default for KeyBindings {
    fn default() -> Self {
        let keys = |list: &[&str]| list.iter().map(|k| k.to_string()).collect();
        Self {
            move_left: keys(&["ArrowLeft"]),
            move_right: keys(&["ArrowRight"]),
            soft_drop: keys(&["ArrowDown"]),
            hard_drop: keys(&["Space"]),
            rotate_cw: keys(&["ArrowUp", "KeyX"]),
            rotate_ccw: keys(&["KeyZ", "ControlLeft"]),
            rotate_180: keys(&["KeyA"]),
            hold: keys(&["KeyC", "ShiftLeft"]),
            pause: keys(&["Escape", "KeyP"]),
        }
    }
}

impl Settings {
    pub fn normalized(mut self) -> Self {
        self.player_name = normalize_name(&self.player_name);
        self.start_level = self.start_level.clamp(1, 20);
        self.next_count = self.next_count.min(6);
        self.das_ms = self.das_ms.clamp(0, 500);
        self.arr_ms = self.arr_ms.clamp(0, 200);
        self.soft_drop_factor = self.soft_drop_factor.clamp(1, 40);
        self.lock_delay_ms = self.lock_delay_ms.clamp(100, 1500);
        self.sound_volume = self.sound_volume.min(100);
        self.keys = self.keys.normalized();
        self
    }

    pub fn game_config(&self) -> GameConfig {
        GameConfig {
            start_level: self.start_level,
            ghost_piece: self.ghost_piece,
            hold_enabled: self.hold_enabled,
            next_count: self.next_count,
            das_ms: self.das_ms,
            arr_ms: self.arr_ms,
            soft_drop_factor: self.soft_drop_factor,
            lock_delay_ms: self.lock_delay_ms,
            seed: None,
        }
    }
}

impl KeyBindings {
    pub fn normalized(self) -> Self {
        let mut seen: Vec<String> = Vec::new();
        let mut take = |keys: Vec<String>| -> Vec<String> {
            let mut out = Vec::new();
            for key in keys {
                let key = key.trim().to_string();
                if key.is_empty() || seen.contains(&key) || out.len() >= MAX_KEYS_PER_ACTION {
                    continue;
                }
                seen.push(key.clone());
                out.push(key);
            }
            out
        };
        Self {
            move_left: take(self.move_left),
            move_right: take(self.move_right),
            soft_drop: take(self.soft_drop),
            hard_drop: take(self.hard_drop),
            rotate_cw: take(self.rotate_cw),
            rotate_ccw: take(self.rotate_ccw),
            rotate_180: take(self.rotate_180),
            hold: take(self.hold),
            pause: take(self.pause),
        }
    }
}

pub fn normalize_name(name: &str) -> String {
    let trimmed: String = name.trim().chars().take(MAX_NAME_LEN).collect();
    if trimmed.is_empty() {
        DEFAULT_PLAYER_NAME.to_string()
    } else {
        trimmed
    }
}
