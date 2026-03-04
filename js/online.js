// Firebase 10 ESM utilities for room management and game state sync.
// Nothing in app.js imports this yet — groundwork for online multiplayer.

import { initializeApp }                              from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getDatabase, ref, set, get, update, onValue } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
import { firebaseConfig }                              from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

// ── Room code ───────────────────────────────────────────

const ADJECTIVES = [
  'JOLLY', 'BRAVE', 'SALTY', 'CURSED', 'GOLDEN',
  'DREAD', 'IRON', 'SAVAGE', 'MIGHTY', 'WICKED',
];

/** Returns a random room code like `JOLLY-4821`. */
export function generateRoomCode() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}-${num}`;
}

// ── Room lifecycle ──────────────────────────────────────

/**
 * Creates a new room in Firebase.
 * @param {string} code - Room code from generateRoomCode()
 * @param {{ cols: number, numPlayers: number, shape: string }} settings
 */
export async function createRoom(code, settings) {
  await set(ref(db, `rooms/${code}`), {
    host:        'player1',
    settings,
    players:     { player1: true },
    gameStarted: false,
    gameState:   null,
    createdAt:   Date.now(),
  });
}

/**
 * Claims the next open player slot in a room.
 * @param {string} code
 * @returns {Promise<string>} Slot key e.g. `'player2'`
 */
export async function joinRoom(code) {
  const snapshot = await get(ref(db, `rooms/${code}`));
  if (!snapshot.exists()) throw new Error(`Room "${code}" not found`);

  const room   = snapshot.val();
  const taken  = Object.keys(room.players || {});
  const slot   = ['player1', 'player2', 'player3', 'player4'].find(s => !taken.includes(s));
  if (!slot) throw new Error(`Room "${code}" is full`);

  await update(ref(db, `rooms/${code}/players`), { [slot]: true });
  return slot;
}

/** Sets `rooms/{code}/gameStarted = true`. */
export async function markGameStarted(code) {
  await update(ref(db, `rooms/${code}`), { gameStarted: true });
}

// ── Real-time sync ──────────────────────────────────────

/**
 * Subscribes to all changes on a room.
 * @param {string} code
 * @param {(room: object) => void} cb  Called with the full room snapshot on every change.
 * @returns {() => void} Unsubscribe function
 */
export function subscribeToRoom(code, cb) {
  return onValue(ref(db, `rooms/${code}`), snapshot => cb(snapshot.val()));
}

/**
 * Writes a serialized game state to `rooms/{code}/gameState`.
 * @param {string} code
 * @param {object} state  Plain object from serializeState()
 */
export async function pushGameState(code, state) {
  await set(ref(db, `rooms/${code}/gameState`), state);
}

// ── State serialization ─────────────────────────────────

/**
 * Reads a Game instance + the live DOM and returns a plain-object snapshot
 * suitable for writing to Firebase.
 *
 * @param {import('./app.js').Game} game
 * @returns {{
 *   currentPlayerIndex: number,
 *   currentPhase: string,
 *   gameRound: number,
 *   activePlayers: string[],
 *   clickedIndex1: number,
 *   clickedIndex2: number,
 *   newSoldiers: number,
 *   grid: Array<{ owner: string|null, units: number }>
 * }}
 */
export function serializeState(game) {
  const grid = Array.from({ length: game.gridSize }, (_, i) => {
    const el    = document.getElementById('space-' + i);
    const owner = game.playerKeys.find(pk => el.classList.contains(pk)) ?? null;
    const units = parseInt(el.querySelector('h2').textContent.trim(), 10);
    return { owner, units };
  });

  return {
    currentPlayerIndex: game.currentPlayerIndex,
    currentPhase:       game.currentPhase,
    gameRound:          game.gameRound,
    activePlayers:      [...game.activePlayers],
    clickedIndex1:      game.clickedIndex1,
    clickedIndex2:      game.clickedIndex2,
    newSoldiers:        game.newSoldiers,
    grid,
  };
}
