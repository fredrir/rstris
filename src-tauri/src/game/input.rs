use std::time::Duration;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InputAction {
    LeftPress,
    LeftRelease,
    RightPress,
    RightRelease,
    SoftDropPress,
    SoftDropRelease,
    HardDrop,
    RotateCw,
    RotateCcw,
    Rotate180,
    Hold,
    Pause,
    Resume,
    TogglePause,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Horizontal {
    Left,
    Right,
}

impl Horizontal {
    pub fn dx(self) -> i32 {
        match self {
            Horizontal::Left => -1,
            Horizontal::Right => 1,
        }
    }

    pub fn opposite(self) -> Horizontal {
        match self {
            Horizontal::Left => Horizontal::Right,
            Horizontal::Right => Horizontal::Left,
        }
    }
}

#[derive(Debug, Default, Clone)]
pub struct AutoShift {
    left_held: bool,
    right_held: bool,
    soft_held: bool,
    active: Option<Horizontal>,
    das_elapsed: Duration,
    arr_elapsed: Duration,
}

impl AutoShift {
    pub fn press(&mut self, dir: Horizontal) {
        *self.held_mut(dir) = true;
        self.activate(Some(dir));
    }

    pub fn release(&mut self, dir: Horizontal) -> Option<Horizontal> {
        *self.held_mut(dir) = false;
        if self.active != Some(dir) {
            return None;
        }
        let other = dir.opposite();
        let fallback = self.is_held(other).then_some(other);
        self.activate(fallback);
        fallback
    }

    pub fn set_soft(&mut self, held: bool) {
        self.soft_held = held;
    }

    pub fn soft_held(&self) -> bool {
        self.soft_held
    }

    pub fn active(&self) -> Option<Horizontal> {
        self.active
    }

    pub fn release_all(&mut self) {
        *self = Self::default();
    }

    pub fn advance(
        &mut self,
        dt: Duration,
        das: Duration,
        arr: Duration,
    ) -> (Option<Horizontal>, usize) {
        let Some(dir) = self.active else {
            return (None, 0);
        };
        let before = self.das_elapsed;
        self.das_elapsed += dt;
        if self.das_elapsed < das {
            return (Some(dir), 0);
        }
        if arr.is_zero() {
            return (Some(dir), usize::MAX);
        }
        if before < das {
            self.arr_elapsed = self.das_elapsed - das + arr;
        } else {
            self.arr_elapsed += dt;
        }
        let repeats = (self.arr_elapsed.as_nanos() / arr.as_nanos()) as usize;
        self.arr_elapsed -= arr * repeats as u32;
        (Some(dir), repeats)
    }

    fn activate(&mut self, dir: Option<Horizontal>) {
        self.active = dir;
        self.das_elapsed = Duration::ZERO;
        self.arr_elapsed = Duration::ZERO;
    }

    fn is_held(&self, dir: Horizontal) -> bool {
        match dir {
            Horizontal::Left => self.left_held,
            Horizontal::Right => self.right_held,
        }
    }

    fn held_mut(&mut self, dir: Horizontal) -> &mut bool {
        match dir {
            Horizontal::Left => &mut self.left_held,
            Horizontal::Right => &mut self.right_held,
        }
    }
}
