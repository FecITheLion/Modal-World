<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function start_app_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_name('orbital_relics');
    session_set_cookie_params([
        'httponly' => true,
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite' => 'Lax',
        'path' => '/',
    ]);
    session_start();
}

function db(): PDO
{
    static $pdo;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $pdo = new PDO('sqlite:' . DATABASE_FILE, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA journal_mode = WAL');
    $pdo->exec(<<<'SQL'
CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
    sphere_json TEXT NOT NULL,
    rival_json TEXT NOT NULL,
    sphere_type TEXT NOT NULL DEFAULT '',
    strategy TEXT NOT NULL DEFAULT 'adaptive',
    logic_text TEXT NOT NULL DEFAULT '',
    gdt_json TEXT NOT NULL DEFAULT '[]',
    symbols_json TEXT NOT NULL DEFAULT '[]',
    colors_json TEXT NOT NULL DEFAULT '[]',
    color TEXT NOT NULL DEFAULT '#70e6ff',
    rarity TEXT NOT NULL DEFAULT 'standard',
    cell_count INTEGER NOT NULL DEFAULT 4,
    diameter_level INTEGER NOT NULL DEFAULT 0,
    spin_level INTEGER NOT NULL DEFAULT 0,
    sphere_value_credits INTEGER NOT NULL DEFAULT 0,
    paid_spend_cents INTEGER NOT NULL DEFAULT 0,
    pulsar_until TEXT,
    last_seen_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    challenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opponent_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'running', 'completed', 'declined', 'expired')),
    challenger_ready INTEGER NOT NULL DEFAULT 0,
    opponent_ready INTEGER NOT NULL DEFAULT 0,
    challenger_seen_at TEXT,
    opponent_seen_at TEXT,
    winner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    result_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TEXT,
    completed_at TEXT
);
CREATE TABLE IF NOT EXISTS live_battles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opponent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    mode TEXT NOT NULL CHECK (mode IN ('bot', 'player')),
    odds INTEGER NOT NULL,
    rival_power INTEGER NOT NULL DEFAULT 57,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    last_direction TEXT NOT NULL DEFAULT '',
    streak INTEGER NOT NULL DEFAULT 0,
    taps INTEGER NOT NULL DEFAULT 0,
    pulsar INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    won INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS learned (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    combo_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, combo_text)
);
CREATE TABLE IF NOT EXISTS battles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    won INTEGER NOT NULL,
    odds INTEGER NOT NULL,
    reward INTEGER NOT NULL,
    mitosis INTEGER NOT NULL,
    combo_text TEXT NOT NULL,
    opponent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    challenge_id INTEGER REFERENCES challenges(id) ON DELETE SET NULL,
    drops_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS arena_loot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    battle_id INTEGER REFERENCES battles(id) ON DELETE CASCADE,
    challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
    item_json TEXT NOT NULL,
    claimed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    claimed_at TEXT,
    expires_at TEXT NOT NULL DEFAULT (datetime('now', '+900 seconds')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS credit_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delta INTEGER NOT NULL,
    kind TEXT NOT NULL,
    reference_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS credit_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL UNIQUE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 100),
    credits INTEGER NOT NULL CHECK (credits >= 100),
    status TEXT NOT NULL DEFAULT 'created',
    capture_id TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS store_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL UNIQUE,
    product TEXT NOT NULL CHECK (product IN ('pulsar')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents = 100),
    status TEXT NOT NULL DEFAULT 'created',
    capture_id TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credits INTEGER NOT NULL CHECK (credits >= 500),
    receiver_email TEXT NOT NULL,
    batch_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    error_text TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS user_truth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relation_text TEXT NOT NULL,
    truth_value TEXT NOT NULL CHECK (truth_value IN ('true', 'false', 'unknown')),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, relation_text)
);
CREATE TABLE IF NOT EXISTS passed_players (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    passed_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, passed_user_id)
);
CREATE TABLE IF NOT EXISTS popular_analogies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    relation_key TEXT NOT NULL UNIQUE,
    relation_text TEXT NOT NULL,
    popularity INTEGER NOT NULL DEFAULT 0 CHECK (popularity >= 0),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sphere_json TEXT NOT NULL,
    title TEXT NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 100),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'sold', 'withdrawn')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    bidder_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credits INTEGER NOT NULL CHECK (credits > 0),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'declined', 'cancelled')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS paypal_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id INTEGER NOT NULL REFERENCES listings(id),
    order_id TEXT NOT NULL UNIQUE,
    amount_cents INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    capture_id TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS listings_open_idx ON listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS bids_listing_idx ON bids(listing_id, status, credits DESC);
CREATE INDEX IF NOT EXISTS battles_user_idx ON battles(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS challenges_players_idx ON challenges(challenger_id, opponent_id, status);
CREATE INDEX IF NOT EXISTS arena_loot_open_idx ON arena_loot(expires_at, claimed_at);
CREATE INDEX IF NOT EXISTS live_battles_user_idx ON live_battles(user_id, status);
SQL);
    ensure_column($pdo, 'users', 'sphere_type', "TEXT NOT NULL DEFAULT ''");
    ensure_column($pdo, 'users', 'symbols_json', "TEXT NOT NULL DEFAULT '[]'");
    ensure_column($pdo, 'users', 'colors_json', "TEXT NOT NULL DEFAULT '[]'");
    ensure_column($pdo, 'users', 'diameter_level', 'INTEGER NOT NULL DEFAULT 0');
    ensure_column($pdo, 'users', 'spin_level', 'INTEGER NOT NULL DEFAULT 0');
    ensure_column($pdo, 'users', 'sphere_value_credits', 'INTEGER NOT NULL DEFAULT 0');
    ensure_column($pdo, 'users', 'paid_spend_cents', 'INTEGER NOT NULL DEFAULT 0');
    ensure_column($pdo, 'users', 'pulsar_until', 'TEXT');
    ensure_column($pdo, 'users', 'last_seen_at', 'TEXT');
    ensure_column($pdo, 'battles', 'opponent_id', 'INTEGER REFERENCES users(id) ON DELETE SET NULL');
    ensure_column($pdo, 'battles', 'challenge_id', 'INTEGER REFERENCES challenges(id) ON DELETE SET NULL');
    ensure_column($pdo, 'battles', 'drops_json', "TEXT NOT NULL DEFAULT '[]'");
    $pdo->exec("UPDATE listings SET status = 'withdrawn' WHERE seller_id IS NULL AND status = 'open'");
    $seededTraits = $pdo->query("SELECT value FROM app_meta WHERE key = 'player_traits_v1'")->fetchColumn();
    if ($seededTraits !== 'done') {
        $players = $pdo->query("SELECT id, color FROM users WHERE sphere_type = '' OR symbols_json = '[]' OR colors_json = '[]'")->fetchAll();
        $update = $pdo->prepare("UPDATE users SET sphere_type = CASE WHEN sphere_type = '' THEN ? ELSE sphere_type END, symbols_json = CASE WHEN symbols_json = '[]' THEN ? ELSE symbols_json END, colors_json = CASE WHEN colors_json = '[]' THEN ? ELSE colors_json END WHERE id = ?");
        foreach ($players as $player) {
            $baseColor = (string) $player['color'];
            $update->execute([
                random_sphere_type(),
                json_for(random_sphere_symbols()),
                json_for([$baseColor]),
                $player['id'],
            ]);
        }
        $pdo->exec("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('player_traits_v1', 'done')");
    }
    seed_popular_analogies($pdo);
    return $pdo;
}

function ensure_column(PDO $pdo, string $table, string $column, string $definition): void
{
    $columns = $pdo->query('PRAGMA table_info(' . $table . ')')->fetchAll();
    foreach ($columns as $existing) {
        if ($existing['name'] === $column) {
            return;
        }
    }
    $pdo->exec('ALTER TABLE ' . $table . ' ADD COLUMN ' . $column . ' ' . $definition);
}

function random_sphere_type(): string
{
    return ['Vortex', 'Kinetic', 'Anchor', 'Resonant'][random_int(0, 3)];
}

function random_sphere_color(): string
{
    return ['#70e6ff', '#ff896f', '#b49aff', '#9bea9a', '#ffd36e'][random_int(0, 4)];
}

function random_sphere_symbols(): array
{
    $symbols = ['∧', '∨', '→', '↔', '¬', '⊕'];
    shuffle($symbols);
    return array_slice($symbols, 0, 3);
}

function seed_popular_analogies(PDO $pdo): void
{
    if ($pdo->query("SELECT 1 FROM popular_analogies LIMIT 1")->fetchColumn()) {
        return;
    }
    $insert = $pdo->prepare('INSERT OR IGNORE INTO popular_analogies (relation_key, relation_text, popularity) VALUES (?, ?, ?)');
    foreach (seed_sphere() as $index => $item) {
        $key = normalize_relation((string) $item['text']);
        $insert->execute([$key, $item['text'], max(1, 12 - $index)]);
    }
}

function normalize_relation(string $text): string
{
    return mb_strtolower(trim(preg_replace('/[^\pL\pN]+/u', ' ', $text) ?? ''));
}

function earn_daily_credits(int $userId, int $requested, string $kind, string $reference): int
{
    $statement = db()->prepare("SELECT COALESCE(SUM(delta), 0) FROM credit_ledger WHERE user_id = ? AND delta > 0 AND kind IN ('battle', 'discovery') AND date(created_at) = date('now')");
    $statement->execute([$userId]);
    $earnedToday = (int) $statement->fetchColumn();
    $award = max(0, min($requested, 10 - $earnedToday));
    if ($award > 0) {
        $ledger = db()->prepare('INSERT INTO credit_ledger (user_id, delta, kind, reference_id) VALUES (?, ?, ?, ?)');
        $ledger->execute([$userId, $award, $kind, $reference]);
    }
    return $award;
}

function credit_truth(int $userId, string $relation): array
{
    $text = mb_substr(trim(strip_tags($relation)), 0, 240);
    $personal = db()->prepare('SELECT truth_value FROM user_truth WHERE user_id = ? AND relation_text = ?');
    $personal->execute([$userId, $text]);
    $value = $personal->fetchColumn();
    $popular = db()->prepare('SELECT relation_text, popularity FROM popular_analogies WHERE relation_key = ?');
    $popular->execute([normalize_relation($text)]);
    $standard = $popular->fetch();
    if ($value !== false) {
        return ['relation' => $text, 'truth' => $value, 'source' => 'personal', 'popularity' => (int) ($standard['popularity'] ?? 0)];
    }
    return [
        'relation' => $text,
        'truth' => $standard ? 'true' : 'unknown',
        'source' => $standard ? 'community' : 'unrated',
        'popularity' => (int) ($standard['popularity'] ?? 0),
        'standard' => $standard['relation_text'] ?? null,
    ];
}

function record_relation_popularity(string $relation): void
{
    $text = mb_substr(trim(strip_tags($relation)), 0, 240);
    if ($text === '') {
        return;
    }
    $statement = db()->prepare(<<<'SQL'
INSERT INTO popular_analogies (relation_key, relation_text, popularity)
VALUES (?, ?, 1)
ON CONFLICT(relation_key) DO UPDATE SET popularity = popularity + 1, updated_at = CURRENT_TIMESTAMP
SQL);
    $statement->execute([normalize_relation($text), $text]);
}

function random_loot_item(array $user): array
{
    $available = [];
    foreach ($user['sphere'] as $analogy) {
        $available[] = ['kind' => 'analogy', 'value' => $analogy];
    }
    foreach ($user['symbols'] as $symbol) {
        $available[] = ['kind' => 'symbol', 'value' => $symbol];
    }
    foreach ($user['colors'] as $color) {
        if ($color !== $user['color']) {
            $available[] = ['kind' => 'color', 'value' => $color];
        }
    }
    if (!$available) {
        return ['kind' => 'symbol', 'value' => random_sphere_symbols()[0]];
    }
    return $available[array_rand($available)];
}

function apply_sphere_item(array $user, array $item): array
{
    $kind = $item['kind'] ?? '';
    if ($kind === 'analogy' && is_array($item['value'] ?? null)) {
        $analogy = $item['value'];
        $key = mb_strtolower((string) ($analogy['text'] ?? ''));
        foreach ($user['sphere'] as &$existing) {
            if (mb_strtolower((string) ($existing['text'] ?? '')) === $key) {
                $existing['r'] = min(8, (float) ($existing['r'] ?? 0.55) + 0.5);
                $existing['experience'] = (int) ($existing['experience'] ?? 0) + 1;
                unset($existing);
                return $user;
            }
        }
        unset($existing);
        $analogy['id'] = bin2hex(random_bytes(6));
        $analogy['origin'] = 'match';
        $analogy['experience'] = (int) ($analogy['experience'] ?? 0) + 1;
        $analogy['r'] = min(8, max(1, (float) ($analogy['r'] ?? 1)) + 0.5);
        $user['sphere'][] = $analogy;
    } elseif ($kind === 'symbol' && is_string($item['value']) && !in_array($item['value'], $user['symbols'], true)) {
        $user['symbols'][] = $item['value'];
    } elseif ($kind === 'color' && is_string($item['value']) && preg_match('/^#[a-f\d]{6}$/i', $item['value']) && !in_array($item['value'], $user['colors'], true)) {
        $user['colors'][] = $item['value'];
        $user['color'] = $item['value'];
    } elseif ($kind === 'gdt' && is_string($item['value']) && !in_array($item['value'], $user['gdt'], true)) {
        $user['gdt'][] = $item['value'];
    } elseif ($kind === 'logic' && is_string($item['value'])) {
        $user['logic_text'] = mb_substr(trim($user['logic_text'] . ' ' . $item['value']), 0, 500);
    }
    return $user;
}

function take_sphere_item(array $user, array $item): array
{
    $kind = $item['kind'] ?? '';
    if ($kind === 'analogy' && is_array($item['value'] ?? null)) {
        $key = (string) ($item['value']['id'] ?? '');
        $user['sphere'] = array_values(array_filter($user['sphere'], static fn ($analogy) => (string) ($analogy['id'] ?? '') !== $key));
    } elseif ($kind === 'symbol') {
        $index = array_search($item['value'] ?? null, $user['symbols'], true);
        if ($index !== false && count($user['symbols']) > 1) {
            array_splice($user['symbols'], $index, 1);
        }
    } elseif ($kind === 'color') {
        $index = array_search($item['value'] ?? null, $user['colors'], true);
        if ($index !== false && count($user['colors']) > 1) {
            array_splice($user['colors'], $index, 1);
            if ($user['color'] === $item['value']) {
                $user['color'] = $user['colors'][array_rand($user['colors'])];
            }
        }
    } elseif ($kind === 'gdt') {
        $index = array_search($item['value'] ?? null, $user['gdt'], true);
        if ($index !== false) {
            array_splice($user['gdt'], $index, 1);
        }
    } elseif ($kind === 'logic') {
        $user['logic_text'] = '';
    }
    return $user;
}

function recent_challenge(int $playerId, int $opponentId): ?array
{
    $statement = db()->prepare('SELECT challenger_id, opponent_id, created_at FROM challenges WHERE status IN (\'completed\', \'running\', \'accepted\') AND ((challenger_id = ? AND opponent_id = ?) OR (challenger_id = ? AND opponent_id = ?)) ORDER BY id DESC LIMIT 1');
    $statement->execute([$playerId, $opponentId, $opponentId, $playerId]);
    $row = $statement->fetch();
    return $row ?: null;
}

function online_opponents(int $viewerId): array
{
    $statement = db()->prepare(<<<'SQL'
SELECT id, username, sphere_type, color, cell_count, created_at
FROM users
WHERE id <> ? AND last_seen_at >= datetime('now', '-5 minutes')
ORDER BY last_seen_at DESC LIMIT 80
SQL);
    $statement->execute([$viewerId]);
    $candidates = $statement->fetchAll();
    $lastMatch = db()->prepare('SELECT opponent_id FROM battles WHERE user_id = ? AND opponent_id IS NOT NULL ORDER BY id DESC LIMIT 1');
    $lastMatch->execute([$viewerId]);
    $lastOpponent = $lastMatch->fetchColumn();
    $passed = db()->prepare('SELECT passed_user_id FROM passed_players WHERE user_id = ?');
    $passed->execute([$viewerId]);
    $passedIds = array_fill_keys(array_map('intval', $passed->fetchAll(PDO::FETCH_COLUMN)), true);
    return array_values(array_filter(array_map(static function ($row) use ($viewerId, $lastOpponent, $passedIds): ?array {
        $id = (int) $row['id'];
        if ($id === (int) $lastOpponent || isset($passedIds[$id])) {
            return null;
        }
        $row['id'] = $id;
        $row['cell_count'] = (int) $row['cell_count'];
        return $row;
    }, $candidates)));
}

function challenge_for_user(int $id, int $userId): ?array
{
    $statement = db()->prepare('SELECT c.*, a.username AS challenger_name, o.username AS opponent_name FROM challenges c JOIN users a ON a.id = c.challenger_id LEFT JOIN users o ON o.id = c.opponent_id WHERE c.id = ? AND (c.challenger_id = ? OR c.opponent_id = ?)');
    $statement->execute([$id, $userId, $userId]);
    return $statement->fetch() ?: null;
}

function challenge_payload(array $challenge, int $userId): array
{
    return [
        'id' => (int) $challenge['id'],
        'status' => $challenge['status'],
        'challengerId' => (int) $challenge['challenger_id'],
        'challenger' => $challenge['challenger_name'],
        'opponentId' => $challenge['opponent_id'] === null ? null : (int) $challenge['opponent_id'],
        'opponent' => $challenge['opponent_name'],
        'youAreChallenger' => (int) $challenge['challenger_id'] === $userId,
        'challengerReady' => (bool) $challenge['challenger_ready'],
        'opponentReady' => (bool) $challenge['opponent_ready'],
        'result' => decode_json_array($challenge['result_json']),
    ];
}

function seed_sphere(): array
{
    $examples = [
        ['text' => 'boy:girl :: father:mother', 'r' => 5.36, 'theta' => 0.031, 'negated' => true],
        ['text' => 'young:old :: cat:dog', 'r' => 6.56, 'theta' => -2.791, 'negated' => true],
        ['text' => 'sun:star :: moon:satellite', 'r' => 7.56, 'theta' => 1.121, 'negated' => false],
        ['text' => 'electron:nucleus :: planet:sun', 'r' => 7.44, 'theta' => -1.219, 'negated' => true],
        ['text' => 'wing:bird :: fin:fish', 'r' => 7.42, 'theta' => -0.992, 'negated' => true],
        ['text' => 'author:book :: painter:canvas', 'r' => 7.44, 'theta' => 1.677, 'negated' => false],
        ['text' => 'night:day :: right:left', 'r' => 8.0, 'theta' => 0.941, 'negated' => false],
    ];
    foreach ($examples as $i => &$example) {
        $example['id'] = 'seed-' . $i;
    }
    unset($example);
    return $examples;
}

function seed_rival(): array
{
    $examples = [
        'seed' => ['text' => 'seed:tree :: idea:invention', 'r' => 5.8, 'theta' => 0.7, 'negated' => false, 'id' => 'r-1'],
        'orbit' => ['text' => 'planet:orbit :: runner:track', 'r' => 6.2, 'theta' => -1.2, 'negated' => false, 'id' => 'r-2'],
        'signal' => ['text' => 'question:answer :: signal:response', 'r' => 5.1, 'theta' => 2.1, 'negated' => true, 'id' => 'r-3'],
    ];
    return [
        ...array_values($examples),
        ['kind' => 'symbol', 'value' => '∧'],
        ['kind' => 'symbol', 'value' => '→'],
        ['kind' => 'color', 'value' => random_sphere_color()],
        ['kind' => 'type', 'value' => random_sphere_type()],
    ];
}

function csrf_token(): string
{
    start_app_session();
    if (!isset($_SESSION['_csrf'])) {
        $_SESSION['_csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['_csrf'];
}

function verify_csrf(?string $token): bool
{
    start_app_session();
    return is_string($token) && isset($_SESSION['_csrf']) && hash_equals($_SESSION['_csrf'], $token);
}

function current_user_id(): ?int
{
    start_app_session();
    return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
}

function current_user(): ?array
{
    $id = current_user_id();
    return $id === null ? null : find_user_by_id($id);
}

function find_user_by_id(int $id): ?array
{
    $statement = db()->prepare('SELECT * FROM users WHERE id = ?');
    $statement->execute([$id]);
    $row = $statement->fetch();
    return $row ? hydrate_user($row) : null;
}

function hydrate_user(array $row): array
{
    $row['sphere'] = decode_json_array($row['sphere_json']);
    $row['rival'] = decode_json_array($row['rival_json']);
    $row['gdt'] = decode_json_array($row['gdt_json']);
    $row['symbols'] = decode_json_array($row['symbols_json']);
    $row['colors'] = decode_json_array($row['colors_json']);
    unset($row['password_hash'], $row['sphere_json'], $row['rival_json'], $row['gdt_json'], $row['symbols_json'], $row['colors_json']);
    $row['id'] = (int) $row['id'];
    $row['credits'] = (int) $row['credits'];
    $row['cell_count'] = (int) $row['cell_count'];
    $row['diameter_level'] = (int) $row['diameter_level'];
    $row['spin_level'] = (int) $row['spin_level'];
    $row['sphere_type'] = (string) $row['sphere_type'];
    return $row;
}

function decode_json_array(string $json): array
{
    $value = json_decode($json, true);
    return is_array($value) ? $value : [];
}

function register_user(string $username, string $password): array|string
{
    $username = trim($username);
    if (!preg_match('/^[A-Za-z0-9_]{3,20}$/', $username)) {
        return 'Choose a username with 3–20 letters, numbers, or underscores.';
    }
    if (strlen($password) < 10 || strlen($password) > 200) {
        return 'Use a password between 10 and 200 characters.';
    }
    try {
        $color = random_sphere_color();
        $statement = db()->prepare('INSERT INTO users (username, password_hash, sphere_json, rival_json, sphere_type, symbols_json, colors_json, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $statement->execute([
            $username,
            password_hash($password, PASSWORD_DEFAULT),
            json_encode(seed_sphere(), JSON_THROW_ON_ERROR),
            json_encode(seed_rival(), JSON_THROW_ON_ERROR),
            random_sphere_type(),
            json_for(random_sphere_symbols()),
            json_for([$color]),
            $color,
        ]);
    } catch (PDOException $error) {
        if (str_contains(strtolower($error->getMessage()), 'unique')) {
            return 'That username is already taken.';
        }
        throw $error;
    }
    return find_user_by_id((int) db()->lastInsertId()) ?? 'Your account could not be created.';
}

function sign_in(string $username, string $password): ?array
{
    $statement = db()->prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE');
    $statement->execute([trim($username)]);
    $row = $statement->fetch();
    if (!$row || !password_verify($password, $row['password_hash'])) {
        return null;
    }
    if (password_needs_rehash($row['password_hash'], PASSWORD_DEFAULT)) {
        $update = db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $update->execute([password_hash($password, PASSWORD_DEFAULT), $row['id']]);
    }
    return hydrate_user($row);
}

function e(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function json_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

function require_user(): array
{
    $user = current_user();
    if (!$user) {
        json_response(['error' => 'Sign in to continue.'], 401);
    }
    return $user;
}

function request_payload(): array
{
    $payload = json_decode((string) file_get_contents('php://input'), true);
    return is_array($payload) ? $payload : [];
}

function expect_csrf(array $payload): void
{
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($payload['_csrf'] ?? null);
    if (!verify_csrf(is_string($token) ? $token : null)) {
        json_response(['error' => 'Your session token expired. Refresh and try again.'], 403);
    }
}

function parse_analogies(string $content): array
{
    $content = mb_substr($content, 0, 1_000_000);
    $items = [];
    if (preg_match_all('/\|ANALOGY_\d+\|=([^\r\n]+)/i', $content, $matches, PREG_OFFSET_CAPTURE)) {
        foreach ($matches[0] as $index => $match) {
            $start = $match[1];
            $end = $matches[0][$index + 1][1] ?? strlen($content);
            $block = substr($content, $start, $end - $start);
            $text = trim($matches[1][$index][0]);
            $magnitude = preg_match('/MAGNITUDE_R=([0-9.]+)/i', $block, $rMatch) ? (float) $rMatch[1] : 5.0;
            $theta = preg_match('/ANGLE_THETA=(-?[0-9.]+)/i', $block, $thetaMatch) ? (float) $thetaMatch[1] : 0.0;
            $negated = preg_match('/NEGATED_180=(true|false)/i', $block, $negativeMatch) && strtolower($negativeMatch[1]) === 'true';
            $items[] = analogy_item($text, $magnitude, $theta, $negated, 'imported');
        }
    }
    if (!$items) {
        foreach (preg_split('/\R/u', $content) ?: [] as $line) {
            $line = trim(strip_tags($line));
            if (mb_strlen($line) < 2 || mb_strlen($line) > 240 || preg_match('/^(?:MAGNITUDE_R|ANGLE_THETA|NEGATED_180)=/i', $line)) {
                continue;
            }
            $items[] = analogy_item($line, 0.55, 0.0, str_contains($line, '!='), 'imported');
            if (count($items) >= 500) {
                break;
            }
        }
    }
    $seen = [];
    $unique = [];
    foreach ($items as $item) {
        $key = mb_strtolower($item['text']);
        if (!isset($seen[$key])) {
            $seen[$key] = true;
            $unique[] = $item;
        }
    }
    return array_slice($unique, 0, 500);
}

function analogy_item(string $text, float $magnitude, float $theta, bool $negated, string $origin = 'match'): array
{
    $magnitude = max(0.5, min(8.0, is_finite($magnitude) ? $magnitude : 4.0));
    return [
        'id' => bin2hex(random_bytes(6)),
        'text' => mb_substr(trim(strip_tags($text)), 0, 240),
        'r' => $origin === 'imported' ? 0.55 : round($magnitude, 2),
        'theta' => round(is_finite($theta) ? fmod($theta, 6.28319) : 0.0, 5),
        'negated' => $negated,
        'origin' => $origin,
        'experience' => 0,
    ];
}

function json_for(array $value): string
{
    return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
}

function sphere_power(array $user): int
{
    $analogies = $user['sphere'];
    $analogyPower = array_sum(array_map(static function ($item): float {
        $radius = (float) ($item['r'] ?? 4);
        return $radius * (($item['origin'] ?? '') === 'imported' ? 0.05 : 0.36);
    }, $analogies));
    $logicTokens = preg_match_all('/\b(?:and|or|xor|iff|implies|not)\b|[∧∨⊕↔¬→]/iu', (string) $user['logic_text']);
    $strategyBonus = ['aggressive' => 8, 'defensive' => 4, 'adaptive' => 6][$user['strategy']] ?? 5;
    return (int) round(min(100, 25 + $analogyPower + min(8, count($user['symbols']) * 1.4) + min(12, $logicTokens * 2) + count($user['gdt']) * 2 + (int) ($user['diameter_level'] ?? 0) * 2 + (int) ($user['spin_level'] ?? 0) * 1.5 + $strategyBonus));
}

function battle_odds(array $user, ?array $opponent = null): int
{
    $player = sphere_power($user);
    $rival = $opponent ? sphere_power($opponent) : 57;
    $typeAdvantage = sphere_type_advantage((string) $user['sphere_type'], (string) ($opponent['sphere_type'] ?? 'Kinetic'));
    return max(18, min(82, (int) round(50 + ($player - $rival) * 0.85 + $typeAdvantage)));
}

function sphere_type_advantage(string $playerType, string $opponentType): int
{
    $beats = [
        'Vortex' => 'Kinetic',
        'Kinetic' => 'Anchor',
        'Anchor' => 'Resonant',
        'Resonant' => 'Vortex',
    ];
    if (($beats[$playerType] ?? null) === $opponentType) {
        return 8;
    }
    if (($beats[$opponentType] ?? null) === $playerType) {
        return -8;
    }
    return 0;
}

function upgrade_price(string $upgrade, int $level): int
{
    return match ($upgrade) {
        'diameter' => 12 + $level * 8,
        'spin' => 10 + $level * 7,
        default => throw new InvalidArgumentException('Unknown sphere upgrade.'),
    };
}

function sphere_is_listed(int $userId): bool
{
    $statement = db()->prepare("SELECT 1 FROM listings WHERE seller_id = ? AND status = 'open' LIMIT 1");
    $statement->execute([$userId]);
    return (bool) $statement->fetchColumn();
}

function reset_sphere_after_sale(array $user): array
{
    $color = random_sphere_color();
    $user['sphere'] = seed_sphere();
    $user['sphere_type'] = random_sphere_type();
    $user['symbols'] = random_sphere_symbols();
    $user['colors'] = [$color];
    $user['color'] = $color;
    $user['rarity'] = 'standard';
    $user['logic_text'] = '';
    $user['gdt'] = [];
    $user['diameter_level'] = 0;
    $user['spin_level'] = 0;
    return $user;
}

function relation_terms(string $text): array
{
    $parts = preg_split('/\s*(?:::|!=|[↔=])\s*/u', $text, 2);
    if (count($parts) < 2) {
        return [mb_substr($text, 0, 80), 'pattern'];
    }
    return [mb_substr(trim($parts[0]), 0, 80), mb_substr(trim($parts[1]), 0, 80)];
}

function make_discovery(array $user, string $rivalText): string
{
    $ownText = $user['sphere']
        ? (string) ($user['sphere'][array_rand($user['sphere'])]['text'] ?? 'signal:response :: action:result')
        : 'signal:response :: action:result';
    [$leftA, $rightA] = relation_terms($ownText);
    [$leftB, $rightB] = relation_terms($rivalText);
    return mb_substr($leftA . ' × ' . $leftB . ' :: ' . $rightA . ' × ' . $rightB, 0, 220);
}

function absorb_sphere(array $user, array $sphere): array
{
    $known = [];
    foreach ($user['sphere'] as $item) {
        $known[mb_strtolower((string) ($item['text'] ?? ''))] = true;
    }
    foreach (($sphere['analogies'] ?? []) as $item) {
        if (!is_array($item) || !isset($item['text'])) {
            continue;
        }
        $key = mb_strtolower(trim((string) $item['text']));
        if ($key !== '' && !isset($known[$key]) && count($user['sphere']) < 1000) {
            $item['id'] = bin2hex(random_bytes(6));
            $item['r'] = max(2.0, (float) ($item['r'] ?? 2.0));
            $item['origin'] = 'market';
            $item['experience'] = (int) ($item['experience'] ?? 0) + 1;
            $user['sphere'][] = $item;
            $known[$key] = true;
        }
    }
    foreach (array_filter($sphere['symbols'] ?? [], 'is_string') as $symbol) {
        if (!in_array($symbol, $user['symbols'], true)) {
            $user['symbols'][] = $symbol;
        }
    }
    foreach (array_filter($sphere['colors'] ?? [$sphere['color'] ?? null], 'is_string') as $color) {
        if (preg_match('/^#[a-f\d]{6}$/i', $color) && !in_array($color, $user['colors'], true)) {
            $user['colors'][] = $color;
        }
    }
    if (!empty($sphere['logic'])) {
        $user['logic_text'] = mb_substr(trim($user['logic_text'] . '  ' . $sphere['logic']), 0, 500);
    }
    if (!$user['color'] && $user['colors']) {
        $user['color'] = $user['colors'][array_rand($user['colors'])];
    }
    $user['gdt'] = array_values(array_unique(array_slice(array_merge($user['gdt'], array_filter($sphere['gdt'] ?? [], 'is_string')), 0, 32)));
    if (($sphere['rarity'] ?? '') === 'rare') {
        $user['rarity'] = 'rare';
    }
    return $user;
}

function save_user_sphere(array $user): void
{
    $statement = db()->prepare('UPDATE users SET sphere_json = ?, rival_json = ?, sphere_type = ?, strategy = ?, logic_text = ?, gdt_json = ?, symbols_json = ?, colors_json = ?, color = ?, rarity = ?, cell_count = ?, diameter_level = ?, spin_level = ?, sphere_value_credits = ?, pulsar_until = ?, credits = ? WHERE id = ?');
    $statement->execute([
        json_for($user['sphere']),
        json_for($user['rival']),
        $user['sphere_type'],
        $user['strategy'],
        $user['logic_text'],
        json_for($user['gdt']),
        json_for($user['symbols']),
        json_for($user['colors']),
        $user['color'],
        $user['rarity'],
        $user['cell_count'],
        $user['diameter_level'],
        $user['spin_level'],
        $user['sphere_value_credits'],
        $user['pulsar_until'],
        $user['credits'],
        $user['id'],
    ]);
}

function market_listings(int $viewerId): array
{
    $statement = db()->prepare(<<<'SQL'
SELECT l.id, l.seller_id, l.sphere_json, l.title, l.price_cents, l.created_at,
       u.username AS seller
FROM listings l JOIN users u ON u.id = l.seller_id
WHERE l.status = 'open' AND l.seller_id <> ?
ORDER BY l.created_at DESC, l.id DESC LIMIT 24
SQL);
    $statement->execute([$viewerId]);
    $listings = [];
    foreach ($statement->fetchAll() as $row) {
        $sphere = decode_json_array($row['sphere_json']);
        $row['id'] = (int) $row['id'];
        $row['price_cents'] = (int) $row['price_cents'];
        $row['sphere'] = $sphere;
        $row['analogies'] = is_array($sphere['analogies'] ?? null) ? count($sphere['analogies']) : 0;
        $row['minimum_bid'] = (int) ($sphere['sphere_value_credits'] ?? 0);
        $bidQuery = db()->prepare("SELECT MAX(credits) FROM bids WHERE listing_id = ? AND status = 'open'");
        $bidQuery->execute([$row['id']]);
        $row['highest_bid'] = (int) ($bidQuery->fetchColumn() ?: 0);
        unset($row['sphere_json']);
        $listings[] = $row;
    }
    return $listings;
}

function own_listings(int $sellerId): array
{
    $statement = db()->prepare("SELECT id, title, price_cents, created_at, sphere_json FROM listings WHERE seller_id = ? AND status = 'open' ORDER BY id DESC LIMIT 5");
    $statement->execute([$sellerId]);
    $listings = [];
    foreach ($statement->fetchAll() as $listing) {
        $listing['id'] = (int) $listing['id'];
        $listing['price_cents'] = (int) $listing['price_cents'];
        $listing['minimum_bid'] = (int) (decode_json_array($listing['sphere_json'])['sphere_value_credits'] ?? 0);
        unset($listing['sphere_json']);
        $bids = db()->prepare(<<<'SQL'
SELECT b.id, b.credits, u.username
FROM bids b JOIN users u ON u.id = b.bidder_id
WHERE b.listing_id = ? AND b.status = 'open'
ORDER BY b.credits DESC, b.created_at DESC LIMIT 20
SQL);
        $bids->execute([$listing['id']]);
        $listing['bids'] = $bids->fetchAll();
        foreach ($listing['bids'] as &$bid) {
            $bid['id'] = (int) $bid['id'];
            $bid['credits'] = (int) $bid['credits'];
        }
        unset($bid);
        $listings[] = $listing;
    }
    return $listings;
}

function recent_discoveries(int $userId): array
{
    $statement = db()->prepare('SELECT combo_text, created_at FROM learned WHERE user_id = ? ORDER BY id DESC LIMIT 4');
    $statement->execute([$userId]);
    return $statement->fetchAll();
}

function recent_battles(int $userId): array
{
    $statement = db()->prepare('SELECT won, odds, reward, mitosis, combo_text, created_at FROM battles WHERE user_id = ? ORDER BY id DESC LIMIT 5');
    $statement->execute([$userId]);
    return $statement->fetchAll();
}

function paypal_api_request(string $method, string $path, ?array $body = null): array
{
    if (!function_exists('curl_init')) {
        throw new RuntimeException('The PHP cURL extension is required for PayPal checkout.');
    }
    if (PAYPAL_CLIENT_ID === '' || PAYPAL_CLIENT_SECRET === '') {
        throw new RuntimeException('PayPal checkout is not configured on this server.');
    }
    $base = PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    $ch = curl_init($base . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_USERPWD => PAYPAL_CLIENT_ID . ':' . PAYPAL_CLIENT_SECRET,
        CURLOPT_HTTPHEADER => ['Accept: application/json', 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS => $body === null ? null : json_for($body),
        CURLOPT_TIMEOUT => 20,
    ]);
    $response = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    if (!is_string($response)) {
        throw new RuntimeException('PayPal request failed: ' . ($error ?: 'network error'));
    }
    $decoded = json_decode($response, true);
    if ($status < 200 || $status >= 300 || !is_array($decoded)) {
        throw new RuntimeException('PayPal could not complete this request. Please try again.');
    }
    return $decoded;
}

function paypal_access_token(): string
{
    if (!function_exists('curl_init') || PAYPAL_CLIENT_ID === '' || PAYPAL_CLIENT_SECRET === '') {
        throw new RuntimeException('PayPal checkout is not configured on this server.');
    }
    $base = PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    $ch = curl_init($base . '/v1/oauth2/token');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_USERPWD => PAYPAL_CLIENT_ID . ':' . PAYPAL_CLIENT_SECRET,
        CURLOPT_HTTPHEADER => ['Accept: application/json', 'Accept-Language: en_US'],
        CURLOPT_POSTFIELDS => 'grant_type=client_credentials',
        CURLOPT_TIMEOUT => 20,
    ]);
    $response = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    $decoded = is_string($response) ? json_decode($response, true) : null;
    if ($status < 200 || $status >= 300 || !is_array($decoded) || empty($decoded['access_token'])) {
        throw new RuntimeException('PayPal authentication failed: ' . ($error ?: 'check the server environment configuration.'));
    }
    return (string) $decoded['access_token'];
}
