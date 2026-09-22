use serde::{Deserialize, Serialize};

use super::board::HIDDEN_ROWS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Tetromino {
    I,
    O,
    T,
    S,
    Z,
    J,
    L,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Rotation {
    Spawn,
    Right,
    Reverse,
    Left,
}

type Shape = [(i32, i32); 4];

const I_CELLS: [Shape; 4] = [
    [(0, 1), (1, 1), (2, 1), (3, 1)],
    [(2, 0), (2, 1), (2, 2), (2, 3)],
    [(0, 2), (1, 2), (2, 2), (3, 2)],
    [(1, 0), (1, 1), (1, 2), (1, 3)],
];
const O_CELLS: [Shape; 4] = [[(1, 0), (2, 0), (1, 1), (2, 1)]; 4];
const T_CELLS: [Shape; 4] = [
    [(1, 0), (0, 1), (1, 1), (2, 1)],
    [(1, 0), (1, 1), (2, 1), (1, 2)],
    [(0, 1), (1, 1), (2, 1), (1, 2)],
    [(1, 0), (0, 1), (1, 1), (1, 2)],
];
const S_CELLS: [Shape; 4] = [
    [(1, 0), (2, 0), (0, 1), (1, 1)],
    [(1, 0), (1, 1), (2, 1), (2, 2)],
    [(1, 1), (2, 1), (0, 2), (1, 2)],
    [(0, 0), (0, 1), (1, 1), (1, 2)],
];
const Z_CELLS: [Shape; 4] = [
    [(0, 0), (1, 0), (1, 1), (2, 1)],
    [(2, 0), (1, 1), (2, 1), (1, 2)],
    [(0, 1), (1, 1), (1, 2), (2, 2)],
    [(1, 0), (0, 1), (1, 1), (0, 2)],
];
const J_CELLS: [Shape; 4] = [
    [(0, 0), (0, 1), (1, 1), (2, 1)],
    [(1, 0), (2, 0), (1, 1), (1, 2)],
    [(0, 1), (1, 1), (2, 1), (2, 2)],
    [(1, 0), (1, 1), (0, 2), (1, 2)],
];
const L_CELLS: [Shape; 4] = [
    [(2, 0), (0, 1), (1, 1), (2, 1)],
    [(1, 0), (1, 1), (1, 2), (2, 2)],
    [(0, 1), (1, 1), (2, 1), (0, 2)],
    [(0, 0), (1, 0), (1, 1), (1, 2)],
];

// SRS wall kicks with y pointing down; ordered 0>R, R>0, R>2, 2>R, 2>L, L>2, L>0, 0>L.
const JLSTZ_KICKS: [[(i32, i32); 5]; 8] = [
    [(0, 0), (-1, 0), (-1, -1), (0, 2), (-1, 2)],
    [(0, 0), (1, 0), (1, 1), (0, -2), (1, -2)],
    [(0, 0), (1, 0), (1, 1), (0, -2), (1, -2)],
    [(0, 0), (-1, 0), (-1, -1), (0, 2), (-1, 2)],
    [(0, 0), (1, 0), (1, -1), (0, 2), (1, 2)],
    [(0, 0), (-1, 0), (-1, 1), (0, -2), (-1, -2)],
    [(0, 0), (-1, 0), (-1, 1), (0, -2), (-1, -2)],
    [(0, 0), (1, 0), (1, -1), (0, 2), (1, 2)],
];
const I_KICKS: [[(i32, i32); 5]; 8] = [
    [(0, 0), (-2, 0), (1, 0), (-2, 1), (1, -2)],
    [(0, 0), (2, 0), (-1, 0), (2, -1), (-1, 2)],
    [(0, 0), (-1, 0), (2, 0), (-1, -2), (2, 1)],
    [(0, 0), (1, 0), (-2, 0), (1, 2), (-2, -1)],
    [(0, 0), (2, 0), (-1, 0), (2, -1), (-1, 2)],
    [(0, 0), (-2, 0), (1, 0), (-2, 1), (1, -2)],
    [(0, 0), (1, 0), (-2, 0), (1, 2), (-2, -1)],
    [(0, 0), (-1, 0), (2, 0), (-1, -2), (2, 1)],
];
const FLIP_KICKS: [(i32, i32); 6] = [(0, 0), (0, -1), (1, -1), (-1, -1), (1, 0), (-1, 0)];
const NO_KICK: [(i32, i32); 1] = [(0, 0)];

impl Tetromino {
    pub const ALL: [Tetromino; 7] = [
        Tetromino::I,
        Tetromino::O,
        Tetromino::T,
        Tetromino::S,
        Tetromino::Z,
        Tetromino::J,
        Tetromino::L,
    ];

    pub fn cells(self, rotation: Rotation) -> Shape {
        let table = match self {
            Tetromino::I => &I_CELLS,
            Tetromino::O => &O_CELLS,
            Tetromino::T => &T_CELLS,
            Tetromino::S => &S_CELLS,
            Tetromino::Z => &Z_CELLS,
            Tetromino::J => &J_CELLS,
            Tetromino::L => &L_CELLS,
        };
        table[rotation.index()]
    }

    pub fn spawn_position(self) -> (i32, i32) {
        let top = self
            .cells(Rotation::Spawn)
            .iter()
            .map(|&(_, y)| y)
            .min()
            .unwrap_or(0);
        (3, HIDDEN_ROWS as i32 - top)
    }

    /// Wire code used in snapshots: 1..=7, 0 is reserved for empty cells.
    pub fn code(self) -> u8 {
        match self {
            Tetromino::I => 1,
            Tetromino::O => 2,
            Tetromino::T => 3,
            Tetromino::S => 4,
            Tetromino::Z => 5,
            Tetromino::J => 6,
            Tetromino::L => 7,
        }
    }

    pub fn letter(self) -> char {
        match self {
            Tetromino::I => 'I',
            Tetromino::O => 'O',
            Tetromino::T => 'T',
            Tetromino::S => 'S',
            Tetromino::Z => 'Z',
            Tetromino::J => 'J',
            Tetromino::L => 'L',
        }
    }
}

impl Rotation {
    pub const ALL: [Rotation; 4] = [
        Rotation::Spawn,
        Rotation::Right,
        Rotation::Reverse,
        Rotation::Left,
    ];

    pub fn index(self) -> usize {
        match self {
            Rotation::Spawn => 0,
            Rotation::Right => 1,
            Rotation::Reverse => 2,
            Rotation::Left => 3,
        }
    }

    pub fn from_index(index: usize) -> Rotation {
        Rotation::ALL[index % 4]
    }

    pub fn cw(self) -> Rotation {
        Rotation::from_index(self.index() + 1)
    }

    pub fn ccw(self) -> Rotation {
        Rotation::from_index(self.index() + 3)
    }

    pub fn flip(self) -> Rotation {
        Rotation::from_index(self.index() + 2)
    }
}

pub fn kicks(kind: Tetromino, from: Rotation, to: Rotation) -> &'static [(i32, i32)] {
    if kind == Tetromino::O || from == to {
        return &NO_KICK;
    }
    if from.flip() == to {
        return &FLIP_KICKS;
    }
    let index = match (from, to) {
        (Rotation::Spawn, Rotation::Right) => 0,
        (Rotation::Right, Rotation::Spawn) => 1,
        (Rotation::Right, Rotation::Reverse) => 2,
        (Rotation::Reverse, Rotation::Right) => 3,
        (Rotation::Reverse, Rotation::Left) => 4,
        (Rotation::Left, Rotation::Reverse) => 5,
        (Rotation::Left, Rotation::Spawn) => 6,
        (Rotation::Spawn, Rotation::Left) => 7,
        _ => unreachable!("non-adjacent rotation handled above"),
    };
    match kind {
        Tetromino::I => &I_KICKS[index],
        _ => &JLSTZ_KICKS[index],
    }
}
