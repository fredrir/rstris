use std::collections::HashSet;

use rstris_lib::game::board::HIDDEN_ROWS;
use rstris_lib::game::piece::kicks;
use rstris_lib::game::{Rotation, Tetromino};

#[test]
fn every_rotation_has_four_distinct_cells() {
    for kind in Tetromino::ALL {
        for rotation in Rotation::ALL {
            let cells: HashSet<_> = kind.cells(rotation).into_iter().collect();
            assert_eq!(cells.len(), 4, "{kind:?} {rotation:?}");
        }
    }
}

#[test]
fn rotations_cycle() {
    assert_eq!(Rotation::Spawn.cw(), Rotation::Right);
    assert_eq!(Rotation::Right.cw(), Rotation::Reverse);
    assert_eq!(Rotation::Reverse.cw(), Rotation::Left);
    assert_eq!(Rotation::Left.cw(), Rotation::Spawn);
    assert_eq!(Rotation::Spawn.ccw(), Rotation::Left);
    assert_eq!(Rotation::Spawn.flip(), Rotation::Reverse);
    for rotation in Rotation::ALL {
        assert_eq!(rotation.cw().ccw(), rotation);
        assert_eq!(rotation.flip().flip(), rotation);
        assert_eq!(Rotation::from_index(rotation.index()), rotation);
    }
}

#[test]
fn o_piece_never_changes_shape() {
    let spawn = Tetromino::O.cells(Rotation::Spawn);
    for rotation in Rotation::ALL {
        assert_eq!(Tetromino::O.cells(rotation), spawn);
    }
}

#[test]
fn spawn_positions_sit_at_top_of_visible_board() {
    for kind in Tetromino::ALL {
        let (x, y) = kind.spawn_position();
        assert_eq!(x, 3);
        let top = kind
            .cells(Rotation::Spawn)
            .iter()
            .map(|&(_, cy)| y + cy)
            .min()
            .unwrap();
        assert_eq!(top, HIDDEN_ROWS as i32, "{kind:?}");
    }
    let (x, _) = Tetromino::O.spawn_position();
    let columns: HashSet<_> = Tetromino::O
        .cells(Rotation::Spawn)
        .iter()
        .map(|&(cx, _)| x + cx)
        .collect();
    assert_eq!(columns, HashSet::from([4, 5]));
}

#[test]
fn kick_tables_follow_srs_shape() {
    assert_eq!(
        kicks(Tetromino::O, Rotation::Spawn, Rotation::Right),
        &[(0, 0)]
    );
    let t_kicks = kicks(Tetromino::T, Rotation::Spawn, Rotation::Right);
    let i_kicks = kicks(Tetromino::I, Rotation::Spawn, Rotation::Right);
    assert_eq!(t_kicks.len(), 5);
    assert_eq!(i_kicks.len(), 5);
    assert_ne!(t_kicks, i_kicks);
    assert_eq!(t_kicks[0], (0, 0));
    assert_eq!(t_kicks, &[(0, 0), (-1, 0), (-1, -1), (0, 2), (-1, 2)]);
    assert_eq!(i_kicks, &[(0, 0), (-2, 0), (1, 0), (-2, 1), (1, -2)]);
    assert_eq!(
        kicks(Tetromino::T, Rotation::Spawn, Rotation::Reverse).len(),
        6
    );
    assert_eq!(
        kicks(Tetromino::T, Rotation::Right, Rotation::Right),
        &[(0, 0)]
    );
}

#[test]
fn letters_are_unique() {
    let letters: HashSet<_> = Tetromino::ALL.iter().map(|k| k.letter()).collect();
    assert_eq!(letters.len(), 7);
}
