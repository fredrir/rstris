use rstris_lib::settings::{
    DEFAULT_PLAYER_NAME, KeyBindings, MAX_NAME_LEN, Settings, normalize_name,
};

#[test]
fn defaults_match_game_config() {
    let settings = Settings::default();
    let config = settings.game_config();
    assert_eq!(config.start_level, 1);
    assert_eq!(config.das_ms, settings.das_ms);
    assert_eq!(config.seed, None);
    assert_eq!(settings.player_name, DEFAULT_PLAYER_NAME);
}

#[test]
fn normalization_clamps_ranges() {
    let settings = Settings {
        start_level: 0,
        next_count: 99,
        das_ms: 5000,
        arr_ms: 999,
        soft_drop_factor: 0,
        lock_delay_ms: 1,
        sound_volume: 200,
        ..Settings::default()
    }
    .normalized();
    assert_eq!(settings.start_level, 1);
    assert_eq!(settings.next_count, 6);
    assert_eq!(settings.das_ms, 500);
    assert_eq!(settings.arr_ms, 200);
    assert_eq!(settings.soft_drop_factor, 1);
    assert_eq!(settings.lock_delay_ms, 100);
    assert_eq!(settings.sound_volume, 100);
}

#[test]
fn names_are_trimmed_capped_and_defaulted() {
    assert_eq!(normalize_name("   "), DEFAULT_PLAYER_NAME);
    assert_eq!(normalize_name("  Ada  "), "Ada");
    let long = "x".repeat(MAX_NAME_LEN + 10);
    assert_eq!(normalize_name(&long).chars().count(), MAX_NAME_LEN);
}

#[test]
fn key_bindings_dedupe_across_actions_and_cap_per_action() {
    let keys = KeyBindings {
        move_left: vec!["KeyA".into(), "KeyA".into(), " ".into()],
        move_right: vec!["KeyA".into(), "KeyD".into()],
        rotate_cw: vec!["KeyW".into(), "KeyX".into(), "ArrowUp".into()],
        ..KeyBindings::default()
    }
    .normalized();
    assert_eq!(keys.move_left, vec!["KeyA"]);
    assert_eq!(keys.move_right, vec!["KeyD"]);
    assert_eq!(keys.rotate_cw, vec!["KeyW", "KeyX"]);
}

#[test]
fn json_uses_camel_case_and_tolerates_missing_fields() {
    let json = serde_json::to_string(&Settings::default()).unwrap();
    assert!(json.contains("\"playerName\""));
    assert!(json.contains("\"rotate180\""));
    let partial: Settings =
        serde_json::from_str(r#"{"playerName":"Zed","keys":{"hold":["KeyH"]}}"#).unwrap();
    assert_eq!(partial.player_name, "Zed");
    assert_eq!(partial.keys.hold, vec!["KeyH"]);
    assert_eq!(partial.keys.pause, KeyBindings::default().pause);
    assert_eq!(partial.das_ms, Settings::default().das_ms);
}
