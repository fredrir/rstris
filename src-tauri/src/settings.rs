use serde::{Deserialize, Serialize};

use crate::game::{GameConfig, InputAction};

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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum KeyAction {
    MoveLeft,
    MoveRight,
    SoftDrop,
    HardDrop,
    RotateCw,
    RotateCcw,
    Rotate180,
    Hold,
    Pause,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SettingKey {
    StartLevel,
    NextCount,
    DasMs,
    ArrMs,
    SoftDropFactor,
    LockDelayMs,
    SoundVolume,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingLimit {
    pub key: SettingKey,
    pub min: u32,
    pub max: u32,
    pub step: u32,
    pub unit: Option<&'static str>,
}

/// Partial settings update. Absent fields keep their current value.
#[derive(Debug, Default, Clone, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct SettingsPatch {
    pub player_name: Option<String>,
    pub start_level: Option<u32>,
    pub ghost_piece: Option<bool>,
    pub hold_enabled: Option<bool>,
    pub next_count: Option<usize>,
    pub das_ms: Option<u64>,
    pub arr_ms: Option<u64>,
    pub soft_drop_factor: Option<u32>,
    pub lock_delay_ms: Option<u64>,
    pub sound_enabled: Option<bool>,
    pub sound_volume: Option<u8>,
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

pub fn setting_limits() -> Vec<SettingLimit> {
    use SettingKey::*;
    vec![
        SettingLimit {
            key: StartLevel,
            min: 1,
            max: 20,
            step: 1,
            unit: None,
        },
        SettingLimit {
            key: NextCount,
            min: 0,
            max: 6,
            step: 1,
            unit: None,
        },
        SettingLimit {
            key: DasMs,
            min: 0,
            max: 500,
            step: 5,
            unit: Some("ms"),
        },
        SettingLimit {
            key: ArrMs,
            min: 0,
            max: 200,
            step: 5,
            unit: Some("ms"),
        },
        SettingLimit {
            key: SoftDropFactor,
            min: 1,
            max: 40,
            step: 1,
            unit: Some("×"),
        },
        SettingLimit {
            key: LockDelayMs,
            min: 100,
            max: 1500,
            step: 50,
            unit: Some("ms"),
        },
        SettingLimit {
            key: SoundVolume,
            min: 0,
            max: 100,
            step: 5,
            unit: Some("%"),
        },
    ]
}

fn limit(key: SettingKey) -> SettingLimit {
    setting_limits()
        .into_iter()
        .find(|limit| limit.key == key)
        .expect("setting limit is registered")
}

impl SettingLimit {
    pub fn clamp_u32(self, value: u32) -> u32 {
        value.clamp(self.min, self.max)
    }

    pub fn clamp_usize(self, value: usize) -> usize {
        value.clamp(self.min as usize, self.max as usize)
    }

    pub fn clamp_u64(self, value: u64) -> u64 {
        value.clamp(self.min as u64, self.max as u64)
    }
}

impl Settings {
    pub fn normalized(mut self) -> Self {
        self.player_name = normalize_name(&self.player_name);
        self.start_level = limit(SettingKey::StartLevel).clamp_u32(self.start_level);
        self.next_count = limit(SettingKey::NextCount).clamp_usize(self.next_count);
        self.das_ms = limit(SettingKey::DasMs).clamp_u64(self.das_ms);
        self.arr_ms = limit(SettingKey::ArrMs).clamp_u64(self.arr_ms);
        self.soft_drop_factor = limit(SettingKey::SoftDropFactor).clamp_u32(self.soft_drop_factor);
        self.lock_delay_ms = limit(SettingKey::LockDelayMs).clamp_u64(self.lock_delay_ms);
        self.sound_volume =
            limit(SettingKey::SoundVolume).clamp_u32(self.sound_volume as u32) as u8;
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

impl SettingsPatch {
    pub fn apply(self, current: &Settings) -> Settings {
        let mut next = current.clone();
        if let Some(value) = self.player_name {
            next.player_name = value;
        }
        if let Some(value) = self.start_level {
            next.start_level = value;
        }
        if let Some(value) = self.ghost_piece {
            next.ghost_piece = value;
        }
        if let Some(value) = self.hold_enabled {
            next.hold_enabled = value;
        }
        if let Some(value) = self.next_count {
            next.next_count = value;
        }
        if let Some(value) = self.das_ms {
            next.das_ms = value;
        }
        if let Some(value) = self.arr_ms {
            next.arr_ms = value;
        }
        if let Some(value) = self.soft_drop_factor {
            next.soft_drop_factor = value;
        }
        if let Some(value) = self.lock_delay_ms {
            next.lock_delay_ms = value;
        }
        if let Some(value) = self.sound_enabled {
            next.sound_enabled = value;
        }
        if let Some(value) = self.sound_volume {
            next.sound_volume = value;
        }
        next.normalized()
    }
}

impl KeyAction {
    pub const ALL: [KeyAction; 9] = [
        KeyAction::MoveLeft,
        KeyAction::MoveRight,
        KeyAction::SoftDrop,
        KeyAction::HardDrop,
        KeyAction::RotateCw,
        KeyAction::RotateCcw,
        KeyAction::Rotate180,
        KeyAction::Hold,
        KeyAction::Pause,
    ];

    pub fn input(self, pressed: bool) -> Option<InputAction> {
        use InputAction::*;
        match self {
            KeyAction::MoveLeft => Some(if pressed { LeftPress } else { LeftRelease }),
            KeyAction::MoveRight => Some(if pressed { RightPress } else { RightRelease }),
            KeyAction::SoftDrop => Some(if pressed {
                SoftDropPress
            } else {
                SoftDropRelease
            }),
            KeyAction::HardDrop => pressed.then_some(HardDrop),
            KeyAction::RotateCw => pressed.then_some(RotateCw),
            KeyAction::RotateCcw => pressed.then_some(RotateCcw),
            KeyAction::Rotate180 => pressed.then_some(Rotate180),
            KeyAction::Hold => pressed.then_some(Hold),
            KeyAction::Pause => pressed.then_some(TogglePause),
        }
    }
}

impl KeyBindings {
    pub fn list(&self, action: KeyAction) -> &[String] {
        match action {
            KeyAction::MoveLeft => &self.move_left,
            KeyAction::MoveRight => &self.move_right,
            KeyAction::SoftDrop => &self.soft_drop,
            KeyAction::HardDrop => &self.hard_drop,
            KeyAction::RotateCw => &self.rotate_cw,
            KeyAction::RotateCcw => &self.rotate_ccw,
            KeyAction::Rotate180 => &self.rotate_180,
            KeyAction::Hold => &self.hold,
            KeyAction::Pause => &self.pause,
        }
    }

    fn list_mut(&mut self, action: KeyAction) -> &mut Vec<String> {
        match action {
            KeyAction::MoveLeft => &mut self.move_left,
            KeyAction::MoveRight => &mut self.move_right,
            KeyAction::SoftDrop => &mut self.soft_drop,
            KeyAction::HardDrop => &mut self.hard_drop,
            KeyAction::RotateCw => &mut self.rotate_cw,
            KeyAction::RotateCcw => &mut self.rotate_ccw,
            KeyAction::Rotate180 => &mut self.rotate_180,
            KeyAction::Hold => &mut self.hold,
            KeyAction::Pause => &mut self.pause,
        }
    }

    pub fn resolve(&self, code: &str) -> Option<KeyAction> {
        KeyAction::ALL
            .into_iter()
            .find(|action| self.list(*action).iter().any(|bound| bound == code))
    }

    /// Binds `code` to `slot`, evicting it from any other action. Passing
    /// `None` clears the slot. Always returns normalized bindings.
    pub fn assign(mut self, action: KeyAction, slot: usize, code: Option<String>) -> Self {
        let code = code
            .map(|code| code.trim().to_string())
            .filter(|code| !code.is_empty());
        if let Some(code) = &code {
            for other in KeyAction::ALL {
                self.list_mut(other).retain(|bound| bound != code);
            }
        }
        let list = self.list_mut(action);
        match &code {
            Some(code) if slot < list.len() => list[slot] = code.clone(),
            Some(code) => list.push(code.clone()),
            None if slot < list.len() => {
                list.remove(slot);
            }
            None => {}
        }
        self.normalized()
    }

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
