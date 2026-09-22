use super::piece::Tetromino;

pub const WIDTH: usize = 10;
pub const VISIBLE_HEIGHT: usize = 20;
pub const HIDDEN_ROWS: usize = 4;
pub const HEIGHT: usize = VISIBLE_HEIGHT + HIDDEN_ROWS;

pub type Row = [Option<Tetromino>; WIDTH];

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Board {
    cells: [Row; HEIGHT],
}

impl Default for Board {
    fn default() -> Self {
        Self::new()
    }
}

impl Board {
    pub fn new() -> Self {
        Self {
            cells: [[None; WIDTH]; HEIGHT],
        }
    }

    pub fn in_bounds(x: i32, y: i32) -> bool {
        x >= 0 && y >= 0 && (x as usize) < WIDTH && (y as usize) < HEIGHT
    }

    pub fn get(&self, x: i32, y: i32) -> Option<Tetromino> {
        if Self::in_bounds(x, y) {
            self.cells[y as usize][x as usize]
        } else {
            None
        }
    }

    pub fn set(&mut self, x: i32, y: i32, cell: Option<Tetromino>) {
        if Self::in_bounds(x, y) {
            self.cells[y as usize][x as usize] = cell;
        }
    }

    pub fn is_blocked(&self, x: i32, y: i32) -> bool {
        !Self::in_bounds(x, y) || self.cells[y as usize][x as usize].is_some()
    }

    pub fn fits(&self, cells: &[(i32, i32)]) -> bool {
        cells.iter().all(|&(x, y)| !self.is_blocked(x, y))
    }

    pub fn fill(&mut self, cells: &[(i32, i32)], kind: Tetromino) {
        for &(x, y) in cells {
            self.set(x, y, Some(kind));
        }
    }

    pub fn full_rows(&self) -> Vec<usize> {
        (0..HEIGHT)
            .filter(|&y| self.cells[y].iter().all(Option::is_some))
            .collect()
    }

    pub fn clear_rows(&mut self, rows: &[usize]) {
        let mut next = [[None; WIDTH]; HEIGHT];
        let mut dst = HEIGHT;
        for y in (0..HEIGHT).rev() {
            if rows.contains(&y) {
                continue;
            }
            dst -= 1;
            next[dst] = self.cells[y];
        }
        self.cells = next;
    }

    pub fn is_empty_except(&self, rows: &[usize]) -> bool {
        (0..HEIGHT)
            .filter(|y| !rows.contains(y))
            .all(|y| self.cells[y].iter().all(Option::is_none))
    }

    pub fn is_empty(&self) -> bool {
        self.is_empty_except(&[])
    }

    pub fn rows(&self) -> &[Row; HEIGHT] {
        &self.cells
    }

    pub fn visible_rows(&self) -> &[Row] {
        &self.cells[HIDDEN_ROWS..]
    }

    pub fn max_height(&self) -> usize {
        (0..HEIGHT)
            .find(|&y| self.cells[y].iter().any(Option::is_some))
            .map(|y| HEIGHT - y)
            .unwrap_or(0)
    }
}
