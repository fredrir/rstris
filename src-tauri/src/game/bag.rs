use rand::SeedableRng;
use rand::rngs::StdRng;
use rand::seq::SliceRandom;

use super::piece::Tetromino;

#[derive(Debug)]
pub struct Bag {
    rng: StdRng,
    pending: Vec<Tetromino>,
}

impl Bag {
    pub fn new(seed: Option<u64>) -> Self {
        Self {
            rng: StdRng::seed_from_u64(seed.unwrap_or_else(rand::random)),
            pending: Vec::with_capacity(7),
        }
    }

    pub fn draw(&mut self) -> Tetromino {
        if self.pending.is_empty() {
            let mut bag = Tetromino::ALL;
            bag.shuffle(&mut self.rng);
            self.pending.extend(bag);
        }
        self.pending.pop().expect("bag refilled")
    }
}
