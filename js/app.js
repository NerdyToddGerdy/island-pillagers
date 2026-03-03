'use strict';

document.addEventListener('DOMContentLoaded', () => {

const GRID_SIZE = 16;
const COLS = 4;

class Game {
  constructor() {
    this.toggle        = true;       // true = player1's turn
    this.currentPlayer = 'player1';
    this.otherPlayer   = 'player2';
    this.currentPhase  = 'attack';   // 'attack' | 'hire'
    this.gameRound     = 1;
    this.clickedIndex1 = -1;
    this.clickedIndex2 = -1;
    this.clickedUnits1 = 0;
    this.clickedUnits2 = 0;
    this.newSoldiers   = 0;
    this.players = {
      player1: { name: 'Player 1' },
      player2: { name: 'Player 2' },
    };

    // Cached DOM references
    this.mapEl    = document.querySelector('.map');
    this.buttonEl = document.querySelector('.button');
  }

  // ── Bootstrap ──────────────────────────────────────────

  init() {
    // Single stable listener on the map — no per-space .on()/.off() needed
    this.mapEl.addEventListener('click', e => {
      const space = e.target.closest('.space');
      if (space) this.handleSpaceClick(space);
    });

    // Single stable button listener — reads currentPhase to decide what to do
    this.buttonEl.addEventListener('click', () => {
      if (this.currentPhase === 'attack') this.hirePhase();
      else if (this.currentPhase === 'hire') this.endOfRound();
    });

    this.startAttackPhase();
  }

  // ── Turn management ────────────────────────────────────

  startAttackPhase() {
    this.currentPhase = 'attack';
    this.hideDiceResult();
    this.clearHighlights();
    this.clickedIndex1 = -1;
    this.clickedIndex2 = -1;

    if (this.toggle) {
      this.currentPlayer = 'player1';
      this.otherPlayer   = 'player2';
    } else {
      this.currentPlayer = 'player2';
      this.otherPlayer   = 'player1';
    }

    this.updateUI();
    this.updateScores();
  }

  hirePhase() {
    this.checkForWinner();
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
  }

  endOfRound() {
    this.clearHighlights();
    this.toggle = !this.toggle;
    this.gameRound += this.toggle ? 1 : 0; // increment at start of player1's turn
    document.getElementById('round-counter').textContent = `Round ${this.gameRound}`;
    this.startAttackPhase();
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
        swal({
          title: 'Not enough soldiers!',
          text: 'You need at least 2 pirates to attack. Pick another island or end the phase.',
          type: 'warning',
          confirmButtonText: 'Aye aye!'
        });
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
    }
  }

  claimLand() {
    const movingUnits = Math.ceil(this.clickedUnits1 / 2);
    const remainingUnits = this.clickedUnits1 - movingUnits;

    const fromEl = document.getElementById('space-' + this.clickedIndex1);
    const toEl   = document.getElementById('space-' + this.clickedIndex2);

    toEl.classList.remove(this.otherPlayer);
    toEl.classList.add(this.currentPlayer);
    fromEl.innerHTML = `<h2>${remainingUnits}</h2>`;
    toEl.innerHTML   = `<h2>${movingUnits}</h2>`;

    this.clickedIndex1 = -1;
    this.clickedIndex2 = -1;
    this.updateScores();
  }

  // ── Win condition ──────────────────────────────────────

  checkForWinner() {
    const p1count = document.querySelectorAll('.player1').length;
    const p2count = document.querySelectorAll('.player2').length;

    let winner = null;
    if (p1count === GRID_SIZE) winner = 'player1';
    else if (p2count === GRID_SIZE) winner = 'player2';

    if (winner) {
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
    const row = Math.floor(index / COLS);
    const col = index % COLS;
    const adj = [];
    if (row > 0)        adj.push(index - COLS); // up
    if (row < COLS - 1) adj.push(index + COLS); // down
    if (col > 0)        adj.push(index - 1);    // left
    if (col < COLS - 1) adj.push(index + 1);    // right
    return adj;
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
    const playerLabel = this.currentPlayer === 'player1' ? 'Player 1' : 'Player 2';
    document.getElementById('player-turn').textContent = `${playerLabel}'s turn`;
    document.getElementById('phase').textContent = 'Attack Phase';
    document.querySelector('.turns').dataset.player = this.currentPlayer;
    document.querySelector('.rules').innerHTML =
      '<h3>Attack Phase</h3><p>Select any of your spaces with at least 2 pirates, then attack an adjacent space. When done, press \'End Phase\'.</p>';
  }

  updateScores() {
    const p1 = document.querySelectorAll('.player1').length;
    const p2 = document.querySelectorAll('.player2').length;
    document.querySelector('.scores').innerHTML =
      `<p>Player 1's islands: ${p1}</p><p>Player 2's islands: ${p2}</p>`;
  }
}

const game = new Game();
game.init();

}); // DOMContentLoaded
