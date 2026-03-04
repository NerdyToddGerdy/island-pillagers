'use strict';

const VERSION = '1.0.2';

const CHANGELOG = `
  <h3>v1.0.2 — 2026-03-04</h3>
  <ul>
    <li>Custom parchment-styled release notes modal (click version badge)</li>
    <li>Version badge enlarged with gold border in footer</li>
  </ul>
  <h3>v1.0.1 — 2026-03-04</h3>
  <ul>
    <li>Inline warning replaces bottom-of-screen modal for attack errors</li>
  </ul>
  <h3>v1.0.0 — 2026-03-04</h3>
  <ul>
    <li>Initial two-player pirate land-grabbing game</li>
    <li>Dice-based combat with win-condition modals</li>
    <li>Configurable map size: 4×4, 5×5, 6×6</li>
    <li>Three grid shapes: Square, Hexagon, Triangle</li>
    <li>2–4 player support with elimination tracking</li>
    <li>Bot opponent: Off / Easy / Medium / Hard</li>
    <li>Round counter and dice result panel</li>
    <li>Fully responsive layout</li>
    <li>Pirate theme: ocean gradient, Cinzel Decorative font</li>
  </ul>
`;

document.addEventListener('DOMContentLoaded', () => {

  const BOT_DELAY      = 700;  // ms between bot attack moves
  const BOT_HIRE_DELAY = 400;  // ms between bot hire placements

  let currentCols       = 4;
  let currentBotDiffs   = { player2: 'off', player3: 'off', player4: 'off' };
  let currentNumPlayers = 2;
  let currentShape      = 'square';
  let activeGame        = null;

  function startGame(cols) {
    currentCols = cols;

    // Update active size-btn indicator
    document.querySelectorAll('.size-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.cols, 10) === cols);
    });

    // Cancel any pending bot timeouts from the previous game
    if (activeGame) activeGame.botActive = false;

    // Clone map and End Phase button to remove any stale event listeners
    const mapEl = document.querySelector('.map');
    const freshMap = mapEl.cloneNode(false);
    mapEl.parentNode.replaceChild(freshMap, mapEl);

    const btnEl = document.querySelector('.button');
    const freshBtn = btnEl.cloneNode(true);
    btnEl.parentNode.replaceChild(freshBtn, btnEl);

    activeGame = new Game(cols, currentBotDiffs, currentNumPlayers, currentShape);
    activeGame.init();
  }

class Game {
  constructor(cols = 4, diff = {}, numPlayers = 2, shape = 'square') {
    this.cols      = cols;
    this.gridSize  = cols * cols;
    this.numPlayers         = numPlayers;
    this.playerKeys         = ['player1','player2','player3','player4'].slice(0, numPlayers);
    this.activePlayers      = [...this.playerKeys];
    this.currentPlayerIndex = 0;
    this.currentPlayer      = 'player1';
    this.currentPhase       = 'attack';   // 'attack' | 'hire'
    this.gameRound          = 1;
    this.clickedIndex1      = -1;
    this.clickedIndex2      = -1;
    this.clickedUnits1      = 0;
    this.clickedUnits2      = 0;
    this.newSoldiers        = 0;
    this.shape              = shape;       // 'square' | 'hex'
    this.botDiffs           = { ...diff }; // per-player difficulty map
    this.botActive          = true;       // set false on game reset to cancel pending timeouts

    // Online multiplayer — all false/null in local mode
    this.onlineMode  = false;
    this.localPlayer = null;   // 'player1' | 'player2' | 'player3' | 'player4'
    this.roomCode    = null;
    this.players = {
      player1: { name: 'Player 1' },
      player2: { name: 'Player 2' },
      player3: { name: 'Player 3' },
      player4: { name: 'Player 4' },
    };

    // Cached DOM references
    this.mapEl    = document.querySelector('.map');
    this.buttonEl = document.querySelector('.button');
  }

  // ── Bootstrap ──────────────────────────────────────────

  buildGrid() {
    this.mapEl.innerHTML = '';

    if (this.shape === 'hex') {
      this.mapEl.classList.add('hex-mode');
      this.mapEl.classList.remove('tri-mode');

      // Dynamically size hexes to fill the actual rendered map width
      const pad = parseInt(getComputedStyle(this.mapEl).paddingLeft, 10) || 28;
      const contentW = this.mapEl.offsetWidth - 2 * pad;
      // Width constraint: odd rows span w*(cols+0.5) ≤ contentW
      const wByWidth  = Math.floor(contentW / (this.cols + 0.5));
      // Height constraint: total height = h*(3*cols+1)/4 ≤ contentW (map is square)
      // with h = w*1.155: w ≤ contentW*4 / (1.155*(3*cols+1))
      const wByHeight = Math.floor(contentW * 4 / (1.155 * (3 * this.cols + 1)));
      const w = Math.min(wByWidth, wByHeight);
      const h = Math.round(w * 1.155 / 4) * 4;   // multiple of 4 for exact row-offset
      // gap=0: hexes must touch edge-to-edge for seamless honeycomb tiling
      this.mapEl.style.setProperty('--hex-w',          w + 'px');
      this.mapEl.style.setProperty('--hex-h',          h + 'px');
      this.mapEl.style.setProperty('--hex-gap',        '0px');
      this.mapEl.style.setProperty('--hex-row-offset', '-' + (h / 4) + 'px');
      this.mapEl.style.setProperty('--hex-half-w',     (w / 2) + 'px');

      const wrapper = document.createElement('div');
      wrapper.className = 'hex-grid-wrapper';

      for (let r = 0; r < this.cols; r++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'hex-row' + (r % 2 === 1 ? ' hex-row-odd' : '');
        for (let c = 0; c < this.cols; c++) {
          const div = document.createElement('div');
          div.className = 'space';
          div.id = `space-${r * this.cols + c}`;
          div.innerHTML = '<h2>0</h2>';
          rowDiv.appendChild(div);
        }
        wrapper.appendChild(rowDiv);
      }
      this.mapEl.appendChild(wrapper);

    } else if (this.shape === 'triangle') {
      this.mapEl.classList.add('tri-mode');
      this.mapEl.classList.remove('hex-mode');

      // Dynamically size triangles to fill the actual rendered map width
      const pad = parseInt(getComputedStyle(this.mapEl).paddingLeft, 10) || 28;
      const contentW = this.mapEl.offsetWidth - 2 * pad;
      // Width constraint: row_w = w*(cols+1)/2 ≤ contentW → w ≤ 2*contentW/(cols+1)
      const wByWidth  = Math.floor(2 * contentW / (this.cols + 1));
      // Height constraint: h*cols ≤ contentW, h = w*0.866 → w ≤ contentW/(0.866*cols)
      const wByHeight = Math.floor(contentW / (0.866 * this.cols));
      const w = Math.min(wByWidth, wByHeight);
      const h = Math.round(w * 0.866);
      const rowW   = Math.round(w * (this.cols + 1) / 2);
      const totalH = h * this.cols;

      this.mapEl.style.setProperty('--tri-w',       w + 'px');
      this.mapEl.style.setProperty('--tri-h',       h + 'px');
      this.mapEl.style.setProperty('--tri-row-w',   rowW + 'px');
      this.mapEl.style.setProperty('--tri-total-h', totalH + 'px');
      this.triW = w;
      this.triH = h;

      const wrapper = document.createElement('div');
      wrapper.className = 'tri-grid-wrapper';

      for (let r = 0; r < this.cols; r++) {
        for (let c = 0; c < this.cols; c++) {
          const orientation = (r + c) % 2 === 0 ? 'up' : 'down';
          const div = document.createElement('div');
          div.className = 'space';
          div.id = `space-${r * this.cols + c}`;
          div.dataset.orientation = orientation;
          div.style.left = (c * w / 2) + 'px';
          div.style.top  = (r * h) + 'px';
          div.innerHTML = '<h2>0</h2>';
          wrapper.appendChild(div);
        }
      }
      this.mapEl.appendChild(wrapper);

    } else {
      this.mapEl.classList.remove('hex-mode', 'tri-mode');
      this.mapEl.style.setProperty('--grid-cols', this.cols);

      for (let i = 0; i < this.gridSize; i++) {
        const div = document.createElement('div');
        div.className = 'space';
        div.id = `space-${i}`;
        div.innerHTML = '<h2>0</h2>';
        this.mapEl.appendChild(div);
      }
    }

    // Place starting units at corners: TL, BR, TR, BL
    const cornerOrder = [0, this.gridSize - 1, this.cols - 1, this.gridSize - this.cols];
    this.playerKeys.forEach((pk, i) => {
      const el = document.getElementById('space-' + cornerOrder[i]);
      el.classList.add(pk);
      el.innerHTML = '<h2>2</h2>';
    });
  }

  init() {
    this.buildGrid();

    // Single stable listener on the map — no per-space .on()/.off() needed
    this.mapEl.addEventListener('click', e => {
      if (this.shape === 'triangle') {
        const space = this.getTriangleCellFromClick(e);
        if (space) this.handleSpaceClick(space);
        return;
      }
      const space = e.target.closest('.space');
      if (space) this.handleSpaceClick(space);
    });

    // Single stable button listener — reads currentPhase to decide what to do
    this.buttonEl.addEventListener('click', () => {
      if (this.currentPhase === 'attack') this.hirePhase();
      else if (this.currentPhase === 'hire') this.endOfRound();
    });

    const versionEl  = document.getElementById('version');
    const modalEl    = document.getElementById('changelog-modal');
    const modalBody  = document.getElementById('changelog-body');
    const modalClose = document.getElementById('changelog-close');

    versionEl.textContent = `v${VERSION}`;

    const openModal  = () => { modalBody.innerHTML = CHANGELOG; modalEl.removeAttribute('hidden'); };
    const closeModal = () => modalEl.setAttribute('hidden', '');

    versionEl.addEventListener('click', openModal);
    modalClose.addEventListener('click', closeModal);
    modalEl.addEventListener('click', e => { if (e.target === modalEl) closeModal(); });

    this.startAttackPhase();
  }

  // ── Turn management ────────────────────────────────────

  startAttackPhase() {
    this.currentPhase = 'attack';
    this.hideDiceResult();
    this.clearHighlights();
    this.clickedIndex1 = -1;
    this.clickedIndex2 = -1;

    this.currentPlayer = this.activePlayers[this.currentPlayerIndex];

    this.updateUI();
    this.updateScores();

    if (this.isBotTurn()) {
      setTimeout(() => this.botAttackPhase(), BOT_DELAY);
    }
  }

  hirePhase() {
    this.currentPhase = 'hire';
    this.clearHighlights();

    const controlled = document.querySelectorAll('.' + this.currentPlayer).length;
    this.newSoldiers = controlled;

    // Highlight all current player's spaces as clickable targets
    document.querySelectorAll('.' + this.currentPlayer).forEach(el => {
      el.classList.add('new-space');
    });

    document.querySelector('.turns').dataset.player = this.currentPlayer;
    document.querySelector('#phase').textContent = 'Rebuild Phase';
    document.querySelector('.rules').innerHTML =
      `<h3>Rebuild Phase</h3><p>You gain 1 new pirate per space you own. Add these mateys to any of your spaces.</p><h3>You have ${this.newSoldiers} seadogs available.</h3>`;

    if (this.isBotTurn()) {
      setTimeout(() => this.botHirePhase(), BOT_HIRE_DELAY);
    }
  }

  endOfRound() {
    this.clearHighlights();
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.activePlayers.length;
    if (this.currentPlayerIndex === 0) {
      this.gameRound++;
      document.getElementById('round-counter').textContent = `Round ${this.gameRound}`;
    }
    this.startAttackPhase();
    this.syncOnline();
  }

  // ── Click routing ──────────────────────────────────────

  handleSpaceClick(el) {
    if (this.currentPhase === 'attack') {
      this.handleAttackClick(el);
    } else if (this.currentPhase === 'hire') {
      this.handleHireClick(el);
    }
  }

  handleAttackClick(el) {
    if (this.clickedIndex1 === -1) {
      // No space selected yet — try to select this one
      if (!el.classList.contains(this.currentPlayer)) return;

      const units = parseInt(el.textContent.trim(), 10);
      if (units < 2) {
        this.showWarning('Not enough soldiers! You need at least 2 pirates to attack.');
        return;
      }

      // Select this space
      this.clickedIndex1 = parseInt(el.id.replace('space-', ''), 10);
      this.clickedUnits1 = units;
      el.classList.add('clicked-space');

      // Highlight valid attack targets
      this.getAdjacentIndices(this.clickedIndex1).forEach(idx => {
        const target = document.getElementById('space-' + idx);
        if (target && !target.classList.contains(this.currentPlayer)) {
          target.classList.add('new-space');
        }
      });

    } else if (el.classList.contains('clicked-space')) {
      // Clicked the already-selected space — deselect
      this.clearHighlights();
      this.clickedIndex1 = -1;

    } else if (el.classList.contains('new-space')) {
      // Clicked a valid target — attack!
      this.clickedIndex2 = parseInt(el.id.replace('space-', ''), 10);
      this.clickedUnits2 = parseInt(el.textContent.trim(), 10);
      this.attackPhase();
    }
  }

  handleHireClick(el) {
    if (!el.classList.contains(this.currentPlayer)) return;
    if (this.newSoldiers <= 0) return;

    const current = parseInt(el.textContent.trim(), 10);
    el.innerHTML = `<h2>${current + 1}</h2>`;
    this.newSoldiers--;
    document.querySelector('.rules').innerHTML =
      `<h3>Rebuild Phase</h3><p>You gain 1 new pirate per space you own. Add these mateys to any of your spaces.</p><h3>You have ${this.newSoldiers} seadogs available.</h3>`;
    this.syncOnline();
  }

  // ── Combat ─────────────────────────────────────────────

  attackPhase() {
    this.clearHighlights();
    if (this.clickedUnits2 === 0) {
      this.claimLand();
    } else {
      this.rollDice();
    }
  }

  rollDice() {
    const roll = () => Math.ceil(Math.random() * 6);
    const attackerRolls = Array.from({ length: this.clickedUnits1 }, roll);
    const defenderRolls = Array.from({ length: this.clickedUnits2 }, roll);
    const attackerTotal = attackerRolls.reduce((a, b) => a + b, 0);
    const defenderTotal = defenderRolls.reduce((a, b) => a + b, 0);

    // Show dice results in sidebar
    document.getElementById('dice-attacker').textContent =
      `Attacker: [${attackerRolls.join(', ')}] = ${attackerTotal}`;
    document.getElementById('dice-defender').textContent =
      `Defender: [${defenderRolls.join(', ')}] = ${defenderTotal}`;
    const attackerWins = attackerTotal > defenderTotal;
    document.getElementById('dice-outcome').textContent =
      attackerWins ? 'Attacker wins!' : 'Defender holds!';
    document.getElementById('dice-result').removeAttribute('hidden');

    if (attackerWins) {
      this.claimLand();
    } else {
      document.getElementById('space-' + this.clickedIndex1).innerHTML = '<h2>1</h2>';
      this.clickedIndex1 = -1;
      this.clickedIndex2 = -1;
      this.syncOnline();
    }
  }

  claimLand() {
    const movingUnits    = Math.ceil(this.clickedUnits1 / 2);
    const remainingUnits = this.clickedUnits1 - movingUnits;

    const fromEl = document.getElementById('space-' + this.clickedIndex1);
    const toEl   = document.getElementById('space-' + this.clickedIndex2);

    this.playerKeys.forEach(pk => toEl.classList.remove(pk));
    toEl.classList.add(this.currentPlayer);
    fromEl.innerHTML = `<h2>${remainingUnits}</h2>`;
    toEl.innerHTML   = `<h2>${movingUnits}</h2>`;

    this.clickedIndex1 = -1;
    this.clickedIndex2 = -1;
    this.updateScores();
    this.updateActivePlayers();
    this.syncOnline();
  }

  // ── Player tracking ────────────────────────────────────

  updateActivePlayers() {
    [...this.activePlayers].forEach(pk => {
      if (document.querySelectorAll('.' + pk).length === 0) {
        const elimIdx = this.activePlayers.indexOf(pk);
        this.activePlayers.splice(elimIdx, 1);
        // Keep currentPlayerIndex pointing at the same player after splice
        if (elimIdx < this.currentPlayerIndex) this.currentPlayerIndex--;
      }
    });
    this.checkForWinner();
  }

  // ── Win condition ──────────────────────────────────────

  checkForWinner() {
    if (this.activePlayers.length === 1) {
      const winner = this.activePlayers[0];
      swal({
        title: 'Victory!',
        text: `Congratulations, ${this.players[winner].name}! You have conquered all the islands!`,
        type: 'success',
        confirmButtonText: 'Play Again'
      }).then(() => {
        location.reload();
      });
    }
  }

  // ── Grid helpers ───────────────────────────────────────

  getAdjacentIndices(index) {
    if (this.shape === 'hex')      return this.getHexAdjacentIndices(index);
    if (this.shape === 'triangle') return this.getTriangleAdjacentIndices(index);
    return this.getSquareAdjacentIndices(index);
  }

  getSquareAdjacentIndices(index) {
    const row = Math.floor(index / this.cols);
    const col = index % this.cols;
    const adj = [];
    if (row > 0)              adj.push(index - this.cols);
    if (row < this.cols - 1)  adj.push(index + this.cols);
    if (col > 0)              adj.push(index - 1);
    if (col < this.cols - 1)  adj.push(index + 1);
    return adj;
  }

  getHexAdjacentIndices(index) {
    // Odd-r offset coordinates: odd rows shifted right
    const r = Math.floor(index / this.cols);
    const c = index % this.cols;
    const adj = [];

    // Left / right in same row
    if (c > 0)             adj.push(r * this.cols + c - 1);
    if (c < this.cols - 1) adj.push(r * this.cols + c + 1);

    if (r % 2 === 0) {
      // Even row: diagonal neighbors at c-1 and c
      if (r > 0) {
        if (c > 0) adj.push((r-1) * this.cols + c - 1);
        adj.push((r-1) * this.cols + c);
      }
      if (r < this.cols - 1) {
        if (c > 0) adj.push((r+1) * this.cols + c - 1);
        adj.push((r+1) * this.cols + c);
      }
    } else {
      // Odd row: diagonal neighbors at c and c+1
      if (r > 0) {
        adj.push((r-1) * this.cols + c);
        if (c < this.cols - 1) adj.push((r-1) * this.cols + c + 1);
      }
      if (r < this.cols - 1) {
        adj.push((r+1) * this.cols + c);
        if (c < this.cols - 1) adj.push((r+1) * this.cols + c + 1);
      }
    }

    return adj;
  }

  getTriangleAdjacentIndices(index) {
    const r = Math.floor(index / this.cols);
    const c = index % this.cols;
    const adj = [];
    const isUp = (r + c) % 2 === 0;

    // All triangles share left and right neighbors within the same row
    if (c > 0)              adj.push(r * this.cols + c - 1);
    if (c < this.cols - 1)  adj.push(r * this.cols + c + 1);

    // UP triangles share their base with the cell directly below;
    // DOWN triangles share their base with the cell directly above.
    if (isUp) {
      if (r < this.cols - 1) adj.push((r + 1) * this.cols + c);
    } else {
      if (r > 0)             adj.push((r - 1) * this.cols + c);
    }

    return adj;
  }

  // Returns the .space element whose triangle polygon contains the click point.
  // Needed because triangle bounding boxes overlap by W/2.
  getTriangleCellFromClick(e) {
    const wrapper = this.mapEl.querySelector('.tri-grid-wrapper');
    if (!wrapper) return null;
    const rect = wrapper.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const W = this.triW;
    const H = this.triH;

    // Estimate row and a range of columns to check around the click point
    const rEst = Math.floor(py / H);
    const cEst = Math.floor(px / (W / 2));

    for (let dr = -1; dr <= 1; dr++) {
      const r = rEst + dr;
      if (r < 0 || r >= this.cols) continue;
      for (let dc = -2; dc <= 2; dc++) {
        const c = cEst + dc;
        if (c < 0 || c >= this.cols) continue;
        const el = document.getElementById(`space-${r * this.cols + c}`);
        if (!el) continue;

        const left = c * (W / 2);
        const top  = r * H;
        const isUp = (r + c) % 2 === 0;
        let hit;
        if (isUp) {
          // Apex at top-center, base at bottom
          hit = this.pointInTriangle(px, py,
            left + W / 2, top,
            left,         top + H,
            left + W,     top + H);
        } else {
          // Base at top, apex at bottom-center
          hit = this.pointInTriangle(px, py,
            left,         top,
            left + W,     top,
            left + W / 2, top + H);
        }
        if (hit) return el;
      }
    }
    return null;
  }

  // Cross-product sign test — true if (px,py) is inside triangle (x0,y0),(x1,y1),(x2,y2)
  pointInTriangle(px, py, x0, y0, x1, y1, x2, y2) {
    const d1 = (px - x1) * (y0 - y1) - (x0 - x1) * (py - y1);
    const d2 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
    const d3 = (px - x0) * (y2 - y0) - (x2 - x0) * (py - y0);
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    return !(hasNeg && hasPos);
  }

  clearHighlights() {
    document.querySelectorAll('.space').forEach(el => {
      el.classList.remove('clicked-space', 'new-space');
    });
  }

  hideDiceResult() {
    document.getElementById('dice-result').setAttribute('hidden', '');
  }

  // ── UI updates ─────────────────────────────────────────

  updateUI() {
    document.getElementById('player-turn').textContent =
      `${this.players[this.currentPlayer].name}'s turn`;
    document.getElementById('phase').textContent = 'Attack Phase';
    document.querySelector('.turns').dataset.player = this.currentPlayer;
    document.querySelector('.rules').innerHTML =
      '<h3>Attack Phase</h3><p>Select any of your spaces with at least 2 pirates, then attack an adjacent space. When done, press \'End Phase\'.</p>';
  }

  showWarning(msg) {
    const el = document.getElementById('warning');
    el.textContent = msg;
    el.removeAttribute('hidden');
    clearTimeout(this._warningTimer);
    this._warningTimer = setTimeout(() => el.setAttribute('hidden', ''), 2500);
  }

  updateScores() {
    document.querySelector('.scores').innerHTML = this.playerKeys.map(pk => {
      const count = document.querySelectorAll('.' + pk).length;
      const label = this.players[pk].name;
      return count === 0
        ? `<p>${label}: <em>eliminated</em></p>`
        : `<p>${label}: ${count} island${count !== 1 ? 's' : ''}</p>`;
    }).join('');
  }

  // ── Online ─────────────────────────────────────────────

  async syncOnline() {
    if (!this.onlineMode) return;   // ← no-op for all local games
    const { pushGameState, serializeState } = await import('./online.js');
    await pushGameState(this.roomCode, serializeState(this));
  }

  applyRemoteState(state) {
    // Rebuild every space from the serialized grid
    document.querySelectorAll('.space').forEach((el, i) => {
      const { owner, units } = state.grid[i];
      el.className = 'space' + (owner ? ' ' + owner : '');
      el.innerHTML = '<h2>' + units + '</h2>';
    });

    // Restore turn/phase variables
    this.currentPlayerIndex = state.currentPlayerIndex;
    this.currentPhase       = state.currentPhase;
    this.gameRound          = state.gameRound;
    this.activePlayers      = state.activePlayers;
    this.clickedIndex1      = state.clickedIndex1;
    this.clickedIndex2      = state.clickedIndex2;
    this.newSoldiers        = state.newSoldiers;
    this.currentPlayer      = this.activePlayers[this.currentPlayerIndex];

    // Re-apply selection highlights
    document.querySelectorAll('.clicked-space, .new-space')
      .forEach(el => el.classList.remove('clicked-space', 'new-space'));
    if (state.clickedIndex1 >= 0) {
      document.getElementById('space-' + state.clickedIndex1)
        ?.classList.add('clicked-space');
      this.getAdjacentIndices(state.clickedIndex1).forEach(idx => {
        const adj = document.getElementById('space-' + idx);
        if (adj && !adj.classList.contains(this.currentPlayer))
          adj.classList.add('new-space');
      });
    }

    this.updateUI();
    this.updateScores();
  }

  // ── Bot ────────────────────────────────────────────────

  isBotTurn() {
    return this.currentPlayer !== 'player1' &&
      this.botDiffs[this.currentPlayer] !== 'off';
  }

  botAttackPhase() {
    if (!this.botActive) return;
    if (this.currentPhase !== 'attack') return;

    const options = this.getBotAttackOptions();

    // Easy: 30% chance to stop attacking early
    if (options.length === 0 || (this.botDiffs[this.currentPlayer] === 'easy' && Math.random() < 0.3)) {
      setTimeout(() => { if (this.botActive) this.hirePhase(); }, BOT_DELAY);
      return;
    }

    const attack = this.pickBotAttack(options);
    if (!attack) {
      // Hard mode: no favorable attacks remain — go to hire
      setTimeout(() => { if (this.botActive) this.hirePhase(); }, BOT_DELAY);
      return;
    }

    // Briefly highlight the attacker so the human can follow along
    const fromEl = document.getElementById('space-' + attack.fromIdx);
    fromEl.classList.add('clicked-space');

    setTimeout(() => {
      if (!this.botActive) return;
      if (this.currentPhase !== 'attack') return;

      this.clickedIndex1 = attack.fromIdx;
      this.clickedUnits1 = attack.fromUnits;
      this.clickedIndex2 = attack.toIdx;
      this.clickedUnits2 = attack.toUnits;
      this.attackPhase(); // handles dice, claimLand, UI update; also calls clearHighlights

      setTimeout(() => { if (this.botActive) this.botAttackPhase(); }, BOT_DELAY);
    }, BOT_DELAY);
  }

  getBotAttackOptions() {
    const options = [];
    document.querySelectorAll('.' + this.currentPlayer).forEach(el => {
      const fromIdx   = parseInt(el.id.replace('space-', ''), 10);
      const fromUnits = parseInt(el.textContent.trim(), 10);
      if (fromUnits < 2) return;

      this.getAdjacentIndices(fromIdx).forEach(toIdx => {
        const toEl = document.getElementById('space-' + toIdx);
        if (!toEl || toEl.classList.contains(this.currentPlayer)) return;
        const toUnits = parseInt(toEl.textContent.trim(), 10);
        options.push({ fromIdx, fromUnits, toIdx, toUnits });
      });
    });
    return options;
  }

  pickBotAttack(options) {
    if (this.botDiffs[this.currentPlayer] === 'easy') {
      return options[Math.floor(Math.random() * options.length)];
    }

    if (this.botDiffs[this.currentPlayer] === 'medium') {
      const empty = options.filter(o => o.toUnits === 0);
      if (empty.length) return empty[Math.floor(Math.random() * empty.length)];
      const favorable = options.filter(o => o.fromUnits > o.toUnits);
      if (favorable.length) return favorable[Math.floor(Math.random() * favorable.length)];
      return options[Math.floor(Math.random() * options.length)];
    }

    // Hard: maximize expected gain
    const empty = options.filter(o => o.toUnits === 0);
    if (empty.length) {
      // Attack empty space from strongest source
      return empty.reduce((best, o) => o.fromUnits > best.fromUnits ? o : best);
    }
    const favorable = options.filter(o => o.fromUnits > o.toUnits);
    if (favorable.length) {
      // Pick highest fromUnits - toUnits margin
      return favorable.reduce((best, o) =>
        (o.fromUnits - o.toUnits) > (best.fromUnits - best.toUnits) ? o : best);
    }
    // No favorable attack — bot stops attacking
    return null;
  }

  botHirePhase() {
    if (!this.botActive) return;
    if (this.currentPhase !== 'hire') return;

    if (this.newSoldiers <= 0) {
      setTimeout(() => { if (this.botActive) this.endOfRound(); }, BOT_DELAY);
      return;
    }

    const target = this.pickBotHireTarget();
    if (target) this.handleHireClick(target);

    setTimeout(() => this.botHirePhase(), BOT_HIRE_DELAY);
  }

  pickBotHireTarget() {
    const owned = Array.from(document.querySelectorAll('.' + this.currentPlayer));

    if (this.botDiffs[this.currentPlayer] === 'easy') {
      return owned[Math.floor(Math.random() * owned.length)];
    }

    // Frontline: spaces adjacent to at least one enemy space
    const frontline = owned.filter(el => {
      const idx = parseInt(el.id.replace('space-', ''), 10);
      return this.getAdjacentIndices(idx).some(adjIdx => {
        const adjEl = document.getElementById('space-' + adjIdx);
        return adjEl && this.playerKeys.some(pk =>
          pk !== this.currentPlayer && adjEl.classList.contains(pk));
      });
    });

    if (this.botDiffs[this.currentPlayer] === 'medium') {
      if (frontline.length) return frontline[Math.floor(Math.random() * frontline.length)];
      return owned[Math.floor(Math.random() * owned.length)];
    }

    // Hard: reinforce weakest frontline space
    if (frontline.length) {
      return frontline.reduce((weakest, el) =>
        parseInt(el.textContent.trim(), 10) < parseInt(weakest.textContent.trim(), 10) ? el : weakest);
    }
    // Fallback: lowest-unit owned space
    return owned.reduce((lowest, el) =>
      parseInt(el.textContent.trim(), 10) < parseInt(lowest.textContent.trim(), 10) ? el : lowest);
  }
}

  // ── Setup event listeners ──────────────────────────────

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      startGame(parseInt(btn.dataset.cols, 10));
    });
  });

  function updateBotControlVisibility(numPlayers) {
    document.querySelectorAll('.p3-control').forEach(el =>
      el.style.display = numPlayers >= 3 ? 'flex' : 'none');
    document.querySelectorAll('.p4-control').forEach(el =>
      el.style.display = numPlayers >= 4 ? 'flex' : 'none');
  }

  document.querySelectorAll('.player-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentNumPlayers = parseInt(btn.dataset.num, 10);
      document.querySelectorAll('.player-btn').forEach(b =>
        b.classList.toggle('active', b === btn));
      updateBotControlVisibility(currentNumPlayers);
      startGame(currentCols);
    });
  });

  document.querySelectorAll('.shape-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentShape = btn.dataset.shape;
      document.querySelectorAll('.shape-btn').forEach(b =>
        b.classList.toggle('active', b === btn));
      startGame(currentCols);
    });
  });

  document.querySelectorAll('.bot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pk = 'player' + btn.dataset.player;
      currentBotDiffs[pk] = btn.dataset.diff;
      document.querySelectorAll(`.bot-btn[data-player="${btn.dataset.player}"]`).forEach(b =>
        b.classList.toggle('active', b === btn));
      startGame(currentCols);
    });
  });

  updateBotControlVisibility(currentNumPlayers);
  startGame(4); // auto-start with default 4×4

}); // DOMContentLoaded
