use rstris_lib::db::Database;
use rstris_lib::settings::Settings;

#[test]
fn settings_are_absent_until_saved() {
    let db = Database::open_in_memory().unwrap();
    assert_eq!(db.load_settings().unwrap(), None);
}

#[test]
fn settings_round_trip_and_overwrite() {
    let db = Database::open_in_memory().unwrap();
    let mut settings = Settings {
        player_name: "Ada".into(),
        das_ms: 90,
        ..Settings::default()
    };
    db.save_settings(&settings).unwrap();
    assert_eq!(db.load_settings().unwrap(), Some(settings.clone()));
    settings.start_level = 12;
    db.save_settings(&settings).unwrap();
    assert_eq!(db.load_settings().unwrap().unwrap().start_level, 12);
}

#[test]
fn loaded_settings_are_normalized() {
    let db = Database::open_in_memory().unwrap();
    let settings = Settings {
        start_level: 99,
        ..Settings::default()
    };
    db.save_settings(&settings).unwrap();
    assert_eq!(db.load_settings().unwrap().unwrap().start_level, 20);
}
