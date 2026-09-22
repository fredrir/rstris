use rstris_lib::game::board::{HIDDEN_ROWS, VISIBLE_HEIGHT, WIDTH};
use rstris_lib::meta::game_meta;

#[test]
fn meta_exposes_board_geometry_piece_shapes_and_limits() {
    let meta = game_meta();
    assert_eq!(meta.board_width, WIDTH);
    assert_eq!(meta.board_height, VISIBLE_HEIGHT);
    assert_eq!(meta.hidden_rows, HIDDEN_ROWS);
    assert_eq!(meta.preview_shapes.len(), 7);
    assert_eq!(meta.limits.len(), 7);
}
