use std::collections::HashSet;

use rstris_lib::game::Tetromino;
use rstris_lib::game::bag::Bag;

fn draw(bag: &mut Bag, n: usize) -> Vec<Tetromino> {
    (0..n).map(|_| bag.draw()).collect()
}

#[test]
fn every_seven_pieces_form_a_full_permutation() {
    let mut bag = Bag::new(Some(7));
    let pieces = draw(&mut bag, 21);
    for chunk in pieces.chunks(7) {
        let set: HashSet<_> = chunk.iter().copied().collect();
        assert_eq!(set.len(), 7);
    }
}

#[test]
fn seeded_bags_are_deterministic() {
    let a = draw(&mut Bag::new(Some(42)), 30);
    let b = draw(&mut Bag::new(Some(42)), 30);
    assert_eq!(a, b);
}

#[test]
fn different_seeds_usually_differ() {
    let a = draw(&mut Bag::new(Some(1)), 30);
    let b = draw(&mut Bag::new(Some(2)), 30);
    assert_ne!(a, b);
}

#[test]
fn unseeded_bag_still_yields_permutations() {
    let mut bag = Bag::new(None);
    let set: HashSet<_> = draw(&mut bag, 7).into_iter().collect();
    assert_eq!(set.len(), 7);
}
