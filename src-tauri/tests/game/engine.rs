use std::time::Duration;

use rstris_lib::game::board::{Board, HIDDEN_ROWS, VISIBLE_HEIGHT, WIDTH};
use rstris_lib::game::engine::{ActivePiece, CLEAR_ANIMATION, COUNTDOWN, MAX_LOCK_RESETS};
use rstris_lib::game::{
    Game, GameConfig, GameEvent, InputAction, Phase, Rotation, SpinKind, Tetromino,
};

use crate::common::{advance, board_from, playing_game, seeded_config, tap};

fn piece(kind: Tetromino, rotation: Rotation, x: i32, visible_y: i32) -> ActivePiece {
    ActivePiece {
        kind,
        rotation,
        x,
        y: visible_y + HIDDEN_ROWS as i32,
    }
}

fn active_x(game: &Game) -> i32 {
    game.active().expect("active piece").x
}

fn active_y(game: &Game) -> i32 {
    game.active().expect("active piece").y
}

#[test]
fn new_game_starts_with_countdown_and_queue() {
    let mut game = Game::new(seeded_config(1));
    let snapshot = game.snapshot();
    assert_eq!(snapshot.countdown_ms, Some(COUNTDOWN.as_millis() as u64));
    assert_eq!(snapshot.next.len(), GameConfig::default().next_count);
    assert!(snapshot.active.is_some());
    assert_eq!(snapshot.board.len(), VISIBLE_HEIGHT * WIDTH);
    assert_eq!(snapshot.phase, Phase::Playing);
    assert!(!game.is_over());
    assert_eq!(snapshot.score, 0);
    assert_eq!(snapshot.level, 1);
}

#[test]
fn snapshot_board_is_flat_visible_cells_in_piece_codes() {
    let mut game = playing_game(3);
    game.set_board(board_from(&["I...S....."]));
    let snapshot = game.snapshot();
    let row = (VISIBLE_HEIGHT - 1) * WIDTH;
    assert_eq!(snapshot.board.len(), VISIBLE_HEIGHT * WIDTH);
    assert_eq!(snapshot.board[row], Tetromino::I.code());
    assert_eq!(snapshot.board[row + 1], 0);
    assert_eq!(snapshot.board[row + 4], Tetromino::S.code());
}

#[test]
fn board_version_advances_only_when_settled_cells_change() {
    let mut game = playing_game(3);
    let before = game.snapshot().board_version;
    game.set_active(piece(Tetromino::O, Rotation::Spawn, 3, 0));
    game.apply(InputAction::HardDrop);
    let locked = game.snapshot().board_version;
    assert!(locked > before);
    advance(&mut game, 200);
    assert_eq!(game.snapshot().board_version, locked);
}

#[test]
fn board_version_advances_when_rows_clear() {
    let mut game = playing_game(2);
    game.set_board(board_from(&["LLLLLLLL..", "LLLLLLLL.."]));
    game.set_active(piece(Tetromino::O, Rotation::Spawn, 7, 0));
    game.apply(InputAction::HardDrop);
    let locked = game.snapshot().board_version;
    advance(&mut game, CLEAR_ANIMATION.as_millis() as u64 + 20);
    assert!(game.snapshot().board_version > locked);
}

#[test]
fn versions_are_monotonic_across_games() {
    let mut first = Game::new(seeded_config(1));
    let last = first.snapshot().version;
    let mut second = Game::new(seeded_config(1));
    assert!(second.snapshot().version > last);
}

#[test]
fn events_are_queued_until_a_snapshot_takes_them() {
    let mut game = playing_game(2);
    game.set_board(board_from(&["LLLLLLLL..", "LLLLLLLL.."]));
    game.set_active(piece(Tetromino::O, Rotation::Spawn, 7, 0));
    game.apply(InputAction::HardDrop);
    assert!(game.has_events());
    let snapshot = game.snapshot();
    assert!(
        snapshot
            .events
            .iter()
            .any(|event| matches!(event, GameEvent::LineClear { .. }))
    );
    assert!(!game.has_events());
}

#[test]
fn countdown_blocks_input_then_expires() {
    let mut game = Game::new(seeded_config(1));
    let x = active_x(&game);
    tap(&mut game, InputAction::LeftPress, InputAction::LeftRelease);
    assert_eq!(active_x(&game), x);
    advance(&mut game, COUNTDOWN.as_millis() as u64 + 10);
    assert_eq!(game.snapshot().countdown_ms, None);
    tap(&mut game, InputAction::LeftPress, InputAction::LeftRelease);
    assert_eq!(active_x(&game), x - 1);
}

#[test]
fn horizontal_moves_stop_at_walls() {
    let mut game = playing_game(3);
    game.set_active(piece(Tetromino::O, Rotation::Spawn, 3, 0));
    for _ in 0..20 {
        tap(&mut game, InputAction::LeftPress, InputAction::LeftRelease);
    }
    assert_eq!(active_x(&game), -1);
    for _ in 0..20 {
        tap(
            &mut game,
            InputAction::RightPress,
            InputAction::RightRelease,
        );
    }
    assert_eq!(active_x(&game), 7);
}

#[test]
fn das_auto_repeats_to_the_wall() {
    let mut game = playing_game(3);
    game.set_active(piece(Tetromino::T, Rotation::Spawn, 3, 0));
    game.apply(InputAction::RightPress);
    assert_eq!(active_x(&game), 4);
    advance(&mut game, 120);
    assert_eq!(active_x(&game), 4);
    advance(&mut game, 400);
    assert_eq!(active_x(&game), 7);
    game.apply(InputAction::RightRelease);
}

#[test]
fn gravity_drops_piece_after_interval() {
    let mut game = playing_game(3);
    game.set_active(piece(Tetromino::T, Rotation::Spawn, 3, 0));
    let y = active_y(&game);
    advance(&mut game, 990);
    assert_eq!(active_y(&game), y);
    advance(&mut game, 20);
    assert_eq!(active_y(&game), y + 1);
}

#[test]
fn hard_drop_locks_scores_and_spawns_next() {
    let mut game = playing_game(5);
    game.set_active(piece(Tetromino::O, Rotation::Spawn, 3, 0));
    let next = game.snapshot().next[0];
    game.apply(InputAction::HardDrop);
    let snapshot = game.snapshot();
    assert_eq!(snapshot.pieces, 1);
    assert_eq!(snapshot.score, 2 * 18);
    assert_eq!(snapshot.active.unwrap().kind, next);
    assert_eq!(game.board().get(4, 23), Some(Tetromino::O));
    assert_eq!(game.board().get(5, 22), Some(Tetromino::O));
    assert!(snapshot.events.contains(&GameEvent::Lock));
}

#[test]
fn soft_drop_scores_one_per_cell() {
    let mut game = playing_game(5);
    game.set_active(piece(Tetromino::O, Rotation::Spawn, 3, 0));
    let y = active_y(&game);
    game.apply(InputAction::SoftDropPress);
    assert_eq!(active_y(&game), y + 1);
    assert_eq!(game.scoring().score(), 1);
    advance(&mut game, 100);
    game.apply(InputAction::SoftDropRelease);
    assert_eq!(active_y(&game), y + 3);
    assert_eq!(game.scoring().score(), 3);
}

#[test]
fn piece_locks_after_lock_delay_when_grounded() {
    let mut game = playing_game(5);
    game.set_active(piece(Tetromino::O, Rotation::Spawn, 3, 18));
    advance(&mut game, 450);
    assert_eq!(game.snapshot().pieces, 0);
    assert!(game.snapshot().lock_progress > 0.8);
    advance(&mut game, 60);
    assert_eq!(game.snapshot().pieces, 1);
}

#[test]
fn moves_reset_lock_delay_up_to_a_limit() {
    let mut game = playing_game(5);
    game.set_active(piece(Tetromino::O, Rotation::Spawn, 3, 18));
    for i in 0..MAX_LOCK_RESETS {
        advance(&mut game, 400);
        let (press, release) = if i % 2 == 0 {
            (InputAction::LeftPress, InputAction::LeftRelease)
        } else {
            (InputAction::RightPress, InputAction::RightRelease)
        };
        tap(&mut game, press, release);
        assert_eq!(game.snapshot().pieces, 0);
    }
    advance(&mut game, 400);
    tap(&mut game, InputAction::LeftPress, InputAction::LeftRelease);
    advance(&mut game, 150);
    assert_eq!(game.snapshot().pieces, 1);
}

#[test]
fn hold_swaps_and_is_single_use_per_piece() {
    let mut game = playing_game(9);
    let first = game.active().unwrap().kind;
    let next = game.snapshot().next[0];
    game.apply(InputAction::Hold);
    assert_eq!(game.hold(), Some(first));
    assert_eq!(game.active().unwrap().kind, next);
    assert!(!game.snapshot().hold_available);
    game.apply(InputAction::Hold);
    assert_eq!(game.hold(), Some(first));
    assert_eq!(game.active().unwrap().kind, next);
    game.apply(InputAction::HardDrop);
    assert!(game.snapshot().hold_available);
    game.apply(InputAction::Hold);
    assert_eq!(game.active().unwrap().kind, first);
}

#[test]
fn hold_can_be_disabled() {
    let mut game = Game::new(GameConfig {
        hold_enabled: false,
        ..seeded_config(9)
    });
    game.skip_countdown();
    game.apply(InputAction::Hold);
    assert_eq!(game.hold(), None);
    assert!(!game.snapshot().hold_available);
}

#[test]
fn line_clear_runs_animation_then_collapses() {
    let mut game = playing_game(2);
    game.set_board(board_from(&["LLLLLLLL..", "LLLLLLLL.."]));
    game.set_active(piece(Tetromino::O, Rotation::Spawn, 7, 0));
    game.apply(InputAction::HardDrop);
    let snapshot = game.snapshot();
    assert!(matches!(snapshot.phase, Phase::Clearing { ref rows, .. } if rows == &vec![22, 23]));
    assert_eq!(snapshot.lines, 2);
    assert_eq!(snapshot.last_clear.as_ref().unwrap().label, "DOUBLE");
    assert!(
        snapshot
            .events
            .iter()
            .any(|e| matches!(e, GameEvent::LineClear { .. }))
    );
    advance(&mut game, CLEAR_ANIMATION.as_millis() as u64 + 20);
    assert_eq!(*game.phase(), Phase::Playing);
    assert!(game.board().is_empty());
    assert!(game.active().is_some());
}

#[test]
fn vertical_i_scores_a_tetris() {
    let mut game = playing_game(2);
    game.set_board(board_from(&[
        "LLLLLLLLL.",
        "LLLLLLLLL.",
        "LLLLLLLLL.",
        "LLLLLLLLL.",
    ]));
    game.set_active(piece(Tetromino::I, Rotation::Right, 7, 0));
    game.apply(InputAction::HardDrop);
    let snapshot = game.snapshot();
    let clear = snapshot.last_clear.unwrap();
    assert_eq!(clear.lines, 4);
    assert_eq!(clear.label, "TETRIS");
    assert!(clear.perfect_clear);
    assert_eq!(snapshot.score, 800 + 2000 + 2 * 16);
    assert_eq!(game.summary().tetrises, 1);
}

#[test]
fn t_spin_double_is_detected() {
    let mut game = playing_game(2);
    game.set_board(board_from(&[".....L....", "LLL...LLLL", "LLLL.LLLLL"]));
    game.set_active(piece(Tetromino::T, Rotation::Left, 3, 17));
    game.apply(InputAction::RotateCcw);
    assert_eq!(game.active().unwrap().rotation, Rotation::Reverse);
    game.apply(InputAction::HardDrop);
    let clear = game.snapshot().last_clear.unwrap();
    assert_eq!(clear.spin, SpinKind::Full);
    assert_eq!(clear.lines, 2);
    assert_eq!(clear.label, "T-SPIN DOUBLE");
    assert_eq!(clear.points, 1200);
    assert_eq!(game.summary().tspins, 1);
}

#[test]
fn t_placed_without_rotation_is_not_a_spin() {
    let mut game = playing_game(2);
    game.set_board(board_from(&[".....L....", "LLL...LLLL", "LLLL.LLLLL"]));
    game.set_active(piece(Tetromino::T, Rotation::Reverse, 3, 17));
    game.apply(InputAction::HardDrop);
    let clear = game.snapshot().last_clear.unwrap();
    assert_eq!(clear.spin, SpinKind::None);
    assert_eq!(clear.label, "DOUBLE");
}

#[test]
fn rotation_uses_wall_kicks() {
    let mut game = playing_game(2);
    game.set_active(piece(Tetromino::I, Rotation::Right, -2, 5));
    game.apply(InputAction::RotateCw);
    let active = game.active().unwrap();
    assert_eq!(active.rotation, Rotation::Reverse);
    assert!(game.board().fits(&active.cells()));
    assert!(active.cells().iter().all(|&(x, _)| x >= 0));
}

#[test]
fn o_piece_rotation_is_a_no_op() {
    let mut game = playing_game(2);
    game.set_active(piece(Tetromino::O, Rotation::Spawn, 3, 0));
    let before = game.active().unwrap();
    game.apply(InputAction::RotateCw);
    assert_eq!(game.active().unwrap(), before);
}

#[test]
fn level_up_after_ten_lines_emits_event() {
    let mut game = playing_game(2);
    let mut rows = vec!["LLLLLLLLL."; 10];
    rows.truncate(10);
    game.set_board(board_from(&rows));
    for _ in 0..2 {
        game.set_active(piece(Tetromino::I, Rotation::Right, 7, 0));
        game.apply(InputAction::HardDrop);
        advance(&mut game, CLEAR_ANIMATION.as_millis() as u64 + 20);
    }
    game.set_active(piece(Tetromino::I, Rotation::Right, 7, 0));
    game.apply(InputAction::HardDrop);
    let snapshot = game.snapshot();
    assert_eq!(snapshot.lines, 10);
    assert_eq!(snapshot.level, 2);
    assert!(snapshot.events.contains(&GameEvent::LevelUp { level: 2 }));
    assert!(snapshot.gravity_ms < 1000);
}

#[test]
fn block_out_ends_the_game() {
    let mut game = playing_game(2);
    let mut board = Board::new();
    for y in 0..20 {
        for x in 0..10 {
            if x != 0 {
                board.set(x, HIDDEN_ROWS as i32 + y, Some(Tetromino::L));
            }
        }
    }
    game.set_board(board);
    game.set_active(piece(Tetromino::O, Rotation::Spawn, 3, 0));
    game.apply(InputAction::HardDrop);
    assert!(game.is_over());
    assert_eq!(*game.phase(), Phase::GameOver);
    assert!(game.snapshot().events.contains(&GameEvent::GameOver));
    let x = active_x(&game);
    tap(&mut game, InputAction::LeftPress, InputAction::LeftRelease);
    assert_eq!(active_x(&game), x);
}

#[test]
fn pause_freezes_time_and_resume_restarts_countdown() {
    let mut game = playing_game(2);
    game.set_active(piece(Tetromino::T, Rotation::Spawn, 3, 0));
    let y = active_y(&game);
    game.apply(InputAction::Pause);
    assert!(game.is_paused());
    advance(&mut game, 3000);
    assert_eq!(active_y(&game), y);
    assert_eq!(game.snapshot().elapsed_ms, 0);
    game.apply(InputAction::TogglePause);
    assert!(!game.is_paused());
    assert!(game.snapshot().countdown_ms.is_some());
    advance(&mut game, COUNTDOWN.as_millis() as u64 + 1010);
    assert_eq!(active_y(&game), y + 1);
}

#[test]
fn ghost_reflects_config() {
    let mut game = playing_game(2);
    game.set_active(piece(Tetromino::O, Rotation::Spawn, 3, 0));
    let ghost = game.snapshot().ghost.unwrap();
    assert!(ghost.iter().any(|&[_, y]| y == 19));
    game.update_config(GameConfig {
        ghost_piece: false,
        ..GameConfig::default()
    });
    assert!(game.snapshot().ghost.is_none());
}

#[test]
fn update_config_keeps_start_level_and_seed() {
    let mut game = Game::new(GameConfig {
        start_level: 7,
        ..seeded_config(4)
    });
    game.update_config(GameConfig {
        start_level: 1,
        next_count: 2,
        seed: Some(999),
        ..GameConfig::default()
    });
    assert_eq!(game.config().start_level, 7);
    assert_eq!(game.config().seed, Some(4));
    assert_eq!(game.snapshot().next.len(), 2);
}

#[test]
fn summary_and_recording_flags() {
    let mut game = playing_game(2);
    advance(&mut game, 1500);
    game.set_active(piece(Tetromino::O, Rotation::Spawn, 3, 0));
    game.apply(InputAction::HardDrop);
    let summary = game.summary();
    assert_eq!(summary.pieces, 1);
    assert_eq!(summary.start_level, 1);
    assert!(summary.duration_ms >= 1500);
    assert!(!game.is_recorded());
    game.mark_recorded();
    assert!(game.is_recorded());
}

#[test]
fn version_changes_only_when_state_changes() {
    let mut game = playing_game(2);
    game.set_active(piece(Tetromino::T, Rotation::Spawn, 3, 0));
    let before = game.version();
    game.update(Duration::from_millis(5));
    assert_eq!(game.version(), before);
    game.apply(InputAction::RotateCw);
    assert!(game.version() > before);
}
