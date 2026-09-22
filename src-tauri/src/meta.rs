use serde::Serialize;

use crate::game::board::{HIDDEN_ROWS, VISIBLE_HEIGHT, WIDTH};
use crate::game::engine::CLEAR_ANIMATION;
use crate::game::{Rotation, Tetromino};
use crate::settings::{SettingLimit, setting_limits};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameMeta {
    pub board_width: usize,
    pub board_height: usize,
    pub hidden_rows: usize,
    pub clear_animation_ms: u64,
    pub preview_shapes: Vec<PieceShape>,
    pub limits: Vec<SettingLimit>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PieceShape {
    pub kind: Tetromino,
    pub cells: [(i32, i32); 4],
}

pub fn game_meta() -> GameMeta {
    GameMeta {
        board_width: WIDTH,
        board_height: VISIBLE_HEIGHT,
        hidden_rows: HIDDEN_ROWS,
        clear_animation_ms: CLEAR_ANIMATION.as_millis() as u64,
        preview_shapes: Tetromino::ALL
            .into_iter()
            .map(|kind| PieceShape {
                kind,
                cells: kind.cells(Rotation::Spawn),
            })
            .collect(),
        limits: setting_limits(),
    }
}
