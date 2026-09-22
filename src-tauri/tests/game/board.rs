use rstris_lib::game::Tetromino;
use rstris_lib::game::board::{Board, HEIGHT, HIDDEN_ROWS, VISIBLE_HEIGHT, WIDTH};

use crate::common::board_from;

#[test]
fn new_board_is_empty_with_expected_dimensions() {
    let board = Board::new();
    assert!(board.is_empty());
    assert_eq!(board.rows().len(), HEIGHT);
    assert_eq!(board.visible_rows().len(), VISIBLE_HEIGHT);
    assert_eq!(HEIGHT, VISIBLE_HEIGHT + HIDDEN_ROWS);
    assert_eq!(board.max_height(), 0);
}

#[test]
fn out_of_bounds_cells_are_blocked() {
    let board = Board::new();
    assert!(board.is_blocked(-1, 0));
    assert!(board.is_blocked(WIDTH as i32, 0));
    assert!(board.is_blocked(0, -1));
    assert!(board.is_blocked(0, HEIGHT as i32));
    assert!(!board.is_blocked(0, 0));
    assert!(board.fits(&[(0, 0), (9, 23)]));
    assert!(!board.fits(&[(0, 0), (10, 0)]));
}

#[test]
fn fill_and_get_round_trip() {
    let mut board = Board::new();
    board.fill(&[(1, 5), (2, 5)], Tetromino::T);
    assert_eq!(board.get(1, 5), Some(Tetromino::T));
    assert_eq!(board.get(2, 5), Some(Tetromino::T));
    assert_eq!(board.get(3, 5), None);
    assert_eq!(board.get(50, 50), None);
    assert!(board.is_blocked(1, 5));
}

#[test]
fn full_rows_are_detected_in_ascending_order() {
    let board = board_from(&["LLLLLLLLLL", "LLLL.LLLLL", "LLLLLLLLLL"]);
    assert_eq!(board.full_rows(), vec![HEIGHT - 3, HEIGHT - 1]);
}

#[test]
fn clear_rows_shifts_everything_above_down() {
    let mut board = board_from(&["J.........", "LLLLLLLLLL", "..S.......", "LLLLLLLLLL"]);
    board.clear_rows(&[HEIGHT - 3, HEIGHT - 1]);
    let expected = board_from(&["J.........", "..S......."]);
    assert_eq!(board, expected);
    assert_eq!(board.max_height(), 2);
}

#[test]
fn is_empty_except_ignores_listed_rows() {
    let board = board_from(&["LLLLLLLLLL"]);
    assert!(!board.is_empty());
    assert!(board.is_empty_except(&[HEIGHT - 1]));
    let stacked = board_from(&["..T.......", "LLLLLLLLLL"]);
    assert!(!stacked.is_empty_except(&[HEIGHT - 1]));
}
