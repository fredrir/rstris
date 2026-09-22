use rstris_lib::db::{Database, HIGH_SCORE_LIMIT};
use rstris_lib::game::GameSummary;

fn summary(score: u64) -> GameSummary {
    GameSummary {
        score,
        level: 3,
        lines: 25,
        start_level: 1,
        duration_ms: 90_000,
        pieces: 120,
        max_combo: 4,
        tetrises: 2,
        tspins: 1,
        perfect_clears: 0,
    }
}

#[test]
fn schema_migrates_to_latest() {
    let db = Database::open_in_memory().unwrap();
    assert_eq!(db.schema_version().unwrap(), 1);
}

#[test]
fn opening_a_file_creates_parent_directories() {
    let dir = std::env::temp_dir().join(format!("rstris-test-{}", std::process::id()));
    let path = dir.join("nested").join("rstris.sqlite3");
    let db = Database::open(&path).unwrap();
    db.insert_score("A", &summary(10)).unwrap();
    drop(db);
    let reopened = Database::open(&path).unwrap();
    assert_eq!(reopened.top_scores(10).unwrap().len(), 1);
    drop(reopened);
    std::fs::remove_dir_all(&dir).unwrap();
}

#[test]
fn insert_and_read_back_entry() {
    let db = Database::open_in_memory().unwrap();
    let id = db.insert_score("Fred", &summary(4200)).unwrap();
    let entry = db.score_by_id(id).unwrap().unwrap();
    assert_eq!(entry.name, "Fred");
    assert_eq!(entry.score, 4200);
    assert_eq!(entry.level, 3);
    assert_eq!(entry.lines, 25);
    assert_eq!(entry.duration_ms, 90_000);
    assert_eq!(entry.max_combo, 4);
    assert_eq!(entry.tetrises, 2);
    assert!(entry.played_at.ends_with('Z'));
    assert!(db.score_by_id(id + 1).unwrap().is_none());
}

#[test]
fn top_scores_are_sorted_and_limited() {
    let db = Database::open_in_memory().unwrap();
    for score in [500, 9000, 100, 9000, 3000] {
        db.insert_score("P", &summary(score)).unwrap();
    }
    let top = db.top_scores(3).unwrap();
    let scores: Vec<u64> = top.iter().map(|e| e.score).collect();
    assert_eq!(scores, vec![9000, 9000, 3000]);
    assert!(top[0].id < top[1].id);
    assert_eq!(db.top_scores(10).unwrap().len(), 5);
}

#[test]
fn rank_counts_ties_as_earlier() {
    let db = Database::open_in_memory().unwrap();
    assert_eq!(db.rank_for(0).unwrap(), 1);
    for score in [500, 9000, 3000] {
        db.insert_score("P", &summary(score)).unwrap();
    }
    assert_eq!(db.rank_for(10_000).unwrap(), 1);
    assert_eq!(db.rank_for(9000).unwrap(), 2);
    assert_eq!(db.rank_for(4000).unwrap(), 2);
    assert_eq!(db.rank_for(100).unwrap(), 4);
}

#[test]
fn qualifying_rank_respects_limit() {
    let db = Database::open_in_memory().unwrap();
    for score in 1..=HIGH_SCORE_LIMIT as u64 {
        db.insert_score("P", &summary(score * 100)).unwrap();
    }
    assert_eq!(db.qualifying_rank(5000, HIGH_SCORE_LIMIT).unwrap(), Some(1));
    assert_eq!(db.qualifying_rank(150, HIGH_SCORE_LIMIT).unwrap(), Some(10));
    assert_eq!(db.qualifying_rank(100, HIGH_SCORE_LIMIT).unwrap(), None);
    assert_eq!(db.qualifying_rank(0, HIGH_SCORE_LIMIT).unwrap(), None);
}

#[test]
fn clear_removes_everything() {
    let db = Database::open_in_memory().unwrap();
    db.insert_score("P", &summary(1)).unwrap();
    db.clear_scores().unwrap();
    assert!(db.top_scores(10).unwrap().is_empty());
}
