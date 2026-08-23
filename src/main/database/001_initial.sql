CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE COLLATE NOCASE, notes TEXT NOT NULL DEFAULT '', primary_classification TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_viewed_at TEXT);
CREATE TABLE IF NOT EXISTS stat_snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE, hands INTEGER, vpip REAL, pfr REAL, recorded_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS stat_player_time ON stat_snapshots(player_id, recorded_at DESC);
CREATE TABLE IF NOT EXISTS exploit_tags (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL UNIQUE, description TEXT NOT NULL, is_builtin INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS player_exploit_tags (player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE, exploit_tag_id INTEGER NOT NULL REFERENCES exploit_tags(id) ON DELETE CASCADE, selected_at TEXT NOT NULL, PRIMARY KEY(player_id, exploit_tag_id));
CREATE INDEX IF NOT EXISTS player_exploits ON player_exploit_tags(player_id);
