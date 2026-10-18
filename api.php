<?php
declare(strict_types=1);
require_once __DIR__ . '/lib.php';
start_app_session();

try {
    $user = require_user();
    $action = (string) ($_GET['action'] ?? '');
    $touch = db()->prepare("UPDATE users SET last_seen_at = datetime('now') WHERE id = ?");
    $touch->execute([$user['id']]);

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'state') {
        $learnedCount = db()->prepare('SELECT COUNT(*) FROM learned WHERE user_id = ?');
        $learnedCount->execute([$user['id']]);
        $battleCount = db()->prepare('SELECT COUNT(*) FROM battles WHERE user_id = ?');
        $battleCount->execute([$user['id']]);
        $daily = db()->prepare("SELECT COALESCE(SUM(delta), 0) FROM credit_ledger WHERE user_id = ? AND delta > 0 AND kind IN ('battle', 'discovery') AND date(created_at) = date('now')");
        $daily->execute([$user['id']]);
        $truth = db()->prepare('SELECT relation_text, truth_value, updated_at FROM user_truth WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100');
        $truth->execute([$user['id']]);
        $challenges = db()->prepare(<<<'SQL'
SELECT c.*, a.username AS challenger_name, o.username AS opponent_name
FROM challenges c JOIN users a ON a.id = c.challenger_id
LEFT JOIN users o ON o.id = c.opponent_id
WHERE (c.challenger_id = ? OR c.opponent_id = ?)
  AND (c.status IN ('pending', 'accepted', 'running')
       OR (c.status = 'completed' AND c.completed_at >= datetime('now', '-5 minutes')))
ORDER BY c.id DESC LIMIT 10
SQL);
        $challenges->execute([$user['id'], $user['id']]);
        $loot = db()->prepare("SELECT id, item_json FROM arena_loot WHERE claimed_at IS NULL AND expires_at > datetime('now') ORDER BY id DESC LIMIT 20");
        $loot->execute();
        $lootItems = array_map(static function ($row): array {
            return ['id' => (int) $row['id'], ...decode_json_array($row['item_json'])];
        }, $loot->fetchAll());
        $liveBattleQuery = db()->prepare("SELECT * FROM live_battles WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1");
        $liveBattleQuery->execute([$user['id']]);
        $liveBattle = $liveBattleQuery->fetch();
        $community = db()->query('SELECT relation_text, popularity FROM popular_analogies ORDER BY popularity DESC, relation_text LIMIT 50')->fetchAll();
        $payoutEligible = $user['credits'] >= 500 && (int) ($user['paid_spend_cents'] ?? 0) >= 100;
        json_response([
            'user' => $user,
            'sphereListed' => sphere_is_listed($user['id']),
            'power' => sphere_power($user),
            'odds' => battle_odds($user),
            'learnedCount' => (int) $learnedCount->fetchColumn(),
            'battleCount' => (int) $battleCount->fetchColumn(),
            'dailyEarned' => (int) $daily->fetchColumn(),
            'dailyLimit' => 10,
            'discoveries' => recent_discoveries($user['id']),
            'battles' => recent_battles($user['id']),
            'listings' => market_listings($user['id']),
            'ownListings' => own_listings($user['id']),
            'opponents' => online_opponents($user['id']),
            'challenges' => array_map(static fn ($row) => challenge_payload($row, $user['id']), $challenges->fetchAll()),
            'loot' => $lootItems,
            'truth' => $truth->fetchAll(),
            'communityTruth' => $community,
            'payoutEligible' => $payoutEligible,
            'pulsarAvailable' => !empty($user['pulsar_until']) && strtotime((string) $user['pulsar_until']) > time(),
            'paypal' => PAYPAL_CLIENT_ID !== '' && PAYPAL_CLIENT_SECRET !== '',
            'paypalClientId' => PAYPAL_CLIENT_ID,
            'paypalMode' => PAYPAL_MODE,
            'liveBattle' => $liveBattle ? [
                'id' => (int) $liveBattle['id'],
                'odds' => (int) $liveBattle['odds'],
                'endsAt' => $liveBattle['ends_at'],
                'lastDirection' => $liveBattle['last_direction'],
                'streak' => (int) $liveBattle['streak'],
                'pulse' => (bool) $liveBattle['pulsar'],
            ] : null,
            'csrf' => csrf_token(),
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'challenge_state') {
        $challenge = challenge_for_user((int) ($_GET['id'] ?? 0), $user['id']);
        if (!$challenge) {
            json_response(['error' => 'Challenge not found.'], 404);
        }
        json_response(['challenge' => challenge_payload($challenge, $user['id'])]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(['error' => 'Unsupported request.'], 405);
    }
    $payload = request_payload();
    expect_csrf($payload);
    $user = current_user() ?? $user;
    if (sphere_is_listed($user['id']) && in_array($action, ['import', 'program', 'upgrade', 'battle_start', 'battle_tap', 'battle_resolve', 'challenge_create', 'challenge_accept', 'loot_claim', 'list'], true)) {
        json_response(['error' => 'Your sphere is locked in an auction. It cannot battle or be modified until sold.'], 409);
    }

    if ($action === 'import') {
        $items = parse_analogies((string) ($payload['text'] ?? ''));
        if (!$items) {
            json_response(['error' => 'No text relations were found. Import a file or paste any short text, one relation per line.'], 422);
        }
        $known = array_fill_keys(array_map(static fn ($item) => mb_strtolower((string) $item['text']), $user['sphere']), true);
        $added = 0;
        foreach ($items as $item) {
            $key = mb_strtolower($item['text']);
            if (!isset($known[$key]) && count($user['sphere']) < 1000) {
                $user['sphere'][] = $item;
                $known[$key] = true;
                $added++;
                record_relation_popularity((string) $item['text']);
            }
        }
        save_user_sphere($user);
        json_response(['message' => $added ? "Harvested {$added} relation" . ($added === 1 ? '' : 's') . ' near the sphere core. They gain magnitude through battle experience.' : 'Those relations are already in your sphere.', 'state' => 'refresh']);
    }

    if ($action === 'program') {
        $logic = trim(strip_tags((string) ($payload['logic'] ?? '')));
        if (mb_strlen($logic) > 500) {
            json_response(['error' => 'Logic expressions are limited to 500 characters.'], 422);
        }
        $user['logic_text'] = $logic;
        $user['gdt'] = array_values(array_intersect(['flatness', 'circularity', 'position', 'parallelism', 'profile'], (array) ($payload['gdt'] ?? [])));
        save_user_sphere($user);
        json_response(['message' => 'Logic and GD&T program saved. Sphere type, color and symbols are acquired traits, not editable settings.', 'state' => 'refresh']);
    }

    if ($action === 'upgrade') {
        $upgrade = (string) ($payload['upgrade'] ?? '');
        if (!in_array($upgrade, ['diameter', 'spin'], true)) {
            json_response(['error' => 'Choose a valid sphere upgrade.'], 422);
        }
        $levelKey = $upgrade . '_level';
        if ((int) $user[$levelKey] >= 8) {
            json_response(['error' => 'That sphere dimension has reached its maximum.'], 409);
        }
        $cost = upgrade_price($upgrade, (int) $user[$levelKey]);
        if ($user['credits'] < $cost) {
            json_response(['error' => "This upgrade costs {$cost} credits."], 409);
        }
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $user['credits'] -= $cost;
            $user['sphere_value_credits'] += $cost;
            $user[$levelKey]++;
            save_user_sphere($user);
            $ledger = $pdo->prepare("INSERT INTO credit_ledger (user_id, delta, kind, reference_id) VALUES (?, ?, 'upgrade', ?)");
            $ledger->execute([$user['id'], -$cost, $upgrade]);
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
        json_response(['message' => ucfirst($upgrade) . " increased. {$cost} credits are now held as sphere value.", 'cost' => $cost, 'state' => 'refresh']);
    }

    if ($action === 'battle_start') {
        $existing = db()->prepare("SELECT id FROM live_battles WHERE user_id = ? AND status = 'active'");
        $existing->execute([$user['id']]);
        if ($existing->fetchColumn()) {
            json_response(['error' => 'A battle is already in progress.'], 409);
        }
        $rivalPower = random_int(42, 68);
        $odds = max(18, min(82, 50 + (int) round((sphere_power($user) - $rivalPower) * 0.8)));
        $pulsar = !empty($user['pulsar_until']) && strtotime((string) $user['pulsar_until']) > time();
        $insert = db()->prepare("INSERT INTO live_battles (user_id, opponent_id, mode, odds, rival_power, starts_at, ends_at, last_direction, streak, pulsar, status) VALUES (?, NULL, 'bot', ?, ?, datetime('now'), datetime('now', '+5 seconds'), '', 0, ?, 'active')");
        $insert->execute([$user['id'], $odds, $rivalPower, (int) $pulsar]);
        if ($pulsar) {
            $update = db()->prepare('UPDATE users SET pulsar_until = NULL WHERE id = ?');
            $update->execute([$user['id']]);
        }
        json_response(['battleId' => (int) db()->lastInsertId(), 'odds' => $odds, 'endsIn' => 5, 'pulsar' => $pulsar]);
    }

    if ($action === 'battle_tap') {
        $direction = (string) ($payload['direction'] ?? '');
        if (!in_array($direction, ['left', 'right'], true)) {
            json_response(['error' => 'Tap left or right to spin.'], 422);
        }
        $statement = db()->prepare("SELECT * FROM live_battles WHERE id = ? AND user_id = ? AND status = 'active'");
        $statement->execute([(int) ($payload['battleId'] ?? 0), $user['id']]);
        $battle = $statement->fetch();
        if (!$battle || strtotime((string) $battle['ends_at']) <= time()) {
            json_response(['error' => 'The battle is already over.'], 409);
        }
        $streak = $battle['last_direction'] === '' || $battle['last_direction'] !== $direction
            ? (int) $battle['streak'] + 1
            : 0;
        $odds = max(8, min(92, (int) $battle['odds'] + ($streak > 0 ? min(3, $streak) : -1)));
        $update = db()->prepare('UPDATE live_battles SET last_direction = ?, streak = ?, taps = taps + 1, odds = ? WHERE id = ? AND status = \'active\'');
        $update->execute([$direction, $streak, $odds, $battle['id']]);
        json_response(['odds' => $odds, 'streak' => $streak, 'direction' => $direction]);
    }

    if ($action === 'battle_resolve') {
        $statement = db()->prepare("SELECT * FROM live_battles WHERE id = ? AND user_id = ? AND status = 'active'");
        $statement->execute([(int) ($payload['battleId'] ?? 0), $user['id']]);
        $battle = $statement->fetch();
        if (!$battle) json_response(['error' => 'Battle not found or already settled.'], 409);
        if (strtotime((string) $battle['ends_at']) > time()) json_response(['error' => 'Keep spinning until the battle timer ends.'], 409);
        $won = random_int(1, 100) <= (int) $battle['odds'];
        $mitosis = random_int(1, 100) <= 22;
        $drops = [];
        if (!$won && ($user['sphere'] || $user['symbols'] || count($user['colors']) > 1)) {
            $drop = random_loot_item($user);
            $user = take_sphere_item($user, $drop);
            if (random_int(0, 1) === 1) {
                $user['rival'][] = $drop;
                $drops[] = ['kind' => $drop['kind'], 'disposition' => 'bot'];
            } else {
                $drops[] = ['kind' => $drop['kind'], 'disposition' => 'arena'];
            }
        }
        $rivalItems = array_values(array_filter($user['rival'], static fn ($item) => is_array($item) && isset($item['text'])));
        $rivalItem = $rivalItems ? $rivalItems[array_rand($rivalItems)] : ['text' => 'orbit:gravity :: idea:insight'];
        $combo = make_discovery($user, (string) $rivalItem['text']);
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $unique = $pdo->prepare('INSERT OR IGNORE INTO learned (user_id, combo_text) VALUES (?, ?)');
            $unique->execute([$user['id'], $combo]);
            $discovered = $unique->rowCount() > 0;
            if ($discovered) {
                $user['sphere'][] = analogy_item($combo, 0.8, random_int(-314, 314) / 100, false);
                record_relation_popularity($combo);
            }
            $reward = earn_daily_credits($user['id'], 1 + (int) $discovered, $discovered ? 'discovery' : 'battle', 'bot:' . $battle['id']);
            $user['credits'] += $reward;
            if ($mitosis) $user['cell_count'] = min(99, $user['cell_count'] + 1);
            save_user_sphere($user);
            $battleInsert = $pdo->prepare('INSERT INTO battles (user_id, won, odds, reward, mitosis, combo_text, drops_json) VALUES (?, ?, ?, ?, ?, ?, ?)');
            $battleInsert->execute([$user['id'], (int) $won, $battle['odds'], $reward, (int) $mitosis, $combo, json_for($drops)]);
            $battleId = (int) $pdo->lastInsertId();
            foreach ($drops as $index => $drop) {
                if ($drop['disposition'] === 'arena') {
                    $lootInsert = $pdo->prepare("INSERT INTO arena_loot (battle_id, item_json) VALUES (?, ?)");
                    $lootInsert->execute([$battleId, json_for($drop)]);
                }
            }
            $pdo->prepare("UPDATE live_battles SET status = 'completed', won = ? WHERE id = ?")->execute([(int) $won, $battle['id']]);
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
        json_response([
            'won' => $won,
            'odds' => (int) $battle['odds'],
            'reward' => $reward,
            'mitosis' => $mitosis,
            'discovery' => $discovered,
            'combo' => $combo,
            'drops' => $drops,
            'message' => $won ? 'The bot sphere was slingshotted beyond the planetary disk.' : 'Your sphere was spun out. Each lost cell had an equal chance to transfer to the bot or become recoverable arena loot.',
            'state' => 'refresh',
        ]);
    }

    if ($action === 'loot_claim') {
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $loot = $pdo->prepare("SELECT * FROM arena_loot WHERE id = ? AND claimed_at IS NULL AND expires_at > datetime('now')");
            $loot->execute([(int) ($payload['lootId'] ?? 0)]);
            $item = $loot->fetch();
            if (!$item) {
                $pdo->rollBack();
                json_response(['error' => 'That arena relic has expired or was already collected.'], 409);
            }
            $lootData = decode_json_array($item['item_json']);
            $user = apply_sphere_item($user, $lootData);
            save_user_sphere($user);
            $claim = $pdo->prepare("UPDATE arena_loot SET claimed_by = ?, claimed_at = datetime('now') WHERE id = ? AND claimed_at IS NULL");
            $claim->execute([$user['id'], $item['id']]);
            if ($claim->rowCount() !== 1) throw new RuntimeException('That arena relic was collected by someone else.');
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
        json_response(['message' => 'The arena relic folded into your sphere.', 'state' => 'refresh']);
    }

    if ($action === 'players_pass') {
        $opponentId = (int) ($payload['playerId'] ?? 0);
        if ($opponentId === $user['id']) json_response(['error' => 'Choose another player.'], 422);
        $insert = db()->prepare('INSERT OR IGNORE INTO passed_players (user_id, passed_user_id) VALUES (?, ?)');
        $insert->execute([$user['id'], $opponentId]);
        json_response(['message' => 'Player skipped.']);
    }

    if ($action === 'challenge_create') {
        $opponentId = (int) ($payload['playerId'] ?? 0);
        $opponent = find_user_by_id($opponentId);
        if (!$opponent || $opponentId === $user['id'] || empty($opponent['last_seen_at']) || strtotime((string) $opponent['last_seen_at']) < time() - 300) {
            json_response(['error' => 'That player is not currently online.'], 409);
        }
        $last = db()->prepare('SELECT opponent_id FROM battles WHERE user_id = ? AND opponent_id IS NOT NULL ORDER BY id DESC LIMIT 1');
        $last->execute([$user['id']]);
        if ((int) $last->fetchColumn() === $opponentId) {
            json_response(['error' => 'No consecutive rematches. Face a different opponent before challenging them again.'], 409);
        }
        $pending = db()->prepare("SELECT 1 FROM challenges WHERE status IN ('pending', 'accepted', 'running') AND ((challenger_id = ? AND opponent_id = ?) OR (challenger_id = ? AND opponent_id = ?))");
        $pending->execute([$user['id'], $opponentId, $opponentId, $user['id']]);
        if ($pending->fetchColumn()) json_response(['error' => 'You already have an open challenge with this player.'], 409);
        $token = bin2hex(random_bytes(24));
        $insert = db()->prepare("INSERT INTO challenges (token_hash, challenger_id, opponent_id, challenger_ready, status) VALUES (?, ?, ?, 1, 'pending')");
        $insert->execute([hash('sha256', $token), $user['id'], $opponentId]);
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
        json_response(['challengeId' => (int) db()->lastInsertId(), 'invite' => $scheme . $_SERVER['HTTP_HOST'] . '/?challenge=' . $token, 'opponent' => $opponent['username'], 'message' => 'Challenge sent. Both players must be online to battle.']);
    }

    if ($action === 'challenge_accept') {
        $token = trim((string) ($payload['token'] ?? ''));
        $challengeId = (int) ($payload['challengeId'] ?? 0);
        if ($challengeId > 0) {
            $statement = db()->prepare("SELECT * FROM challenges WHERE id = ? AND opponent_id = ? AND status = 'pending'");
            $statement->execute([$challengeId, $user['id']]);
        } else {
            $statement = db()->prepare("SELECT * FROM challenges WHERE token_hash = ? AND status = 'pending'");
            $statement->execute([hash('sha256', $token)]);
        }
        $challenge = $statement->fetch();
        if (!$challenge || (int) $challenge['challenger_id'] === $user['id']) json_response(['error' => 'This challenge is invalid or has expired.'], 404);
        if ($challenge['opponent_id'] !== null && (int) $challenge['opponent_id'] !== $user['id']) json_response(['error' => 'This friend challenge is addressed to another player.'], 403);
        $challenger = find_user_by_id((int) $challenge['challenger_id']);
        if (!$challenger || empty($challenger['last_seen_at']) || strtotime((string) $challenger['last_seen_at']) < time() - 300) {
            json_response(['error' => 'The challenger is offline. Ask them to return to the arena before accepting.'], 409);
        }
        $last = db()->prepare('SELECT opponent_id FROM battles WHERE user_id = ? AND opponent_id IS NOT NULL ORDER BY id DESC LIMIT 1');
        $last->execute([$user['id']]);
        if ((int) $last->fetchColumn() === (int) $challenge['challenger_id']) json_response(['error' => 'No consecutive rematches. Face a different opponent before challenging them again.'], 409);
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $pdo->prepare("UPDATE challenges SET opponent_id = ?, opponent_ready = 1, status = 'completed', completed_at = datetime('now') WHERE id = ? AND status = 'pending'")->execute([$user['id'], $challenge['id']]);
            $odds = battle_odds($challenger, $user);
            $won = random_int(1, 100) <= $odds;
            $mitosis = random_int(1, 100) <= 22;
            $rivalRelation = $user['sphere']
                ? (string) $user['sphere'][array_rand($user['sphere'])]['text']
                : 'idea:invention :: orbit:resonance';
            $combo = make_discovery($challenger, $rivalRelation);
            $unique = $pdo->prepare('INSERT OR IGNORE INTO learned (user_id, combo_text) VALUES (?, ?)');
            $unique->execute([$challenge['challenger_id'], $combo]);
            $challengerDiscovered = $unique->rowCount() > 0;
            $unique->execute([$user['id'], $combo]);
            $opponentDiscovered = $unique->rowCount() > 0;
            $challengerReward = earn_daily_credits($challenger['id'], 1 + (int) $challengerDiscovered, $challengerDiscovered ? 'discovery' : 'battle', 'challenge:' . $challenge['id']);
            $opponentReward = earn_daily_credits($user['id'], 1 + (int) $opponentDiscovered, $opponentDiscovered ? 'discovery' : 'battle', 'challenge:' . $challenge['id']);
            $challenger['credits'] += $challengerReward;
            $user['credits'] += $opponentReward;
            if ($challengerDiscovered) $challenger['sphere'][] = analogy_item($combo, 0.8, 0, false);
            if ($opponentDiscovered) $user['sphere'][] = analogy_item($combo, 0.8, 0, false);
            if ($won) {
                if ($user['sphere'] || $user['symbols'] || count($user['colors']) > 1) {
                    $drop = random_loot_item($user);
                    $user = take_sphere_item($user, $drop);
                    if (random_int(0, 1)) $challenger = apply_sphere_item($challenger, $drop);
                    else $pdo->prepare('INSERT INTO arena_loot (challenge_id, item_json) VALUES (?, ?)')->execute([$challenge['id'], json_for($drop)]);
                }
            } else {
                if ($challenger['sphere'] || $challenger['symbols'] || count($challenger['colors']) > 1) {
                    $drop = random_loot_item($challenger);
                    $challenger = take_sphere_item($challenger, $drop);
                    if (random_int(0, 1)) $user = apply_sphere_item($user, $drop);
                    else $pdo->prepare('INSERT INTO arena_loot (challenge_id, item_json) VALUES (?, ?)')->execute([$challenge['id'], json_for($drop)]);
                }
            }
            if ($mitosis) {
                $won ? $challenger['cell_count']++ : $user['cell_count']++;
            }
            save_user_sphere($challenger);
            save_user_sphere($user);
            $battleInsert = $pdo->prepare('INSERT INTO battles (user_id, won, odds, reward, mitosis, combo_text, opponent_id, challenge_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            $battleInsert->execute([$challenger['id'], (int) $won, $odds, $challengerReward, (int) ($mitosis && $won), $combo, $user['id'], $challenge['id']]);
            $battleInsert->execute([$user['id'], (int) !$won, 100 - $odds, $opponentReward, (int) ($mitosis && !$won), $combo, $challenger['id'], $challenge['id']]);
            $result = ['winnerId' => $won ? $challenger['id'] : $user['id'], 'winner' => $won ? $challenger['username'] : $user['username'], 'combo' => $combo, 'mitosis' => $mitosis];
            $pdo->prepare('UPDATE challenges SET winner_id = ?, result_json = ? WHERE id = ?')->execute([$result['winnerId'], json_for($result), $challenge['id']]);
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
        json_response(['challengeId' => (int) $challenge['id'], 'result' => $result, 'won' => !$won, 'odds' => 100 - $odds, 'reward' => $opponentReward, 'message' => 'Challenge complete. Both spheres were settled and all discoveries were recorded.']);
    }

    if ($action === 'challenge_decline') {
        $challengeId = (int) ($payload['challengeId'] ?? 0);
        $statement = db()->prepare("UPDATE challenges SET status = 'declined' WHERE id = ? AND opponent_id = ? AND status = 'pending'");
        $statement->execute([$challengeId, $user['id']]);
        if ($statement->rowCount() !== 1) json_response(['error' => 'This challenge is no longer open.'], 409);
        json_response(['message' => 'Challenge declined.']);
    }

    if ($action === 'truth_update') {
        $relation = mb_substr(trim(strip_tags((string) ($payload['relation'] ?? ''))), 0, 240);
        $value = (string) ($payload['truth'] ?? '');
        if ($relation === '' || !in_array($value, ['true', 'false', 'unknown'], true)) json_response(['error' => 'Add a relation and choose true, false, or unknown.'], 422);
        $statement = db()->prepare(<<<'SQL'
INSERT INTO user_truth (user_id, relation_text, truth_value) VALUES (?, ?, ?)
ON CONFLICT(user_id, relation_text) DO UPDATE SET truth_value = excluded.truth_value, updated_at = CURRENT_TIMESTAMP
SQL);
        $statement->execute([$user['id'], $relation, $value]);
        json_response(['message' => 'Your personal truth table was updated. Community popularity remains separate.', 'truth' => credit_truth($user['id'], $relation), 'state' => 'refresh']);
    }

    if ($action === 'truth_check') {
        $relation = mb_substr(trim(strip_tags((string) ($payload['relation'] ?? ''))), 0, 240);
        if ($relation === '') json_response(['error' => 'Enter a relation to compare.'], 422);
        json_response(['truth' => credit_truth($user['id'], $relation)]);
    }

    if ($action === 'list') {
        $title = mb_substr(trim(strip_tags((string) ($payload['title'] ?? ''))), 0, 40);
        if (mb_strlen($title) < 3) json_response(['error' => 'Give your sphere a 3–40 character listing title.'], 422);
        if (sphere_is_listed($user['id'])) json_response(['error' => 'Your sphere is already locked in an auction.'], 409);
        $openChallenge = db()->prepare("SELECT 1 FROM challenges WHERE status IN ('pending', 'accepted', 'running') AND (challenger_id = ? OR opponent_id = ?) LIMIT 1");
        $openChallenge->execute([$user['id'], $user['id']]);
        if ($openChallenge->fetchColumn()) json_response(['error' => 'Complete or decline your open challenge before listing your sphere.'], 409);
        $snapshot = [
            'analogies' => $user['sphere'], 'color' => $user['color'], 'colors' => $user['colors'],
            'rarity' => $user['rarity'], 'logic' => $user['logic_text'], 'gdt' => $user['gdt'],
            'symbols' => $user['symbols'], 'sphere_type' => $user['sphere_type'],
            'sphere_value_credits' => $user['sphere_value_credits'],
            'diameter_level' => $user['diameter_level'], 'spin_level' => $user['spin_level'],
        ];
        $insert = db()->prepare('INSERT INTO listings (seller_id, sphere_json, title, price_cents) VALUES (?, ?, ?, ?)');
        $insert->execute([$user['id'], json_for($snapshot), $title, max(100, (int) $user['sphere_value_credits'])]);
        json_response(['message' => 'Your sphere is locked in a no-withdrawal public auction until a player buys it at its held-value reserve.', 'state' => 'refresh']);
    }

    if ($action === 'bid') {
        $listingId = (int) ($payload['listingId'] ?? 0);
        $credits = (int) ($payload['credits'] ?? 0);
        $listingQuery = db()->prepare("SELECT * FROM listings WHERE id = ? AND seller_id IS NOT NULL AND status = 'open' AND seller_id <> ?");
        $listingQuery->execute([$listingId, $user['id']]);
        $listing = $listingQuery->fetch();
        if (!$listing) json_response(['error' => 'That player listing is no longer available.'], 409);
        $sphere = decode_json_array($listing['sphere_json']);
        $reserve = max(1, (int) ($sphere['sphere_value_credits'] ?? 0));
        $highQuery = db()->prepare("SELECT MAX(credits) FROM bids WHERE listing_id = ? AND status = 'open'");
        $highQuery->execute([$listingId]);
        $highest = (int) ($highQuery->fetchColumn() ?: 0);
        if ($credits < max($reserve, $highest + 1) || $credits > $user['credits']) json_response(['error' => "Bid must exceed the {$reserve}-credit reserve and current high bid, and fit your balance."], 409);
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $outbid = $pdo->prepare("SELECT bidder_id, credits FROM bids WHERE listing_id = ? AND status = 'open'");
            $outbid->execute([$listingId]);
            $refund = $pdo->prepare('UPDATE users SET credits = credits + ? WHERE id = ?');
            $refundLedger = $pdo->prepare("INSERT INTO credit_ledger (user_id, delta, kind, reference_id) VALUES (?, ?, 'bid refund', ?)");
            foreach ($outbid->fetchAll() as $oldBid) {
                $refund->execute([(int) $oldBid['credits'], (int) $oldBid['bidder_id']]);
                $refundLedger->execute([(int) $oldBid['bidder_id'], (int) $oldBid['credits'], (string) $listingId]);
            }
            $pdo->prepare("UPDATE bids SET status = 'cancelled' WHERE listing_id = ? AND status = 'open'")->execute([$listingId]);
            $debit = $pdo->prepare('UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?');
            $debit->execute([$credits, $user['id'], $credits]);
            if ($debit->rowCount() !== 1) throw new RuntimeException('Your credit balance changed; reload and bid again.');
            $pdo->prepare("INSERT INTO bids (listing_id, bidder_id, credits) VALUES (?, ?, ?)")->execute([$listingId, $user['id'], $credits]);
            $pdo->prepare("INSERT INTO credit_ledger (user_id, delta, kind, reference_id) VALUES (?, ?, 'bid escrow', ?)")->execute([$user['id'], -$credits, (string) $listingId]);
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
        json_response(['message' => 'Your bid is escrowed in the public auction.', 'state' => 'refresh']);
    }

    if ($action === 'accept_bid') {
        $bidId = (int) ($payload['bidId'] ?? 0);
        $bidQuery = db()->prepare("SELECT b.*, l.seller_id, l.sphere_json, l.id AS listing_id FROM bids b JOIN listings l ON l.id = b.listing_id WHERE b.id = ? AND l.seller_id = ? AND b.status = 'open' AND l.status = 'open'");
        $bidQuery->execute([$bidId, $user['id']]);
        $bid = $bidQuery->fetch();
        if (!$bid) json_response(['error' => 'That public bid is no longer open.'], 409);
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $buyer = find_user_by_id((int) $bid['bidder_id']);
            if (!$buyer) throw new RuntimeException('The bidder account no longer exists.');
            $snapshot = decode_json_array($bid['sphere_json']);
            $buyer = absorb_sphere($buyer, $snapshot);
            $buyer['sphere_value_credits'] += (int) ($snapshot['sphere_value_credits'] ?? 0);
            $user['credits'] += (int) $bid['credits'];
            $user['sphere_value_credits'] = 0;
            $user = reset_sphere_after_sale($user);
            save_user_sphere($buyer);
            save_user_sphere($user);
            $sold = $pdo->prepare("UPDATE listings SET status = 'sold' WHERE id = ? AND status = 'open'");
            $sold->execute([$bid['listing_id']]);
            if ($sold->rowCount() !== 1) throw new RuntimeException('This auction has already been settled.');
            $pdo->prepare("UPDATE bids SET status = CASE WHEN id = ? THEN 'accepted' ELSE 'declined' END WHERE listing_id = ? AND status = 'open'")->execute([$bidId, $bid['listing_id']]);
            $pdo->prepare("INSERT INTO credit_ledger (user_id, delta, kind, reference_id) VALUES (?, ?, 'auction sale', ?)")->execute([$user['id'], (int) $bid['credits'], (string) $bid['listing_id']]);
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
        json_response(['message' => 'Auction settled. The buyer absorbed the sphere; your next sphere was randomly generated.', 'state' => 'refresh']);
    }

    if ($action === 'create_order' || $action === 'capture_order' || $action === 'create_pulsar_order' || $action === 'capture_pulsar_order') {
        json_response(['error' => 'PayPal checkout for cash-value credits and boosts is not enabled until the server is configured with the required payment and payout compliance settings.'], 503);
    }

    if ($action === 'withdraw_listing') {
        json_response(['error' => 'Listings are non-withdrawable auctions. Your sphere is locked until sale.'], 409);
    }

    json_response(['error' => 'Unknown action.'], 404);
} catch (Throwable $error) {
    error_log('[orbital-relics] ' . $error->getMessage());
    json_response(['error' => 'The request could not be completed. Please try again.'], 500);
}
