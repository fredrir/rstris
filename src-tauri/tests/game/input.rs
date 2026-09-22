use std::time::Duration;

use rstris_lib::game::input::{AutoShift, Horizontal};

const DAS: Duration = Duration::from_millis(100);
const ARR: Duration = Duration::from_millis(20);

fn ms(v: u64) -> Duration {
    Duration::from_millis(v)
}

#[test]
fn press_activates_direction_without_repeats_before_das() {
    let mut shift = AutoShift::default();
    shift.press(Horizontal::Left);
    assert_eq!(shift.active(), Some(Horizontal::Left));
    assert_eq!(shift.advance(ms(50), DAS, ARR), (Some(Horizontal::Left), 0));
    assert_eq!(shift.advance(ms(49), DAS, ARR), (Some(Horizontal::Left), 0));
}

#[test]
fn crossing_das_repeats_immediately_then_at_arr_cadence() {
    let mut shift = AutoShift::default();
    shift.press(Horizontal::Right);
    assert_eq!(shift.advance(ms(100), DAS, ARR).1, 1);
    assert_eq!(shift.advance(ms(10), DAS, ARR).1, 0);
    assert_eq!(shift.advance(ms(10), DAS, ARR).1, 1);
    assert_eq!(shift.advance(ms(60), DAS, ARR).1, 3);
}

#[test]
fn zero_arr_means_instant() {
    let mut shift = AutoShift::default();
    shift.press(Horizontal::Right);
    assert_eq!(shift.advance(ms(100), DAS, Duration::ZERO).1, usize::MAX);
}

#[test]
fn release_switches_to_other_held_direction() {
    let mut shift = AutoShift::default();
    shift.press(Horizontal::Left);
    shift.press(Horizontal::Right);
    assert_eq!(shift.active(), Some(Horizontal::Right));
    assert_eq!(shift.release(Horizontal::Right), Some(Horizontal::Left));
    assert_eq!(shift.active(), Some(Horizontal::Left));
    assert_eq!(shift.release(Horizontal::Left), None);
    assert_eq!(shift.active(), None);
    assert_eq!(shift.advance(ms(500), DAS, ARR), (None, 0));
}

#[test]
fn releasing_inactive_direction_keeps_active() {
    let mut shift = AutoShift::default();
    shift.press(Horizontal::Left);
    shift.press(Horizontal::Right);
    assert_eq!(shift.release(Horizontal::Left), None);
    assert_eq!(shift.active(), Some(Horizontal::Right));
}

#[test]
fn release_all_clears_everything() {
    let mut shift = AutoShift::default();
    shift.press(Horizontal::Left);
    shift.set_soft(true);
    shift.release_all();
    assert_eq!(shift.active(), None);
    assert!(!shift.soft_held());
}
