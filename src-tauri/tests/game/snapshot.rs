use rstris_lib::game::Game;
use rstris_lib::game::board::{VISIBLE_HEIGHT, WIDTH};

use crate::common::seeded_config;

#[test]
fn snapshot_serializes_board_as_flat_cell_codes() {
    let mut game = Game::new(seeded_config(1));
    let value = serde_json::to_value(game.snapshot()).unwrap();
    let board = value["board"].as_array().unwrap();
    assert_eq!(board.len(), VISIBLE_HEIGHT * WIDTH);
    assert!(board.iter().all(|cell| cell.is_u64()));
    assert!(value["boardVersion"].is_u64());
    assert!(value["version"].is_u64());
}
