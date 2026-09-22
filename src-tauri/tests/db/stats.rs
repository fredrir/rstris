use rstris_lib::db::{Database, Stats};
use rstris_lib::game::GameSummary;

#[test]
fn empty_database_has_zero_stats() {
    let db = Database::open_in_memory().unwrap();
    assert_eq!(db.stats().unwrap(), Stats::default());
}

#[test]
fn stats_aggregate_over_all_games() {
    let db = Database::open_in_memory().unwrap();
    let games = [
        GameSummary {
            score: 1000,
            level: 2,
            lines: 12,
            start_level: 1,
            duration_ms: 60_000,
            pieces: 50,
            max_combo: 2,
            tetrises: 1,
            tspins: 0,
            perfect_clears: 0,
        },
        GameSummary {
            score: 5000,
            level: 6,
            lines: 55,
            start_level: 1,
            duration_ms: 240_000,
            pieces: 210,
            max_combo: 5,
            tetrises: 4,
            tspins: 3,
            perfect_clears: 1,
        },
    ];
    for game in &games {
        db.insert_score("P", game).unwrap();
    }
    let stats = db.stats().unwrap();
    assert_eq!(stats.games, 2);
    assert_eq!(stats.total_score, 6000);
    assert_eq!(stats.best_score, 5000);
    assert_eq!(stats.total_lines, 67);
    assert_eq!(stats.best_lines, 55);
    assert_eq!(stats.total_time_ms, 300_000);
    assert_eq!(stats.total_pieces, 260);
    assert_eq!(stats.highest_level, 6);
    assert_eq!(stats.tetrises, 5);
    assert_eq!(stats.tspins, 3);
    assert_eq!(stats.perfect_clears, 1);
    assert_eq!(stats.best_combo, 5);
}
