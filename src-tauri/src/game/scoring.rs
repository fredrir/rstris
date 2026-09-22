use std::time::Duration;

use serde::{Deserialize, Serialize};

pub const LINES_PER_LEVEL: u32 = 10;
pub const MAX_LEVEL: u32 = 30;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SpinKind {
    None,
    Mini,
    Full,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClearResult {
    pub lines: u32,
    pub spin: SpinKind,
    pub back_to_back: bool,
    pub combo: u32,
    pub perfect_clear: bool,
    pub points: u64,
    pub label: String,
}

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct LockOutcome {
    pub clear: Option<ClearResult>,
    pub level_up: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Scoring {
    score: u64,
    level: u32,
    lines: u32,
    combo: i32,
    back_to_back: bool,
    start_level: u32,
}

impl Scoring {
    pub fn new(start_level: u32) -> Self {
        let start_level = start_level.clamp(1, MAX_LEVEL);
        Self {
            score: 0,
            level: start_level,
            lines: 0,
            combo: -1,
            back_to_back: false,
            start_level,
        }
    }

    pub fn score(&self) -> u64 {
        self.score
    }

    pub fn level(&self) -> u32 {
        self.level
    }

    pub fn lines(&self) -> u32 {
        self.lines
    }

    pub fn combo(&self) -> i32 {
        self.combo
    }

    pub fn back_to_back(&self) -> bool {
        self.back_to_back
    }

    pub fn start_level(&self) -> u32 {
        self.start_level
    }

    pub fn lines_to_next_level(&self) -> u32 {
        LINES_PER_LEVEL - self.lines % LINES_PER_LEVEL
    }

    pub fn gravity(&self) -> Duration {
        gravity_for_level(self.level)
    }

    pub fn add(&mut self, points: u64) {
        self.score += points;
    }

    pub fn on_lock(&mut self, lines: u32, spin: SpinKind, perfect_clear: bool) -> LockOutcome {
        if lines == 0 && spin == SpinKind::None {
            self.combo = -1;
            return LockOutcome::default();
        }
        let level = self.level as u64;
        let (base, label, difficult) = base_points(lines, spin);
        if lines == 0 {
            self.combo = -1;
            let points = base * level;
            self.score += points;
            return LockOutcome {
                clear: Some(ClearResult {
                    lines,
                    spin,
                    back_to_back: false,
                    combo: 0,
                    perfect_clear: false,
                    points,
                    label: label.to_string(),
                }),
                level_up: None,
            };
        }
        self.combo += 1;
        let back_to_back = difficult && self.back_to_back;
        let mut points = base * level;
        if back_to_back {
            points = points * 3 / 2;
        }
        if self.combo > 0 {
            points += 50 * self.combo as u64 * level;
        }
        if perfect_clear {
            points += perfect_clear_bonus(lines, back_to_back) * level;
        }
        self.back_to_back = difficult;
        self.score += points;
        self.lines += lines;
        let next_level = (self.start_level + self.lines / LINES_PER_LEVEL).min(MAX_LEVEL);
        let level_up = (next_level > self.level).then_some(next_level);
        self.level = next_level;
        LockOutcome {
            clear: Some(ClearResult {
                lines,
                spin,
                back_to_back,
                combo: self.combo as u32,
                perfect_clear,
                points,
                label: label.to_string(),
            }),
            level_up,
        }
    }
}

fn base_points(lines: u32, spin: SpinKind) -> (u64, &'static str, bool) {
    match (lines, spin) {
        (0, SpinKind::Mini) => (100, "T-SPIN MINI", false),
        (0, SpinKind::Full) => (400, "T-SPIN", false),
        (1, SpinKind::None) => (100, "SINGLE", false),
        (2, SpinKind::None) => (300, "DOUBLE", false),
        (3, SpinKind::None) => (500, "TRIPLE", false),
        (1, SpinKind::Mini) => (200, "T-SPIN MINI SINGLE", true),
        (2, SpinKind::Mini) => (400, "T-SPIN MINI DOUBLE", true),
        (1, SpinKind::Full) => (800, "T-SPIN SINGLE", true),
        (2, SpinKind::Full) => (1200, "T-SPIN DOUBLE", true),
        (3, SpinKind::Full) => (1600, "T-SPIN TRIPLE", true),
        (_, _) => (800, "TETRIS", true),
    }
}

fn perfect_clear_bonus(lines: u32, back_to_back: bool) -> u64 {
    match lines {
        1 => 800,
        2 => 1200,
        3 => 1800,
        _ if back_to_back => 3200,
        _ => 2000,
    }
}

pub fn gravity_for_level(level: u32) -> Duration {
    let l = (level.clamp(1, MAX_LEVEL) - 1) as f64;
    let seconds = (0.8 - l * 0.007).powf(l);
    Duration::from_secs_f64(seconds.max(0.008))
}
