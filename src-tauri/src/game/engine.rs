use std::collections::VecDeque;
use std::time::Duration;

use serde::{Deserialize, Serialize};

use super::bag::Bag;
use super::board::{Board, HIDDEN_ROWS, WIDTH};
use super::config::GameConfig;
use super::input::{AutoShift, Horizontal, InputAction};
use super::piece::{Rotation, Tetromino, kicks};
use super::scoring::{ClearResult, Scoring, SpinKind};
use super::snapshot::{GameEvent, PieceView, Snapshot};

pub const COUNTDOWN: Duration = Duration::from_millis(1500);
pub const CLEAR_ANIMATION: Duration = Duration::from_millis(280);
pub const MAX_LOCK_RESETS: u32 = 15;
const QUEUE_LEN: usize = 7;
const MAX_STEP: Duration = Duration::from_millis(50);
const LOCK_PROGRESS_STEPS: u32 = 20;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ActivePiece {
    pub kind: Tetromino,
    pub rotation: Rotation,
    pub x: i32,
    pub y: i32,
}

impl ActivePiece {
    pub fn cells(&self) -> [(i32, i32); 4] {
        self.cells_at(self.rotation, self.x, self.y)
    }

    pub fn cells_at(&self, rotation: Rotation, x: i32, y: i32) -> [(i32, i32); 4] {
        self.kind.cells(rotation).map(|(cx, cy)| (x + cx, y + cy))
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum Phase {
    Playing,
    Clearing { rows: Vec<usize>, remaining_ms: u64 },
    GameOver,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum LastMove {
    None,
    Shift,
    Drop,
    Rotate { kick: usize },
}

#[derive(Debug, Default, Clone, Copy)]
struct LockState {
    elapsed: Duration,
    resets: u32,
    lowest_y: i32,
}

#[derive(Debug, Default, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameSummary {
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
}

#[derive(Debug)]
pub struct Game {
    config: GameConfig,
    board: Board,
    bag: Bag,
    queue: VecDeque<Tetromino>,
    active: Option<ActivePiece>,
    hold: Option<Tetromino>,
    hold_used: bool,
    scoring: Scoring,
    phase: Phase,
    paused: bool,
    countdown: Option<Duration>,
    shift: AutoShift,
    gravity_acc: Duration,
    lock: LockState,
    last_move: LastMove,
    elapsed: Duration,
    pieces: u32,
    max_combo: u32,
    tetrises: u32,
    tspins: u32,
    perfect_clears: u32,
    last_clear: Option<ClearResult>,
    events: Vec<GameEvent>,
    version: u64,
    recorded: bool,
}

impl Game {
    pub fn new(config: GameConfig) -> Self {
        let mut bag = Bag::new(config.seed);
        let queue = (0..QUEUE_LEN).map(|_| bag.draw()).collect();
        let mut game = Self {
            scoring: Scoring::new(config.start_level),
            config,
            board: Board::new(),
            bag,
            queue,
            active: None,
            hold: None,
            hold_used: false,
            phase: Phase::Playing,
            paused: false,
            countdown: Some(COUNTDOWN),
            shift: AutoShift::default(),
            gravity_acc: Duration::ZERO,
            lock: LockState::default(),
            last_move: LastMove::None,
            elapsed: Duration::ZERO,
            pieces: 0,
            max_combo: 0,
            tetrises: 0,
            tspins: 0,
            perfect_clears: 0,
            last_clear: None,
            events: Vec::new(),
            version: 1,
            recorded: false,
        };
        game.spawn_next();
        game
    }

    pub fn version(&self) -> u64 {
        self.version
    }

    pub fn config(&self) -> &GameConfig {
        &self.config
    }

    pub fn board(&self) -> &Board {
        &self.board
    }

    pub fn active(&self) -> Option<ActivePiece> {
        self.active
    }

    pub fn hold(&self) -> Option<Tetromino> {
        self.hold
    }

    pub fn phase(&self) -> &Phase {
        &self.phase
    }

    pub fn is_paused(&self) -> bool {
        self.paused
    }

    pub fn is_over(&self) -> bool {
        self.phase == Phase::GameOver
    }

    pub fn is_recorded(&self) -> bool {
        self.recorded
    }

    pub fn mark_recorded(&mut self) {
        self.recorded = true;
    }

    pub fn scoring(&self) -> &Scoring {
        &self.scoring
    }

    pub fn next_queue(&self) -> impl Iterator<Item = Tetromino> + '_ {
        self.queue.iter().copied().take(self.config.next_count)
    }

    pub fn summary(&self) -> GameSummary {
        GameSummary {
            score: self.scoring.score(),
            level: self.scoring.level(),
            lines: self.scoring.lines(),
            start_level: self.scoring.start_level(),
            duration_ms: self.elapsed.as_millis() as u64,
            pieces: self.pieces,
            max_combo: self.max_combo,
            tetrises: self.tetrises,
            tspins: self.tspins,
            perfect_clears: self.perfect_clears,
        }
    }

    pub fn update_config(&mut self, config: GameConfig) {
        self.config = GameConfig {
            start_level: self.config.start_level,
            seed: self.config.seed,
            ..config
        };
        if !self.config.hold_enabled {
            self.hold_used = false;
        }
        self.touch();
    }

    pub fn skip_countdown(&mut self) {
        self.countdown = None;
    }

    pub fn set_board(&mut self, board: Board) {
        self.board = board;
        self.touch();
    }

    pub fn set_active(&mut self, piece: ActivePiece) {
        self.active = Some(piece);
        self.gravity_acc = Duration::ZERO;
        self.lock = LockState {
            lowest_y: piece.y,
            ..LockState::default()
        };
        self.last_move = LastMove::None;
        self.touch();
    }

    pub fn update(&mut self, dt: Duration) {
        if self.paused || self.phase == Phase::GameOver {
            return;
        }
        let dt = dt.min(MAX_STEP);
        if let Some(remaining) = self.countdown {
            self.countdown = remaining.checked_sub(dt).filter(|r| !r.is_zero());
            self.touch();
            return;
        }
        let seconds_before = self.elapsed.as_secs();
        self.elapsed += dt;
        if self.elapsed.as_secs() != seconds_before {
            self.touch();
        }
        match self.phase.clone() {
            Phase::Playing => self.update_playing(dt),
            Phase::Clearing { rows, remaining_ms } => {
                match Duration::from_millis(remaining_ms).checked_sub(dt) {
                    Some(remaining) if !remaining.is_zero() => {
                        self.phase = Phase::Clearing {
                            rows,
                            remaining_ms: remaining.as_millis() as u64,
                        };
                    }
                    _ => {
                        self.board.clear_rows(&rows);
                        self.phase = Phase::Playing;
                        self.spawn_next();
                    }
                }
                self.touch();
            }
            Phase::GameOver => {}
        }
    }

    pub fn apply(&mut self, action: InputAction) {
        match action {
            InputAction::Pause => self.pause(),
            InputAction::Resume => self.resume(),
            InputAction::TogglePause => {
                if self.paused {
                    self.resume();
                } else {
                    self.pause();
                }
            }
            InputAction::LeftPress => self.press(Horizontal::Left),
            InputAction::RightPress => self.press(Horizontal::Right),
            InputAction::LeftRelease => self.release(Horizontal::Left),
            InputAction::RightRelease => self.release(Horizontal::Right),
            InputAction::SoftDropPress => {
                self.shift.set_soft(true);
                if self.accepts_moves() {
                    self.gravity_acc = Duration::ZERO;
                    if self.try_fall() {
                        self.scoring.add(1);
                        self.push(GameEvent::SoftDrop);
                    }
                }
            }
            InputAction::SoftDropRelease => self.shift.set_soft(false),
            InputAction::HardDrop => {
                if self.accepts_moves() {
                    self.hard_drop();
                }
            }
            InputAction::RotateCw => self.rotate(|r| r.cw()),
            InputAction::RotateCcw => self.rotate(|r| r.ccw()),
            InputAction::Rotate180 => self.rotate(|r| r.flip()),
            InputAction::Hold => {
                if self.accepts_moves() {
                    self.hold_piece();
                }
            }
        }
    }

    pub fn snapshot(&mut self) -> Snapshot {
        let active = self.active.map(|piece| PieceView {
            kind: piece.kind,
            cells: to_visible(piece.cells()),
        });
        let ghost = match (self.active, self.config.ghost_piece, &self.phase) {
            (Some(piece), true, Phase::Playing) => {
                let distance = self.drop_distance(&piece);
                Some(to_visible(piece.cells_at(
                    piece.rotation,
                    piece.x,
                    piece.y + distance,
                )))
            }
            _ => None,
        };
        Snapshot {
            version: self.version,
            board: self
                .board
                .visible_rows()
                .iter()
                .map(|row| row.to_vec())
                .collect(),
            active,
            ghost,
            hold: self.hold,
            hold_available: self.config.hold_enabled && !self.hold_used,
            next: self.next_queue().collect(),
            score: self.scoring.score(),
            level: self.scoring.level(),
            lines: self.scoring.lines(),
            lines_to_next_level: self.scoring.lines_to_next_level(),
            combo: self.scoring.combo(),
            back_to_back: self.scoring.back_to_back(),
            phase: self.phase.clone(),
            paused: self.paused,
            countdown_ms: self.countdown.map(|d| d.as_millis() as u64),
            elapsed_ms: self.elapsed.as_millis() as u64,
            pieces: self.pieces,
            gravity_ms: self.scoring.gravity().as_millis() as u64,
            lock_progress: self.lock_progress(),
            last_clear: self.last_clear.clone(),
            events: std::mem::take(&mut self.events),
        }
    }

    fn accepts_moves(&self) -> bool {
        !self.paused
            && self.countdown.is_none()
            && self.phase == Phase::Playing
            && self.active.is_some()
    }

    fn pause(&mut self) {
        if self.paused || self.phase == Phase::GameOver {
            return;
        }
        self.paused = true;
        self.shift.release_all();
        self.touch();
    }

    fn resume(&mut self) {
        if !self.paused {
            return;
        }
        self.paused = false;
        self.countdown = Some(COUNTDOWN);
        self.touch();
    }

    fn press(&mut self, dir: Horizontal) {
        self.shift.press(dir);
        if self.accepts_moves() {
            self.try_shift(dir);
        }
    }

    fn release(&mut self, dir: Horizontal) {
        if let Some(other) = self.shift.release(dir)
            && self.accepts_moves()
        {
            self.try_shift(other);
        }
    }

    fn rotate(&mut self, target: impl Fn(Rotation) -> Rotation) {
        if !self.accepts_moves() {
            return;
        }
        let Some(piece) = self.active else { return };
        self.try_rotate(target(piece.rotation));
    }

    fn update_playing(&mut self, dt: Duration) {
        if self.active.is_none() {
            return;
        }
        let (dir, repeats) = self.shift.advance(dt, self.config.das(), self.config.arr());
        if let Some(dir) = dir {
            for _ in 0..repeats.min(WIDTH) {
                if !self.try_shift(dir) {
                    break;
                }
            }
        }
        let interval = self.fall_interval();
        self.gravity_acc += dt;
        while self.gravity_acc >= interval {
            self.gravity_acc -= interval;
            if self.try_fall() {
                if self.shift.soft_held() {
                    self.scoring.add(1);
                    self.push(GameEvent::SoftDrop);
                }
            } else {
                self.gravity_acc = Duration::ZERO;
                break;
            }
        }
        if self.is_grounded() {
            let step_before = self.lock_step();
            self.lock.elapsed += dt;
            if self.lock.elapsed >= self.config.lock_delay() {
                self.lock_piece();
            } else if self.lock_step() != step_before {
                self.touch();
            }
        } else {
            self.lock.elapsed = Duration::ZERO;
        }
    }

    fn fall_interval(&self) -> Duration {
        let gravity = self.scoring.gravity();
        if self.shift.soft_held() {
            (gravity / self.config.soft_drop_factor.max(1)).max(Duration::from_millis(1))
        } else {
            gravity
        }
    }

    fn lock_step(&self) -> u32 {
        (self.lock_progress() * LOCK_PROGRESS_STEPS as f32) as u32
    }

    fn lock_progress(&self) -> f32 {
        if self.phase != Phase::Playing || !self.is_grounded() {
            return 0.0;
        }
        let delay = self.config.lock_delay().as_secs_f32().max(0.001);
        (self.lock.elapsed.as_secs_f32() / delay).clamp(0.0, 1.0)
    }

    fn is_grounded(&self) -> bool {
        match self.active {
            Some(piece) => !self
                .board
                .fits(&piece.cells_at(piece.rotation, piece.x, piece.y + 1)),
            None => false,
        }
    }

    fn drop_distance(&self, piece: &ActivePiece) -> i32 {
        let mut distance = 0;
        while self
            .board
            .fits(&piece.cells_at(piece.rotation, piece.x, piece.y + distance + 1))
        {
            distance += 1;
        }
        distance
    }

    fn try_shift(&mut self, dir: Horizontal) -> bool {
        let Some(piece) = self.active else {
            return false;
        };
        let x = piece.x + dir.dx();
        if !self.board.fits(&piece.cells_at(piece.rotation, x, piece.y)) {
            return false;
        }
        self.active = Some(ActivePiece { x, ..piece });
        self.last_move = LastMove::Shift;
        self.after_manual_move();
        self.push(GameEvent::Move);
        true
    }

    fn try_rotate(&mut self, target: Rotation) -> bool {
        let Some(piece) = self.active else {
            return false;
        };
        if piece.kind == Tetromino::O {
            return false;
        }
        for (index, &(kx, ky)) in kicks(piece.kind, piece.rotation, target).iter().enumerate() {
            let (x, y) = (piece.x + kx, piece.y + ky);
            if self.board.fits(&piece.cells_at(target, x, y)) {
                self.active = Some(ActivePiece {
                    rotation: target,
                    x,
                    y,
                    ..piece
                });
                self.last_move = LastMove::Rotate { kick: index };
                self.after_manual_move();
                self.push(GameEvent::Rotate);
                return true;
            }
        }
        false
    }

    fn try_fall(&mut self) -> bool {
        let Some(piece) = self.active else {
            return false;
        };
        let y = piece.y + 1;
        if !self.board.fits(&piece.cells_at(piece.rotation, piece.x, y)) {
            return false;
        }
        self.active = Some(ActivePiece { y, ..piece });
        self.last_move = LastMove::Drop;
        if y > self.lock.lowest_y {
            self.lock.lowest_y = y;
            self.lock.resets = 0;
        }
        self.lock.elapsed = Duration::ZERO;
        self.touch();
        true
    }

    fn after_manual_move(&mut self) {
        if self.is_grounded() && self.lock.resets < MAX_LOCK_RESETS {
            self.lock.resets += 1;
            self.lock.elapsed = Duration::ZERO;
        }
        self.touch();
    }

    fn hard_drop(&mut self) {
        let Some(piece) = self.active else { return };
        let distance = self.drop_distance(&piece);
        if distance > 0 {
            self.active = Some(ActivePiece {
                y: piece.y + distance,
                ..piece
            });
            self.last_move = LastMove::Drop;
            self.scoring.add(2 * distance as u64);
        }
        self.push(GameEvent::HardDrop {
            distance: distance as u32,
        });
        self.lock_piece();
    }

    fn hold_piece(&mut self) {
        if !self.config.hold_enabled || self.hold_used {
            return;
        }
        let Some(piece) = self.active.take() else {
            return;
        };
        self.hold_used = true;
        self.push(GameEvent::Hold);
        match self.hold.replace(piece.kind) {
            Some(previous) => self.spawn(previous),
            None => self.spawn_next(),
        }
    }

    fn lock_piece(&mut self) {
        let Some(piece) = self.active.take() else {
            return;
        };
        let cells = piece.cells();
        self.board.fill(&cells, piece.kind);
        self.pieces += 1;
        self.hold_used = false;
        self.push(GameEvent::Lock);
        if cells.iter().all(|&(_, y)| y < HIDDEN_ROWS as i32) {
            self.game_over();
            return;
        }
        let spin = self.detect_spin(&piece);
        let rows = self.board.full_rows();
        let perfect_clear = !rows.is_empty() && self.board.is_empty_except(&rows);
        let outcome = self.scoring.on_lock(rows.len() as u32, spin, perfect_clear);
        if let Some(clear) = outcome.clear {
            self.max_combo = self.max_combo.max(clear.combo);
            if clear.lines == 4 {
                self.tetrises += 1;
            }
            if clear.spin != SpinKind::None {
                self.tspins += 1;
            }
            if clear.perfect_clear {
                self.perfect_clears += 1;
            }
            self.push(GameEvent::LineClear {
                result: clear.clone(),
            });
            self.last_clear = Some(clear);
        }
        if let Some(level) = outcome.level_up {
            self.push(GameEvent::LevelUp { level });
        }
        if rows.is_empty() {
            self.spawn_next();
        } else {
            self.phase = Phase::Clearing {
                rows,
                remaining_ms: CLEAR_ANIMATION.as_millis() as u64,
            };
        }
        self.touch();
    }

    fn detect_spin(&self, piece: &ActivePiece) -> SpinKind {
        let LastMove::Rotate { kick } = self.last_move else {
            return SpinKind::None;
        };
        if piece.kind != Tetromino::T {
            return SpinKind::None;
        }
        let corner = |dx: i32, dy: i32| self.board.is_blocked(piece.x + dx, piece.y + dy);
        let (top_left, top_right) = (corner(0, 0), corner(2, 0));
        let (bottom_left, bottom_right) = (corner(0, 2), corner(2, 2));
        let (front, back) = match piece.rotation {
            Rotation::Spawn => ((top_left, top_right), (bottom_left, bottom_right)),
            Rotation::Right => ((top_right, bottom_right), (top_left, bottom_left)),
            Rotation::Reverse => ((bottom_left, bottom_right), (top_left, top_right)),
            Rotation::Left => ((top_left, bottom_left), (top_right, bottom_right)),
        };
        let front_count = front.0 as u8 + front.1 as u8;
        let back_count = back.0 as u8 + back.1 as u8;
        if front_count + back_count < 3 {
            SpinKind::None
        } else if front_count == 2 || kick == 4 {
            SpinKind::Full
        } else {
            SpinKind::Mini
        }
    }

    fn spawn_next(&mut self) {
        let kind = self.queue.pop_front().expect("queue is never empty");
        self.queue.push_back(self.bag.draw());
        self.spawn(kind);
    }

    fn spawn(&mut self, kind: Tetromino) {
        let (x, y) = kind.spawn_position();
        let piece = ActivePiece {
            kind,
            rotation: Rotation::Spawn,
            x,
            y,
        };
        self.gravity_acc = Duration::ZERO;
        self.lock = LockState {
            elapsed: Duration::ZERO,
            resets: 0,
            lowest_y: y,
        };
        self.last_move = LastMove::None;
        let fits = self.board.fits(&piece.cells());
        self.active = Some(piece);
        self.touch();
        if !fits {
            self.game_over();
        }
    }

    fn game_over(&mut self) {
        self.phase = Phase::GameOver;
        self.shift.release_all();
        self.push(GameEvent::GameOver);
        self.touch();
    }

    fn push(&mut self, event: GameEvent) {
        self.events.push(event);
        self.touch();
    }

    fn touch(&mut self) {
        self.version += 1;
    }
}

fn to_visible(cells: [(i32, i32); 4]) -> [[i32; 2]; 4] {
    cells.map(|(x, y)| [x, y - HIDDEN_ROWS as i32])
}
