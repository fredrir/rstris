use std::time::Duration;

use rstris_lib::game::SpinKind;
use rstris_lib::game::scoring::{LINES_PER_LEVEL, MAX_LEVEL, Scoring, gravity_for_level};

fn clear(scoring: &mut Scoring, lines: u32) -> u64 {
    scoring
        .on_lock(lines, SpinKind::None, false)
        .clear
        .map(|c| c.points)
        .unwrap_or(0)
}

#[test]
fn base_line_values_at_level_one() {
    let mut s = Scoring::new(1);
    assert_eq!(clear(&mut s, 1), 100);
    s.on_lock(0, SpinKind::None, false);
    assert_eq!(clear(&mut s, 2), 300);
    s.on_lock(0, SpinKind::None, false);
    assert_eq!(clear(&mut s, 3), 500);
    s.on_lock(0, SpinKind::None, false);
    assert_eq!(clear(&mut s, 4), 800);
    assert_eq!(s.score(), 1700);
    assert_eq!(s.lines(), 10);
}

#[test]
fn points_scale_with_level() {
    let mut s = Scoring::new(5);
    assert_eq!(clear(&mut s, 4), 4000);
    assert_eq!(s.level(), 5);
}

#[test]
fn back_to_back_tetris_is_one_and_a_half_times() {
    let mut s = Scoring::new(1);
    let first = s.on_lock(4, SpinKind::None, false).clear.unwrap();
    assert!(!first.back_to_back);
    s.on_lock(0, SpinKind::None, false);
    let second = s.on_lock(4, SpinKind::None, false).clear.unwrap();
    assert!(second.back_to_back);
    assert_eq!(second.points, 1200);
    assert_eq!(second.label, "TETRIS");
}

#[test]
fn single_breaks_back_to_back_chain() {
    let mut s = Scoring::new(1);
    s.on_lock(4, SpinKind::None, false);
    s.on_lock(0, SpinKind::None, false);
    s.on_lock(1, SpinKind::None, false);
    s.on_lock(0, SpinKind::None, false);
    let tetris = s.on_lock(4, SpinKind::None, false).clear.unwrap();
    assert!(!tetris.back_to_back);
    assert_eq!(tetris.points, 800);
}

#[test]
fn combo_adds_fifty_per_step() {
    let mut s = Scoring::new(1);
    let a = s.on_lock(1, SpinKind::None, false).clear.unwrap();
    let b = s.on_lock(1, SpinKind::None, false).clear.unwrap();
    let c = s.on_lock(1, SpinKind::None, false).clear.unwrap();
    assert_eq!((a.combo, a.points), (0, 100));
    assert_eq!((b.combo, b.points), (1, 150));
    assert_eq!((c.combo, c.points), (2, 200));
    s.on_lock(0, SpinKind::None, false);
    assert_eq!(s.combo(), -1);
}

#[test]
fn t_spin_values() {
    let mut s = Scoring::new(1);
    assert_eq!(
        s.on_lock(0, SpinKind::Full, false).clear.unwrap().points,
        400
    );
    assert_eq!(
        s.on_lock(0, SpinKind::Mini, false).clear.unwrap().points,
        100
    );
    let single = s.on_lock(1, SpinKind::Full, false).clear.unwrap();
    assert_eq!(
        (single.points, single.label.as_str()),
        (800, "T-SPIN SINGLE")
    );
    let double = s.on_lock(2, SpinKind::Full, false).clear.unwrap();
    assert!(double.back_to_back);
    assert_eq!(double.points, 1200 * 3 / 2 + 50);
    assert_eq!(double.label, "T-SPIN DOUBLE");
    s.on_lock(0, SpinKind::None, false);
    let mini = s.on_lock(1, SpinKind::Mini, false).clear.unwrap();
    assert_eq!(mini.points, 300);
    assert_eq!(mini.label, "T-SPIN MINI SINGLE");
}

#[test]
fn zero_line_spin_keeps_back_to_back_but_breaks_combo() {
    let mut s = Scoring::new(1);
    s.on_lock(4, SpinKind::None, false);
    s.on_lock(0, SpinKind::Full, false);
    assert_eq!(s.combo(), -1);
    let tetris = s.on_lock(4, SpinKind::None, false).clear.unwrap();
    assert!(tetris.back_to_back);
}

#[test]
fn perfect_clear_bonus_is_added() {
    let mut s = Scoring::new(1);
    let pc = s.on_lock(4, SpinKind::None, true).clear.unwrap();
    assert!(pc.perfect_clear);
    assert_eq!(pc.points, 800 + 2000);
    let single = s.on_lock(1, SpinKind::None, true).clear.unwrap();
    assert_eq!(single.points, 100 + 50 + 800);
}

#[test]
fn level_advances_every_ten_lines_from_start_level() {
    let mut s = Scoring::new(3);
    assert_eq!(s.level(), 3);
    assert_eq!(s.lines_to_next_level(), LINES_PER_LEVEL);
    for _ in 0..2 {
        assert!(s.on_lock(4, SpinKind::None, false).level_up.is_none());
    }
    assert_eq!(s.lines_to_next_level(), 2);
    assert_eq!(s.on_lock(2, SpinKind::None, false).level_up, Some(4));
    assert_eq!(s.level(), 4);
}

#[test]
fn level_is_capped() {
    let mut s = Scoring::new(MAX_LEVEL + 5);
    assert_eq!(s.level(), MAX_LEVEL);
    for _ in 0..3 {
        s.on_lock(4, SpinKind::None, false);
    }
    assert_eq!(s.level(), MAX_LEVEL);
}

#[test]
fn gravity_speeds_up_with_level() {
    assert_eq!(gravity_for_level(1), Duration::from_secs(1));
    let mut previous = gravity_for_level(1);
    for level in 2..=MAX_LEVEL {
        let current = gravity_for_level(level);
        assert!(current <= previous, "level {level}");
        previous = current;
    }
    assert!(gravity_for_level(MAX_LEVEL) >= Duration::from_millis(8));
    assert_eq!(gravity_for_level(0), gravity_for_level(1));
}

#[test]
fn add_accumulates_drop_points() {
    let mut s = Scoring::new(1);
    s.add(2);
    s.add(40);
    assert_eq!(s.score(), 42);
}
