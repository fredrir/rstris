#![allow(dead_code)]

use std::time::Duration;

use rstris_lib::game::board::{Board, HEIGHT};
use rstris_lib::game::{Game, GameConfig, InputAction, Tetromino};

pub fn board_from(rows: &[&str]) -> Board {
    let mut board = Board::new();
    let offset = HEIGHT - rows.len();
    for (i, row) in rows.iter().enumerate() {
        for (x, ch) in row.chars().enumerate() {
            let cell = match ch {
                '.' | ' ' => None,
                'I' => Some(Tetromino::I),
                'O' => Some(Tetromino::O),
                'T' => Some(Tetromino::T),
                'S' => Some(Tetromino::S),
                'Z' => Some(Tetromino::Z),
                'J' => Some(Tetromino::J),
                _ => Some(Tetromino::L),
            };
            board.set(x as i32, (offset + i) as i32, cell);
        }
    }
    board
}

pub fn seeded_config(seed: u64) -> GameConfig {
    GameConfig {
        seed: Some(seed),
        ..GameConfig::default()
    }
}

pub fn playing_game(seed: u64) -> Game {
    let mut game = Game::new(seeded_config(seed));
    game.skip_countdown();
    game
}

pub fn advance(game: &mut Game, ms: u64) {
    let mut remaining = ms;
    while remaining > 0 {
        let step = remaining.min(50);
        game.update(Duration::from_millis(step));
        remaining -= step;
    }
}

pub fn tap(game: &mut Game, press: InputAction, release: InputAction) {
    game.apply(press);
    game.apply(release);
}
