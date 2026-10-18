(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const csrf = $('meta[name="csrf-token"]')?.content || '';
  const toastRegion = $('#toast-region');
  let state = null;
  let view = 'arena';
  let battleMode = 'bot';
  let battle = null;
  let opponentIndex = 0;
  let lastFrame = 0;
  let swipeStartX = null;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);

  async function api(action, body) {
    const options = {
      headers: { 'X-CSRF-Token': state?.csrf || csrf },
      credentials: 'same-origin',
    };
    if (body !== undefined) {
      options.method = 'POST';
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify({ ...body, _csrf: state?.csrf || csrf });
    }

    async function passCurrentPlayer() {
      const opponent = state?.opponents?.[opponentIndex];
      if (!opponent) return;
      try {
        await api('players_pass', { playerId: opponent.id });
        opponentIndex++;
        await loadState();
      } catch (error) { notify(error.message, 'error'); }
    }

    function challengeCurrentPlayer() {
      const opponent = state?.opponents?.[opponentIndex];
      if (opponent) challengePlayer(opponent.id);
    }
    const response = await fetch(`/api.php?action=${encodeURIComponent(action)}`, options);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
    return result;
  }

  function notify(message, type = 'success') {
    if (!toastRegion) return;
    const node = document.createElement('div');
    node.className = `toast toast-${type}`;
    node.textContent = message;
    toastRegion.append(node);
    window.setTimeout(() => node.remove(), 4400);
  }

  function currentView(next) {
    if (!['arena', 'opponents', 'forge', 'truth', 'evolution', 'market'].includes(next)) return;
    view = next;
    $$('.screen').forEach((screen) => screen.classList.toggle('is-visible', screen.id === `view-${next}`));
    $$('.nav-link').forEach((link) => link.classList.toggle('is-active', link.dataset.view === next));
    if (next === 'market') renderMarket();
    if (next === 'opponents') renderOpponents();
    if (next === 'truth') renderTruth();
    if (next === 'evolution') renderEvolution();
    if (next === 'forge') requestAnimationFrame(drawForge);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderState() {
    if (!state) return;
    const user = state.user;
    const count = user.sphere.length;
    $('#credits').textContent = user.credits;
    $('#battle-count').textContent = state.battleCount;
    $('#round-number').textContent = String(state.battleCount + 1).padStart(3, '0');
    $('#player-sphere-label').textContent = user.username.toUpperCase();
    $('#odds-value').textContent = state.odds;
    $('#odds-bar').style.width = `${state.odds}%`;
    $('#power-caption').textContent = `Your sphere power ${state.power}`;
    $('#strategy-label').textContent = user.sphere_type;
    $('#arena-sphere-type').textContent = user.sphere_type;
    $('#logic-preview').textContent = user.logic_text || 'Set a relation in the forge';
    $('#analogy-count').textContent = count;
    $('#cell-count').textContent = user.cell_count;
    $('#daily-earned').textContent = state.dailyEarned;
    $('#learned-count').textContent = `${state.learnedCount} LEARNED`;
    $('#forge-cell-count').textContent = user.cell_count;
    $('#forge-power').textContent = state.power;
    $('#forge-sphere-name').textContent = user.username.toUpperCase();
    $('#rarity-badge').textContent = user.sphere_type.toUpperCase();
    $('#rarity-badge').classList.toggle('is-rare', user.rarity === 'rare');
    $('#forge-canvas').style.setProperty('--sphere-color', user.color);
    $('#arena-canvas').style.setProperty('--sphere-color', user.color);
    $('#logic-input').value = user.logic_text;
    $$('.gdt-options input').forEach((input) => { input.checked = user.gdt.includes(input.value); });
    $('#forge-type').textContent = user.sphere_type;
    $('#symbol-inventory').textContent = (user.symbols || []).join('  ') || '—';
    $('#color-inventory').innerHTML = (user.colors || []).map((color) => `<i class="color-dot" style="--trait-color:${esc(color)}" title="${esc(color)}"></i>`).join('') || '—';
    $('#diameter-level').textContent = user.diameter_level;
    $('#spin-level').textContent = user.spin_level;
    $('#diameter-cost').textContent = 12 + user.diameter_level * 8;
    $('#spin-cost').textContent = 10 + user.spin_level * 7;
    $('#pulsar-status').textContent = state.pulsarAvailable ? 'PULSAR CHARGE READY' : 'NO ACTIVE CHARGE';
    $('#battle-button').disabled = Boolean(state.liveBattle) || Boolean(battle) || Boolean(state.sphereListed);
    $('#battle-button').title = state.sphereListed ? 'Your sphere is locked in an auction.' : '';
    $('#open-list-form').disabled = Boolean(state.sphereListed);
    if (state.liveBattle && !battle) restoreBattle(state.liveBattle);
    renderDiscoveries();
    renderBattleLog();
    renderMarket();
    renderOpponents();
    renderTruth();
    renderEvolution();
    drawForge();
  }

  function renderDiscoveries() {
    const target = $('#discovery-list');
    if (!state.discoveries.length) {
      target.innerHTML = '<div class="empty-state"><span>✦</span><p>Your next battle may reveal a new combination.</p></div>';
      return;
    }
    target.innerHTML = state.discoveries.map((item, index) => `
      <div class="discovery-row">
        <span class="discovery-index">0${index + 1}</span>
        <span class="discovery-pattern">${esc(item.combo_text)}</span>
        <span class="discovery-date">${new Date(`${item.created_at.replace(' ', 'T')}Z`).toLocaleDateString()}</span>
      </div>`).join('');
  }

  function renderBattleLog() {
    const target = $('#battle-log');
    if (!state.battles.length) {
      target.innerHTML = '<div class="empty-state"><span>◉</span><p>Your first round is waiting.</p></div>';
      return;
    }
    target.innerHTML = state.battles.map((item) => `
      <div class="log-row">
        <span class="log-outcome ${Number(item.won) ? 'won' : 'lost'}">${Number(item.won) ? 'W' : 'L'}</span>
        <span class="log-title">${Number(item.won) ? 'Ring-out secured' : 'Lesson retained'}<small>${item.mitosis === '1' || item.mitosis === 1 ? 'Cell division · ' : ''}${esc(item.combo_text)}</small></span>
        <span class="log-reward">+${item.reward} <i>✦</i></span>
      </div>`).join('');
  }

  function renderMarket() {
    if (!state) return;
    const grid = $('#market-grid');
    const listings = state.listings;
    $('#market-count').textContent = `${listings.length} SPHERES`;
    grid.innerHTML = listings.length ? listings.map((listing, index) => {
      const sphere = listing.sphere || {};
      const color = /^[#][0-9a-f]{6}$/i.test(sphere.color || '') ? sphere.color : '#70e6ff';
      const rarity = sphere.sphere_type || 'Cellular';
      const preview = (sphere.analogies || []).slice(0, 3).map((item) => `<span>${esc(item.text)}</span>`).join('');
      return `<article class="market-card" style="--relic-color:${color}">
        <div class="market-art"><span class="market-art-ring"></span><span class="market-art-core">◉</span><span class="market-card-index">RELIC / 0${index + 1}</span><span class="market-rarity ${rarity === 'Rare' ? 'is-rare' : ''}">${rarity.toUpperCase()}</span></div>
        <div class="market-card-body"><div class="market-seller">BY ${esc(listing.seller).toUpperCase()}</div><h3>${esc(listing.title)}</h3><div class="relic-relations">${preview || '<span>Unmapped relations</span>'}</div>
          <div class="market-meta"><span>${listing.analogies} RELATIONS</span><span>RESERVE ${listing.minimum_bid} ✦</span><span>TOP BID ${listing.highest_bid} ✦</span></div>
          <div class="market-card-actions"><span class="market-seller">BY ${esc(listing.seller).toUpperCase()}</span></div>
          <form class="bid-form" data-bid-form="${listing.id}"><label class="sr-only" for="bid-${listing.id}">Credit bid</label><input id="bid-${listing.id}" type="number" min="${Math.max(listing.minimum_bid, listing.highest_bid + 1)}" max="${state.user.credits}" step="1" placeholder="Bid in credits" required><button type="submit">Place escrow bid ↗</button></form>
        </div></article>`;
    }).join('') : '<div class="market-empty"><span>✦</span><h3>The exchange is quiet.</h3><p>List a sphere or check back after more players join.</p></div>';
    renderOwnedListings();
    wireMarketControls();
  }

  function renderOwnedListings() {
    const panel = $('#owned-listings');
    if (!panel) return;
    const listings = state.ownListings || [];
    const rows = listings.map((listing) => {
      const bids = listing.bids.length
        ? listing.bids.map((bid) => `<div class="owned-bid"><span>${esc(bid.username)} · <b>${bid.credits} ✦</b></span><button type="button" data-accept-bid="${bid.id}">Accept bid</button></div>`).join('')
        : '<span class="no-bids">Locked in auction · awaiting the reserve bid…</span>';
      return `<div class="owned-listing"><div><b>${esc(listing.title)}</b><small>RESERVE ${listing.minimum_bid} CREDITS · ${listing.bids.length} PUBLIC BID${listing.bids.length === 1 ? '' : 'S'}</small></div><div class="owned-bids">${bids}</div></div>`;
    }).join('');
    panel.innerHTML = listings.length ? `<div class="owned-listing-heading"><span class="eyebrow">YOUR OPEN LISTING</span></div>${rows}` : '';
  }

  function wireMarketControls() {
    $$('[data-bid-form]').forEach((form) => {
      form.onsubmit = async (event) => {
        event.preventDefault();
        try {
          const result = await api('bid', { listingId: Number(form.dataset.bidForm), credits: Number($('input', form).value) });
          notify(result.message);
          await loadState();
        } catch (error) { notify(error.message, 'error'); }
      };
    });
    $$('[data-accept-bid]').forEach((button) => {
      button.onclick = async () => {
        if (!window.confirm('Accept this public credit bid and transfer the listed sphere?')) return;
        try {
          const result = await api('accept_bid', { bidId: Number(button.dataset.acceptBid) });
          notify(result.message);
          await loadState();
        } catch (error) { notify(error.message, 'error'); }
      };
    });

  }

  function renderOpponents() {
    if (!state) return;
    const opponents = state.opponents || [];
    opponentIndex = opponents.length ? opponentIndex % opponents.length : 0;
    const opponent = opponents[opponentIndex];
    $('#opponent-name').textContent = opponent ? opponent.username : 'No rivals online';
    $('#opponent-meta').textContent = opponent
      ? `${opponent.cell_count} living cells · Active now · Consecutive rematches blocked`
      : 'Invite a friend by username or check again when more players are active.';
    $('#opponent-type').textContent = opponent ? opponent.sphere_type.toUpperCase() : 'WAITING';
    $('#opponent-sphere').style.color = opponent?.color || '#70e6ff';
    $('#pass-player').disabled = !opponent;
    $('#challenge-player').disabled = !opponent;
    const challenges = state.challenges || [];
    const inbox = $('#challenge-list');
    inbox.innerHTML = challenges.length ? challenges.map((challenge) => {
      const incoming = !challenge.youAreChallenger && challenge.status === 'pending';
      const opponentName = challenge.youAreChallenger ? challenge.opponent : challenge.challenger;
      const completed = challenge.status === 'completed' && challenge.result?.winner;
      const summary = completed
        ? `${esc(challenge.result.winner)} won · ${esc(challenge.result.combo || 'new relation')}`
        : incoming ? 'Incoming live duel' : `Challenge ${esc(challenge.status)}`;
      return `<div class="challenge-row"><span><b>${esc(opponentName || 'Friend')}</b><small>${summary}</small></span>${incoming ? `<button type="button" data-accept-challenge="${challenge.id}">Accept</button><button type="button" data-decline-challenge="${challenge.id}">×</button>` : ''}</div>`;
    }).join('') : '<p class="empty-state">No open challenges.</p>';
    $$('[data-accept-challenge]').forEach((button) => {
      button.onclick = async () => {
        try {
          const result = await api('challenge_accept', { challengeId: Number(button.dataset.acceptChallenge) });
          showPlayerResult(result);
          await loadState();
        } catch (error) { notify(error.message, 'error'); }
      };
    });
    $$('[data-decline-challenge]').forEach((button) => {
      button.onclick = async () => {
        try {
          const result = await api('challenge_decline', { challengeId: Number(button.dataset.declineChallenge) });
          notify(result.message);
          await loadState();
        } catch (error) { notify(error.message, 'error'); }
      };
    });
    const loot = $('#arena-loot');
    loot.innerHTML = state.loot.length ? state.loot.map((item) => `<div class="loot-row"><span>${esc(item.kind)} · ${esc(typeof item.value === 'object' ? item.value.text : item.value)}</span><button type="button" data-claim-loot="${item.id}">Collect</button></div>`).join('') : '<p class="empty-state">No loose cells nearby.</p>';
    $$('[data-claim-loot]').forEach((button) => {
      button.onclick = async () => {
        try {
          const result = await api('loot_claim', { lootId: Number(button.dataset.claimLoot) });
          notify(result.message);
          await loadState();
        } catch (error) { notify(error.message, 'error'); }
      };
    });
  }

  function renderTruth() {
    if (!state) return;
    const personal = $('#personal-truth');
    personal.innerHTML = state.truth.length ? state.truth.map((row) => `<div class="truth-row"><span>${esc(row.relation_text)}</span><b class="truth-${esc(row.truth_value)}">${esc(row.truth_value)}</b></div>`).join('') : '<p class="empty-state">No personal truth entries yet.</p>';
    const community = $('#community-truth');
    community.innerHTML = state.communityTruth.length ? state.communityTruth.map((row) => `<div class="truth-row"><span>${esc(row.relation_text)}</span><b>${Number(row.popularity)} signals</b></div>`).join('') : '<p class="empty-state">Community relations are waiting to be discovered.</p>';
  }

  function renderEvolution() {
    if (!state) return;
    ['diameter', 'spin'].forEach((upgrade) => {
      const level = Number(state.user[`${upgrade}_level`] || 0);
      const cost = upgrade === 'diameter' ? 12 + level * 8 : 10 + level * 7;
      $(`#${upgrade}-level`).textContent = level;
      $(`#${upgrade}-cost`).textContent = cost;
      const button = $(`[data-upgrade="${upgrade}"]`);
      button.disabled = state.user.credits < cost || level >= 8;
    });
  }

  async function challengePlayer(playerId) {
    try {
      const result = await api('challenge_create', { playerId });
      $('#challenge-link').innerHTML = `Invite <b>${esc(result.opponent)}</b>: <a href="${esc(result.invite)}">${esc(result.invite)}</a> <button type="button" id="copy-challenge">Copy link</button>`;
      $('#copy-challenge').onclick = async () => {
        try {
          await navigator.clipboard.writeText(result.invite);
          notify('Friend challenge link copied.');
        } catch (error) { notify(`Copy this invite link: ${result.invite}`, 'error'); }
      };
      notify(result.message);
      await loadState();
    } catch (error) { notify(error.message, 'error'); }
  }

  function showPlayerResult(result) {
    const duel = result.result || {};
    $('#result-dialog').classList.toggle('result-loss', !result.won);
    $('#result-orbit').textContent = result.won ? '◉' : '✦';
    $('#result-kicker').textContent = 'LIVE PLAYER DUEL';
    $('#result-title').textContent = result.won ? 'You held the disk.' : `${esc(duel.winner || 'Your rival')} claimed the ring-out.`;
    $('#result-message').textContent = result.message || `New relation: ${duel.combo || '—'}`;
    $('#result-reward').innerHTML = `<span>+${Number(result.reward || 0)} <b>INSIGHT CREDITS</b></span><small>${esc(duel.combo || 'PLAYER CHALLENGE')}</small>`;
    $('#result-dialog').showModal();
  }

  function renderTruthResult(truth) {
    $('#truth-result').innerHTML = `<span class="truth-${esc(truth.truth)}">${esc(truth.truth.toUpperCase())}</span><small>${truth.source === 'community' ? `Popular community relation · ${Number(truth.popularity)} signals` : truth.source === 'personal' ? 'Your personal truth-table override' : 'No matching popular standard yet'}</small>`;
  }

  async function loadState() {
    state = await api('state');
    renderState();
  }

  async function saveProgram() {
    const gdt = $$('.gdt-options input:checked').map((input) => input.value);
    try {
      const result = await api('program', {
        logic: $('#logic-input').value,
        gdt,
      });
      notify(result.message);
      await loadState();
    } catch (error) { notify(error.message, 'error'); }
  }

  async function importText(text) {
    if (!text.trim()) return notify('Add a relation or RSR file first.', 'error');
    try {
      const result = await api('import', { text });
      notify(result.message);
      $('#analogy-input').value = '';
      await loadState();
    } catch (error) { notify(error.message, 'error'); }
  }

  function beginBattle(result) {
    $('#battle-button').disabled = true;
    $('#battle-button').innerHTML = '<span class="launch-glyph">◉</span> SPINNING <span class="button-arrow">···</span>';
    $('#battle-controls').hidden = false;
    battle = {
      result: null,
      id: result.battleId,
      started: performance.now() / 1000,
      odds: result.odds,
      x: -0.22,
      y: -0.07,
      rx: 0.24,
      ry: 0.05,
      vx: 0.008 + Math.random() * 0.004,
      vy: 0.004,
      rvx: -0.006 - Math.random() * 0.004,
      rvy: -0.004,
      mitosisShown: false,
      hits: 0,
      resolving: false,
      lastDirection: '',
      streak: 0,
      pulsar: result.pulsar,
    };
    $('#live-odds').textContent = result.odds;
    $('#tap-streak').textContent = '0 spin chain';
  }

  async function launchBattle() {
    if (battleMode === 'players') {
      currentView('opponents');
      return;
    }
    if (battle) return;
    try {
      const result = await api('battle_start', {});
      beginBattle(result);
    } catch (error) { notify(error.message, 'error'); }
  }

  function restoreBattle(active) {
    const end = Date.parse(`${active.endsAt.replace(' ', 'T')}Z`);
    const elapsed = Math.max(0, 5 - Math.max(0, (end - Date.now()) / 1000));
    beginBattle({
      battleId: active.id,
      odds: active.odds,
      pulsar: active.pulse,
      elapsed,
      lastDirection: active.lastDirection,
      streak: active.streak,
    });
    battle.started = performance.now() / 1000 - elapsed;
    battle.lastDirection = active.lastDirection;
    battle.streak = active.streak;
    $('#live-odds').textContent = active.odds;
    $('#tap-streak').textContent = `${active.streak} spin chain`;
  }

  async function tapSpin(direction) {
    if (!battle || battle.resolving) return;
    try {
      const result = await api('battle_tap', { battleId: battle.id, direction });
      battle.odds = result.odds;
      battle.streak = result.streak;
      battle.lastDirection = result.direction;
      $('#live-odds').textContent = result.odds;
      $('#odds-value').textContent = result.odds;
      $('#odds-bar').style.width = `${result.odds}%`;
      $('#tap-streak').textContent = `${result.streak} alternating spin${result.streak === 1 ? '' : 's'}`;
      battle[direction === 'left' ? 'vx' : 'rvx'] += direction === 'left' ? -0.009 : 0.009;
    } catch (error) { notify(error.message, 'error'); }
  }

  async function settleBattle() {
    if (!battle || battle.resolving) return;
    battle.resolving = true;
    try {
      battle.result = await api('battle_resolve', { battleId: battle.id });
      battle.settledAt = performance.now() / 1000;
    } catch (error) {
      battle.resolving = false;
      battle.nextResolveAttempt = performance.now() / 1000 + 1;
      notify(error.message, 'error');
    }
  }

  function finishBattle() {
    const result = battle?.result;
    battle = null;
    $('#battle-button').disabled = false;
    $('#battle-button').innerHTML = '<span class="launch-glyph">◉</span> START 5-SECOND BATTLE <span class="button-arrow">↗</span>';
    $('#battle-controls').hidden = true;
    if (!result) return;
    $('#result-dialog').classList.toggle('result-loss', !result.won);
    $('#result-orbit').textContent = result.won ? '◉' : '✦';
    $('#result-kicker').textContent = result.won ? 'RING-OUT · VICTORY' : 'LESSON RETAINED · DEFEAT';
    $('#result-title').textContent = result.won ? 'Your idea held its ground.' : 'A loss with a new angle.';
    $('#result-message').textContent = result.message;
    const dropText = result.drops?.length ? ` · ${result.drops.map((drop) => drop.disposition === 'arena' ? 'Arena loot' : 'Bot transfer').join(', ')}` : '';
    $('#result-reward').innerHTML = `<span>+${result.reward} <b>INSIGHT CREDITS</b></span><small>${result.discovery ? `NEW COMBINATION · ${esc(result.combo)}` : 'BATTLE REWARD'}${esc(dropText)}</small>`;
    $('#result-dialog').showModal();
    loadState().catch((error) => notify(error.message, 'error'));
  }

  function drawAnalogyMesh(ctx, x, y, radius, analogies, spin) {
    if (!analogies.length) return;
    const limit = radius >= 40 ? 36 : 12;
    const relationCount = Math.min(limit, analogies.length);
    const relations = Array.from({ length: relationCount }, (_, index) => (
      analogies[Math.floor(index * analogies.length / relationCount)]
    ));
    const nodes = relations.map((item, index) => {
      const theta = Number(item.theta);
      const angle = (Number.isFinite(theta) ? theta : 0) + index * 2.399963 + spin * 0.08;
      const magnitude = Math.max(0.02, Math.min(1, (Number(item.r) || 0.55) / 8));
      const distance = radius * (0.08 + 0.88 * magnitude) * (0.82 + 0.18 * Math.sqrt((index + 0.5) / relations.length));
      return {
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance * 0.72,
        negated: Boolean(item.negated),
      };
    });

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.98, 0, Math.PI * 2);
    ctx.clip();
    const links = new Set();
    nodes.forEach((node, index) => {
      let closest = { index: -1, distance: Infinity };
      let nextClosest = { index: -1, distance: Infinity };
      nodes.forEach((other, otherIndex) => {
        if (otherIndex === index) return;
        const distance = Math.hypot(node.x - other.x, node.y - other.y);
        if (distance < closest.distance) {
          nextClosest = closest;
          closest = { index: otherIndex, distance };
        } else if (distance < nextClosest.distance) {
          nextClosest = { index: otherIndex, distance };
        }
      });
      [closest, nextClosest].forEach((other) => {
        if (other.index < 0) return;
        const from = Math.min(index, other.index);
        const to = Math.max(index, other.index);
        links.add(`${from}:${to}`);
      });
    });
    links.forEach((link) => {
      const [from, to] = link.split(':').map(Number);
      ctx.beginPath();
      ctx.moveTo(nodes[from].x, nodes[from].y);
      ctx.lineTo(nodes[to].x, nodes[to].y);
      ctx.strokeStyle = nodes[from].negated || nodes[to].negated
        ? 'rgba(255,137,111,.68)'
        : 'rgba(239,250,255,.58)';
      ctx.lineWidth = Math.max(0.65, radius * 0.018);
      ctx.stroke();
    });
    nodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, Math.max(1.6, radius * 0.055), 0, Math.PI * 2);
      ctx.fillStyle = node.negated ? '#ff896f' : '#effaff';
      ctx.shadowColor = node.negated ? '#ff896f' : '#dff6ff';
      ctx.shadowBlur = radius * 0.12;
      ctx.fill();
    });
    ctx.restore();
  }

  function drawLogicSatellites(ctx, x, y, radius, color, spin, experience, logicText) {
    if (experience < 3) return;
    const expression = String(logicText || '').replace(/\s+/g, ' ').trim();
    const operators = [...new Set(expression.match(/[∧∨⊕↔¬→]/g) || [])];
    const labels = radius >= 40 && expression
      ? [expression.slice(0, 28)]
      : (operators.length ? operators.slice(0, 3) : ['∧', '→', '∨']);
    const orbitX = radius * 1.72;
    const orbitY = radius * 0.96;

    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.ellipse(x, y, orbitX, orbitY, spin * 0.12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(207,231,240,.24)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.setLineDash([]);
    labels.forEach((label, index) => {
      const angle = spin * 0.42 + (index / labels.length) * Math.PI * 2;
      const satelliteX = x + Math.cos(angle) * orbitX;
      const satelliteY = y + Math.sin(angle) * orbitY;
      ctx.beginPath();
      ctx.arc(satelliteX, satelliteY, radius >= 40 ? 2.4 : 1.8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.font = `${radius >= 40 ? 8 : 7}px ui-monospace, monospace`;
      ctx.textAlign = satelliteX < x ? 'right' : 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(239,248,251,.94)';
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(10,17,24,.92)';
      ctx.strokeText(label, satelliteX + (satelliteX < x ? -4 : 4), satelliteY, radius * 2.1);
      ctx.fillText(label, satelliteX + (satelliteX < x ? -4 : 4), satelliteY, radius * 2.1);
    });
    ctx.restore();
  }

  function drawSphere(ctx, x, y, radius, color, spin, isRival = false, division = false, analogies = [], experience = 0, logicText = '') {
    const gradient = ctx.createRadialGradient(x - radius * 0.34, y - radius * 0.38, radius * 0.05, x, y, radius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.14, color);
    gradient.addColorStop(0.58, color);
    gradient.addColorStop(1, '#11151b');
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = division ? 36 : 22;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    drawAnalogyMesh(ctx, x, y, radius, analogies, spin);
    ctx.strokeStyle = 'rgba(240,250,255,.58)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 1.22, radius * 0.45, spin, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(240,250,255,.24)';
    ctx.beginPath();
    ctx.ellipse(x, y, radius * 0.6, radius * 1.19, spin * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    drawLogicSatellites(ctx, x, y, radius, color, spin, experience, logicText);
    ctx.fillStyle = 'rgba(10,17,24,.56)';
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.16, 0, Math.PI * 2);
    ctx.fill();
    if (division) {
      const budX = x + Math.cos(spin * 2) * radius * 1.15;
      const budY = y + Math.sin(spin * 2) * radius * 0.72;
      ctx.beginPath();
      ctx.arc(budX, budY, radius * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = `${color}aa`;
      ctx.fill();
      ctx.strokeStyle = `${color}88`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(budX, budY);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawArena(time, dt) {
    const canvas = $('#arena-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = rect.width;
    const height = rect.height;
    const cx = width / 2;
    const cy = height / 2 + 5;
    const radius = Math.min(width * 0.42, height * 0.52);
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(width, height) * 0.72);
    bg.addColorStop(0, '#1b2631');
    bg.addColorStop(0.55, '#111a23');
    bg.addColorStop(1, '#0d1319');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 1; i <= 4; i++) {
      ctx.strokeStyle = i === 4 ? 'rgba(130,188,209,.54)' : 'rgba(104,151,170,.14)';
      ctx.lineWidth = i === 4 ? 2 : 1;
      ctx.setLineDash(i === 4 ? [] : [2, 8]);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * i / 4, radius * i / 4 * 0.68, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(112,230,255,.35)';
    for (let i = 0; i < 38; i++) {
      const angle = i * 2.399 + Math.floor(i / 7);
      const distance = radius * (0.1 + ((i * 13) % 81) / 100);
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * distance, Math.sin(angle) * distance * 0.68, i % 5 === 0 ? 1.4 : 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (battle) {
      const elapsed = time - battle.started;
      const step = Math.min(2.6, Math.max(0, dt)) * 60;
      battle.x += battle.vx * step;
      battle.y += battle.vy * step;
      battle.rx += battle.rvx * step;
      battle.ry += battle.rvy * step;
      const distance = Math.hypot(battle.x - battle.rx, battle.y - battle.ry);
      if (distance < 0.11 && elapsed > 0.55) {
        const nx = (battle.x - battle.rx) / Math.max(distance, 0.001);
        const ny = (battle.y - battle.ry) / Math.max(distance, 0.001);
        battle.vx += nx * 0.0042;
        battle.vy += ny * 0.0035;
        battle.rvx -= nx * 0.004;
        battle.rvy -= ny * 0.0032;
        battle.hits += 1;
      }
      const limit = 0.39;
      for (const side of ['player', 'rival']) {
        const xKey = side === 'player' ? 'x' : 'rx';
        const yKey = side === 'player' ? 'y' : 'ry';
        const vxKey = side === 'player' ? 'vx' : 'rvx';
        const vyKey = side === 'player' ? 'vy' : 'rvy';
        if (Math.hypot(battle[xKey], battle[yKey]) > limit) {
          battle[xKey] *= 0.91;
          battle[yKey] *= 0.91;
          battle[vxKey] *= -0.8;
          battle[vyKey] *= -0.8;
        }
      }
      if (elapsed > 2.2 && battle.pulsar && !battle.pulseApplied) {
        battle.pulseApplied = true;
        battle.vx *= 2.8;
        battle.vy *= 2.8;
        $('#mitosis-tag').classList.add('mitosis-active');
        notify('Pulsar charge fired as your sphere slowed.');
        window.setTimeout(() => $('#mitosis-tag')?.classList.remove('mitosis-active'), 1800);
      }
      if (elapsed > 2.5 && battle.result?.mitosis && !battle.mitosisShown) {
        battle.mitosisShown = true;
        $('#mitosis-tag').classList.add('mitosis-active');
        notify('Cell division: a daughter cell buds and folds back into your shell.');
        window.setTimeout(() => $('#mitosis-tag')?.classList.remove('mitosis-active'), 2500);
      }
      const scale = radius * 0.7;
      if (battle.result && elapsed > 3.6) {
        const xKey = battle.result.won ? 'rx' : 'x';
        const yKey = battle.result.won ? 'ry' : 'y';
        const magnitude = Math.hypot(battle[xKey], battle[yKey]) || 1;
        const ringOut = 0.39 + Math.min(0.38, (elapsed - 3.6) * 0.38);
        battle[xKey] = battle[xKey] / magnitude * ringOut;
        battle[yKey] = battle[yKey] / magnitude * ringOut;
      }
      const playerSize = 24 + Math.min(12, (state?.user.diameter_level || 0) * 1.2);
      const pulsing = battle.pulseApplied && Math.sin(time * 26) > 0;
      drawSphere(ctx, cx + battle.x * scale, cy + battle.y * scale * 0.72, playerSize, state?.user.color || '#70e6ff', time * (7 + (state?.user.spin_level || 0)), false, (battle.mitosisShown && elapsed < 4.5) || pulsing, state?.user.sphere || [], state?.battleCount || 0, state?.user.logic_text || '');
      drawSphere(ctx, cx + battle.rx * scale, cy + battle.ry * scale * 0.72, 24, '#ff896f', -time * 6, true, false, state?.user.rival || []);
      ctx.fillStyle = 'rgba(235,246,250,.46)';
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(battle.result ? (battle.result.won ? 'SPHERE SLINGSHOT OUT' : 'YOUR MEMBRANE EJECTED') : 'ALTERNATE TAPS · BUILD SPIN', cx, height - 22);
      if (elapsed >= 5 && !battle.resolving && time >= (battle.nextResolveAttempt || 0)) settleBattle();
      if (battle.result && time - battle.settledAt > 0.8) finishBattle();
    } else {
      const orbit = Math.min(radius * 0.36, width * 0.2);
      drawSphere(ctx, cx - orbit, cy + Math.sin(time * 0.9) * 8, 24, state?.user.color || '#70e6ff', time * 0.8, false, false, state?.user.sphere || [], state?.battleCount || 0, state?.user.logic_text || '');
      drawSphere(ctx, cx + orbit, cy + Math.cos(time * 0.8) * 7, 24, '#ff896f', -time * 0.65, true, false, state?.user.rival || []);
    }
    ctx.fillStyle = 'rgba(132,164,181,.57)';
    ctx.font = '9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('INERTIAL FIELD / RING 01', cx, height - 8);
  }

  function drawForge() {
    const canvas = $('#forge-canvas');
    if (!canvas || !state) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = rect.width;
    const height = rect.height;
    const cx = width / 2;
    const cy = height / 2;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#11181f';
    ctx.fillRect(0, 0, width, height);
    [48, 84, 120].forEach((r) => {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(r, height * 0.43), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(132,164,181,.18)';
      ctx.setLineDash([2, 6]);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    const items = state.user.sphere || [];
    const radius = Math.min(54, height * 0.26);
    drawSphere(ctx, cx, cy, radius, state.user.color, performance.now() / 4000, false, false, items, state.battleCount, state.user.logic_text);
  }

  function frame(time) {
    const dt = lastFrame ? (time - lastFrame) / 1000 : 0;
    lastFrame = time;
    drawArena(time / 1000, dt);
    if (view === 'forge') drawForge();
    requestAnimationFrame(frame);
  }

  function bindUI() {
    $$('[data-view]').forEach((button) => button.addEventListener('click', () => currentView(button.dataset.view)));
    $('[data-open-forge]')?.addEventListener('click', () => currentView('forge'));
    $('#battle-button')?.addEventListener('click', launchBattle);
    $('#save-program')?.addEventListener('click', saveProgram);
    $('#close-result')?.addEventListener('click', () => $('#result-dialog').close());
    $('#result-done')?.addEventListener('click', () => { $('#result-dialog').close(); currentView('arena'); });
    $$('.mode-button').forEach((button) => button.addEventListener('click', () => {
      battleMode = button.dataset.mode;
      $$('.mode-button').forEach((item) => item.classList.toggle('is-active', item === button));
    }));
    $$('.spin-tap').forEach((button) => button.addEventListener('click', () => tapSpin(button.dataset.spin)));
    $('#pass-player')?.addEventListener('click', async () => {
      await passCurrentPlayer();
    });
    $('#challenge-player')?.addEventListener('click', () => {
      challengeCurrentPlayer();
    });
    $('#opponent-card')?.addEventListener('pointerdown', (event) => { swipeStartX = event.clientX; });
    $('#opponent-card')?.addEventListener('pointerup', (event) => {
      if (swipeStartX === null) return;
      const distance = event.clientX - swipeStartX;
      swipeStartX = null;
      if (Math.abs(distance) < 60) return;
      if (distance < 0) $('#pass-player').click();
      else $('#challenge-player').click();
    });
    $('#opponent-card')?.addEventListener('pointercancel', () => { swipeStartX = null; });
    $('#friend-challenge')?.addEventListener('click', () => {
      const name = $('#friend-name').value.trim().toLocaleLowerCase();
      const opponent = state?.opponents?.find((player) => player.username.toLocaleLowerCase() === name);
      if (!opponent) return notify('That exact username is not online right now.', 'error');
      challengePlayer(opponent.id);
    });
    $$('[data-upgrade]').forEach((button) => button.addEventListener('click', async () => {
      try {
        const result = await api('upgrade', { upgrade: button.dataset.upgrade });
        notify(result.message);
        await loadState();
      } catch (error) { notify(error.message, 'error'); }
    }));
    $('#check-truth')?.addEventListener('click', async () => {
      try {
        const result = await api('truth_check', { relation: $('#truth-relation').value });
        renderTruthResult(result.truth);
      } catch (error) { notify(error.message, 'error'); }
    });
    $$('.truth-actions button').forEach((button) => button.addEventListener('click', async () => {
      try {
        const result = await api('truth_update', { relation: $('#truth-relation').value, truth: button.dataset.truth });
        renderTruthResult(result.truth);
        notify(result.message);
        await loadState();
      } catch (error) { notify(error.message, 'error'); }
    }));
    $$('.gdt-options input').forEach((input) => input.addEventListener('change', () => {
      if ($$('.gdt-options input:checked').length > 5) {
        input.checked = false;
        notify('Choose up to five GD&T edge conditions.', 'error');
      }
    }));
    $('#import-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      importText($('#analogy-input').value);
    });
    const fileInput = $('#file-input');
    $('#choose-file')?.addEventListener('click', () => fileInput.click());
    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      if (file.size > 1_000_000) { notify('Files must be 1 MB or smaller.', 'error'); return; }
      try { await importText(await file.text()); } catch (error) { notify(error.message, 'error'); }
      fileInput.value = '';
    });
    const drop = $('#drop-zone');
    drop?.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      fileInput.click();
    });
    drop?.addEventListener('dragover', (event) => { event.preventDefault(); drop.classList.add('is-dragging'); });
    drop?.addEventListener('dragleave', () => drop.classList.remove('is-dragging'));
    drop?.addEventListener('drop', async (event) => {
      event.preventDefault();
      drop.classList.remove('is-dragging');
      const file = event.dataTransfer.files?.[0];
      if (file) {
        if (file.size > 1_000_000) return notify('Files must be 1 MB or smaller.', 'error');
        try { await importText(await file.text()); } catch (error) { notify(error.message, 'error'); }
      } else {
        await importText(event.dataTransfer.getData('text/plain'));
      }
    });
    $('#open-list-form')?.addEventListener('click', () => { $('#list-form').hidden = false; $('#list-form').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    $('#close-list-form')?.addEventListener('click', () => { $('#list-form').hidden = true; });
    $('#list-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const result = await api('list', { title: $('#listing-title').value });
        $('#list-form').hidden = true;
        notify(result.message);
        await loadState();
      } catch (error) { notify(error.message, 'error'); }
    });
    window.addEventListener('resize', () => { drawForge(); });
  }

  bindUI();
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch((error) => console.error('Service worker registration failed:', error)));
  }
  loadState()
    .then(async () => {
      requestAnimationFrame(frame);
      const token = window.ORBITAL_CHALLENGE_TOKEN;
      if (token) {
        try {
          const result = await api('challenge_accept', { token });
          showPlayerResult(result);
          history.replaceState(null, '', '/');
          await loadState();
        } catch (error) { notify(error.message, 'error'); }
      }
      window.setInterval(() => {
        if (view === 'opponents' && !battle) loadState().catch((error) => notify(error.message, 'error'));
      }, 5000);
    })
    .catch((error) => notify(error.message, 'error'));
})();
