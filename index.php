<?php
declare(strict_types=1);
require_once __DIR__ . '/lib.php';
start_app_session();
$user = current_user();
$notice = (string) ($_GET['notice'] ?? '');
$challengeToken = (string) ($_GET['challenge'] ?? '');
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#10151b">
  <meta name="description" content="Build a living sphere of analogies and test it in fast orbital duels.">
  <meta name="csrf-token" content="<?= e(csrf_token()) ?>">
  <title><?= e(APP_NAME) ?> — Ideas in orbit</title>
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="icon" href="/assets/orbit-mark.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/style.css">
</head>
<body>
  <div class="ambient ambient-a"></div><div class="ambient ambient-b"></div>
  <?php if (!$user): ?>
    <main class="auth-shell">
      <div class="auth-brand"><span class="brand-mark">◉</span><span>ORBITAL RELICS</span><span class="age-pill">18+ · PG-13</span></div>
      <section class="auth-card">
        <div class="eyebrow">THINK IN ORBITS</div>
        <h1>Ideas have<br><em>momentum.</em></h1>
        <p class="auth-intro">Harvest raw text, evolve its logic through quick duels, and shape a cellular sphere that is uniquely yours.</p>
        <?php if ($notice !== ''): ?><div class="notice" role="alert"><?= e($notice) ?></div><?php endif; ?>
        <div class="auth-grid">
          <form action="/auth.php" method="post" class="auth-form">
            <input type="hidden" name="_csrf" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="login"><input type="hidden" name="challenge" value="<?= e($challengeToken) ?>">
            <h2>Return to the arena</h2>
            <label>Username<input name="username" autocomplete="username" required maxlength="20" minlength="3"></label>
            <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
            <button class="button button-primary" type="submit">Sign in <span>↗</span></button>
          </form>
          <form action="/auth.php" method="post" class="auth-form auth-form-new">
            <input type="hidden" name="_csrf" value="<?= e(csrf_token()) ?>"><input type="hidden" name="action" value="register"><input type="hidden" name="challenge" value="<?= e($challengeToken) ?>">
            <h2>Claim your first sphere</h2>
            <label>Username<input name="username" autocomplete="username" required maxlength="20" minlength="3" pattern="[A-Za-z0-9_]{3,20}" placeholder="3–20 characters"></label>
            <label>Password<input name="password" type="password" autocomplete="new-password" required minlength="10" maxlength="200" placeholder="At least 10 characters"></label>
            <button class="button button-quiet" type="submit">Create a free account <span>＋</span></button>
          </form>
        </div>
        <p class="fine-print">For adults · PG-13 play · no paid outcome bets. Credits can be earned at most 10 per day.</p>
      </section>
      <footer class="auth-footer">A living library of relationships, shaped by play.</footer>
    </main>
  <?php else: ?>
    <header class="topbar">
      <a class="brand" href="/" aria-label="Orbital Relics home"><span class="brand-mark">◉</span><span>ORBITAL <b>RELICS</b></span></a>
      <nav class="main-nav" aria-label="Main navigation">
        <button class="nav-link is-active" data-view="arena">Arena</button><button class="nav-link" data-view="opponents">Rivals</button><button class="nav-link" data-view="forge">Forge</button><button class="nav-link" data-view="truth">Truth table</button><button class="nav-link" data-view="evolution">Evolution</button><button class="nav-link" data-view="market">Auctions</button>
      </nav>
      <div class="account-strip"><span class="credits"><span class="credit-glyph">✦</span><b id="credits"><?= (int) $user['credits'] ?></b></span><span class="account-name"><?= e($user['username']) ?></span><form action="/logout.php" method="post"><input type="hidden" name="_csrf" value="<?= e(csrf_token()) ?>"><button class="logout-button" type="submit" aria-label="Sign out">↗</button></form></div>
    </header>
    <main class="app-shell">
      <section class="screen screen-arena is-visible" id="view-arena">
        <div class="page-heading"><div><div class="eyebrow">SEASON 01 <span class="eyebrow-dot"></span> CHALLENGER SERIES</div><h1>Make your case<br><em>in the ring.</em></h1></div><div class="heading-side"><span class="online-mark"></span><span>SPHERE RECORD</span><span class="heading-divider"></span><b id="battle-count">0</b><small>ROUNDS FOUGHT</small></div></div>
        <div class="arena-layout">
          <div class="arena-stage"><div class="stage-topline"><span><i class="live-dot"></i> LIVE SIMULATION</span><span class="stage-round">NO. <b id="round-number">001</b> · PLANETARY DISK</span></div><canvas id="arena-canvas" aria-label="Arena showing the two cellular spheres"></canvas><div class="arena-overlay-label you-label"><span class="label-avatar you-avatar">◉</span><span><b>YOUR SPHERE</b><small id="player-sphere-label"><?= e(strtoupper($user['username'])) ?></small></span></div><div class="arena-overlay-label rival-label"><span class="label-avatar rival-avatar">✳</span><span><b>CHALLENGER</b><small id="rival-label">BOT SPAR</small></span></div><div class="stage-bottomline"><span>DISK-OUT · ZOOM / SPIN / SLINGSHOT</span><span class="mitosis-tag" id="mitosis-tag">✣ MITOSIS POSSIBLE</span></div></div>
          <aside class="battle-rail"><div class="rail-section"><div class="section-kicker">LIVE WIN ODDS</div><div class="odds-row"><div><strong id="odds-value">50</strong><small>%</small></div><span class="odds-label">TAP TO SHIFT</span></div><div class="odds-track"><span id="odds-bar" style="width:50%"></span></div><div class="forecast-caption"><span id="power-caption">Sphere power —</span><span>10 CREDIT DAILY CAP</span></div></div><div class="rail-section battle-plan"><div class="section-kicker">CELLULAR PROGRAM <button class="text-button edit-shortcut" data-open-forge>EDIT ↗</button></div><div class="program-chip"><span class="program-icon">⟳</span><div><b id="strategy-label">Innate</b><small id="arena-sphere-type">RANDOM TYPE</small></div></div><div class="program-logic"><span class="logic-glyph">∴</span><span id="logic-preview">Set a relation in the forge</span></div><div class="micro-stats"><span><b id="analogy-count">0</b> RELATIONS</span><span><b id="cell-count">0</b> CELLS</span><span><b id="daily-earned">0</b>/10 DAILY</span></div></div><div class="battle-actions"><div class="battle-mode"><button type="button" class="mode-button is-active" data-mode="bot">BOT SPAR</button><button type="button" class="mode-button" data-mode="players">PLAYER DUEL</button></div><button class="button button-launch" id="battle-button"><span class="launch-glyph">◉</span> START 5-SECOND BATTLE <span class="button-arrow">↗</span></button><div id="battle-controls" class="battle-controls" hidden><button class="spin-tap" type="button" data-spin="left" aria-label="Spin left">↶<small>LEFT</small></button><span><b id="live-odds">50</b>%<small>ALTERNATE TAPS</small><i id="tap-streak">0 spin chain</i></span><button class="spin-tap" type="button" data-spin="right" aria-label="Spin right">↷<small>RIGHT</small></button></div><p><span>✦</span> Alternate left/right taps to build spin and adjust your odds. No paid betting.</p></div></aside>
        </div>
        <div class="below-arena"><section class="panel discoveries-panel"><div class="panel-heading"><div><div class="eyebrow">RECENT INTELLIGENCE</div><h2>Fresh discoveries</h2></div><span class="panel-count" id="learned-count">0 LEARNED</span></div><div id="discovery-list" class="discovery-list"></div></section><section class="panel battle-log-panel"><div class="panel-heading"><div><div class="eyebrow">THE RECORD</div><h2>Battle log</h2></div><button class="text-button" data-view="market">Browse auctions ↗</button></div><div id="battle-log" class="battle-log"></div></section></div>
      </section>

      <section class="screen" id="view-opponents">
        <div class="page-heading page-heading-compact"><div><div class="eyebrow">LIVE PLAYER SIGNAL</div><h1>Choose your<br><em>next rival.</em></h1></div><p class="heading-description">Swipe left to pass, right to challenge. Share a private challenge link with a friend. Both players must be online; consecutive rematches are blocked.</p></div>
        <div class="opponent-layout"><section class="panel opponent-deck"><div class="opponent-card" id="opponent-card"><div class="opponent-art"><span class="opponent-orbit"></span><span class="opponent-sphere" id="opponent-sphere">◉</span><span class="opponent-type" id="opponent-type">SCANNING</span></div><div class="opponent-details"><div class="eyebrow">ONLINE CHALLENGER · SWIPE → TO CHALLENGE</div><h2 id="opponent-name">Looking for players…</h2><p id="opponent-meta">Players active within five minutes appear here.</p></div></div><div class="swipe-actions"><button type="button" class="swipe-button pass" id="pass-player">← PASS</button><button type="button" class="swipe-button challenge" id="challenge-player">CHALLENGE →</button></div><div class="friend-challenge"><label for="friend-name">Challenge by username</label><div><input id="friend-name" placeholder="Exact player name"><button type="button" id="friend-challenge">Create link ↗</button></div><output id="challenge-link"></output></div></section><aside class="panel challenge-inbox"><div class="eyebrow">YOUR MATCHES</div><h2>Challenge inbox</h2><div id="challenge-list" class="challenge-list"></div><div class="eyebrow">ARENA RELICS · 15 MINUTES</div><div id="arena-loot" class="arena-loot"></div></aside></div>
      </section>

      <section class="screen" id="view-forge">
        <div class="page-heading page-heading-compact"><div><div class="eyebrow">YOUR SPHERE · ONE CELLULAR BODY</div><h1>Feed the<br><em>organism.</em></h1></div><p class="heading-description">Every sphere receives a random, immutable type and innate traits. Imported text starts at the core with near-zero magnitude; surviving duels push relations outward.</p></div>
        <div class="forge-grid"><section class="panel sphere-preview-panel"><div class="forge-preview-head"><span>LIVE CELL STRUCTURE</span><span class="rarity-badge" id="rarity-badge">STANDARD</span></div><canvas id="forge-canvas" aria-label="Sphere with analogy nodes, logic symbols and interference waves"></canvas><div class="sphere-caption"><div><b id="forge-sphere-name"><?= e(strtoupper($user['username'])) ?></b><small><span id="forge-type">RANDOM TYPE</span> · <span id="forge-cell-count">4</span> CELLS</small></div><div class="sphere-power"><span>POWER</span><b id="forge-power">—</b></div></div></section>
          <section class="panel forge-controls"><div class="panel-heading"><div><div class="eyebrow">LOGIC PROGRAMMING</div><h2>Expressions & GD&T</h2></div></div><label class="field-label" for="logic-input">Logic expression <span>MAX 500 CHARACTERS</span></label><textarea id="logic-input" rows="3" maxlength="500" placeholder="P → Q ∧ ¬R"></textarea><label class="field-label">GD&T edge conditions <span>SELECT UP TO 5</span></label><div class="gdt-options"><label><input type="checkbox" value="flatness">⏥ Flatness</label><label><input type="checkbox" value="circularity">○ Circularity</label><label><input type="checkbox" value="position">⌖ Position</label><label><input type="checkbox" value="parallelism">∥ Parallelism</label><label><input type="checkbox" value="profile">⌒ Profile</label></div><div class="trait-inventory"><div><span>INNATE SYMBOLS</span><b id="symbol-inventory">—</b></div><div><span>ACQUIRED COLORS</span><b id="color-inventory">—</b></div></div><button class="button button-primary" id="save-program">Save logic program ↗</button></section></div>
        <section class="panel harvest-panel"><div class="panel-heading"><div><div class="eyebrow">HARVEST ANY TEXT</div><h2>Give the sphere a new thought</h2><p class="panel-subtitle">Every short line becomes a weak analogy node. RSR magnitude metadata is kept for reference; it does not grant battle strength.</p></div><span class="import-icon">↓</span></div><div class="harvest-grid"><div class="drop-zone" id="drop-zone" tabindex="0"><input id="file-input" type="file" accept=".rsr,.txt,.csv,.json,text/plain" hidden><span class="drop-glyph">＋</span><b>Drop a file to harvest</b><small>.RSR · .TXT · .CSV · .JSON · UP TO 1 MB</small><button type="button" class="text-button" id="choose-file">Choose file</button></div><form class="paste-zone" id="import-form"><label for="analogy-input">Or paste any text</label><textarea id="analogy-input" rows="4" placeholder="electron:nucleus != planet:sun&#10;A seed contains the outline of a forest."></textarea><button class="button button-quiet" type="submit">Absorb near the core ↗</button></form></div><div class="harvest-footer"><span>RSR COMPATIBLE</span><code>|ANALOGY_1|=electron:nucleus!=planet:sun</code><span>·</span><code>MAGNITUDE_R=7.44 ANGLE_THETA=-1.219</code></div></section>
      </section>

      <section class="screen" id="view-truth">
        <div class="page-heading page-heading-compact"><div><div class="eyebrow">RELATION REFERENCE</div><h1>Test what<br><em>holds true.</em></h1></div><p class="heading-description">Compare any relation with popular community analogies, then set its true/false/unknown value in your personal truth table.</p></div>
        <section class="panel truth-checker"><label for="truth-relation">Relation or arbitrary text</label><div class="truth-entry"><input id="truth-relation" placeholder="electron:nucleus != planet:sun"><button type="button" id="check-truth">Compare ↗</button></div><div id="truth-result" class="truth-result"></div><div class="truth-actions"><button data-truth="true" type="button">Mark true</button><button data-truth="false" type="button">Mark false</button><button data-truth="unknown" type="button">Mark unknown</button></div></section><div class="truth-columns"><section class="panel"><div class="eyebrow">YOUR TRUTH TABLE</div><div id="personal-truth"></div></section><section class="panel"><div class="eyebrow">COMMUNITY STANDARD · POPULAR</div><div id="community-truth"></div></section></div>
      </section>

      <section class="screen" id="view-evolution">
        <div class="page-heading page-heading-compact"><div><div class="eyebrow">SPHERE ECONOMY · 10 CREDITS/DAY LIMIT</div><h1>Engineer your<br><em>momentum.</em></h1></div><p class="heading-description">Earn up to 10 credits daily, then spend them on lasting cell geometry. Upgrade costs add to the sphere's held-value auction reserve.</p></div>
        <div class="evolution-grid"><article class="panel upgrade-card"><span class="upgrade-icon">◉</span><div class="eyebrow">CELL MEMBRANE</div><h2>Expand diameter</h2><p>Enlarge the cellular shell and planetary disk for a wider collision envelope.</p><div class="upgrade-stat">LEVEL <b id="diameter-level">0</b> · NEXT <b id="diameter-cost">12</b> ✦</div><button type="button" class="button button-primary" data-upgrade="diameter">Add diameter ↗</button></article><article class="panel upgrade-card"><span class="upgrade-icon">⟳</span><div class="eyebrow">ANGULAR MOMENTUM</div><h2>Spin faster</h2><p>Boost the base rotational force behind every alternating directional tap.</p><div class="upgrade-stat">LEVEL <b id="spin-level">0</b> · NEXT <b id="spin-cost">10</b> ✦</div><button type="button" class="button button-primary" data-upgrade="spin">Increase spin ↗</button></article><article class="panel upgrade-card pulsar-card"><span class="upgrade-icon">✷</span><div class="eyebrow">ONE MATCH · $1</div><h2>Pulsar charge</h2><p>Pulse-spin when momentum drops. Payment checkout is not enabled in this preview.</p><div class="upgrade-stat" id="pulsar-status">NO ACTIVE CHARGE</div><button type="button" class="button button-quiet" id="buy-pulsar" disabled>Unavailable · $1</button></article></div><div class="panel economy-note"><b>Credit safeguards</b><span>Battle and discovery earnings together are capped at 10 credits per account per UTC day. Outcome wagers and cash redemption are not active in this preview.</span></div>
      </section>

      <section class="screen" id="view-market">
        <div class="page-heading page-heading-compact"><div><div class="eyebrow">REAL PLAYER SPHERES · PUBLIC CREDIT AUCTIONS</div><h1>Trade ideas,<br><em>not outcomes.</em></h1></div><p class="heading-description">Only player-owned spheres appear. Listing locks the sphere from battles and cannot be withdrawn; the buyer absorbs it when a seller accepts a bid.</p></div>
        <div class="market-intro"><div><span class="market-orb">✦</span><span><b>INSIGHT CREDITS</b><small>Earn through duels, capped at 10 daily. Battle outcome betting is disabled.</small></span></div><button class="button button-primary" id="open-list-form">Auction your sphere ＋</button></div>
        <form class="panel list-form" id="list-form" hidden><div class="list-form-title"><div><div class="eyebrow">LOCK YOUR CURRENT SPHERE</div><h2>It cannot battle or be withdrawn during the auction.</h2></div><button class="text-button" type="button" id="close-list-form">Close ×</button></div><div class="list-form-fields"><label>Listing title<input id="listing-title" maxlength="40" minlength="3" value="My cellular sphere" required></label><button class="button button-primary" type="submit">Start auction ↗</button></div><p class="fine-print">Reserve floor is the sphere's held upgrade value, with a one-credit minimum.</p></form>
        <div class="market-toolbar"><div><span class="eyebrow">OPEN PLAYER AUCTIONS</span><span class="market-result-count" id="market-count">0 SPHERES</span></div><span class="market-sort">RECENTLY LISTED</span></div><div class="owned-listings" id="owned-listings"></div><div class="market-grid" id="market-grid"></div><section class="panel market-note"><span class="note-mark">i</span><p>Bids are escrowed in credits. A new high bid refunds earlier bidders. Accepting a bid transfers the sphere and its held value. Cash-value sales and outcome wagers are not enabled in this preview.</p></section>
      </section>
    </main>
    <div class="toast-region" id="toast-region" aria-live="polite"></div>
    <dialog class="result-dialog" id="result-dialog"><button class="dialog-close" id="close-result" aria-label="Close">×</button><div class="result-orbit" id="result-orbit">◉</div><div class="eyebrow" id="result-kicker">BATTLE COMPLETE</div><h2 id="result-title">A new pattern emerges.</h2><p id="result-message"></p><div class="result-reward" id="result-reward"></div><button class="button button-primary" id="result-done">Return to arena <span>↗</span></button></dialog>
    <script>window.ORBITAL_CHALLENGE_TOKEN = <?= json_encode($challengeToken, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
    <script src="/assets/arena.js" defer></script>
  <?php endif; ?>
</body>
</html>
