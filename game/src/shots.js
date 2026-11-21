// Shadow Vault — shots: deterministic staged states for the hand-in screenshots.
// Used only through ?shot=<name> in the page URL. The simulation is frozen
// after staging, so every render of the same shot looks the same.
//   start — the level as it opens: player at the door, guards on patrol, cones out
//   play  — sneaking behind a crate while a guard's cone sweeps past, half-spotted
//   alarm — the alarm: red cone, suspicion full, a guard closing in
//   win   — the infiltrator on the exit, vault cleared
import { TILE, TUNING } from './config.js';

function placePlayer(game, tx, ty, facing = 0, sneaking = false) {
  game.player.x = tx * TILE + TILE / 2;
  game.player.y = ty * TILE + TILE / 2;
  game.player.facing = facing;
  game.player.sneaking = sneaking;
  game.player.moving = false;
}

function placeGuard(game, i, tx, ty, facing, state, suspicion) {
  const g = game.guards[i];
  g.x = tx * TILE + TILE / 2;
  g.y = ty * TILE + TILE / 2;
  g.facing = facing;
  g.state = state;
  g.suspicion = suspicion;
  g.path = null;
  g.alarmTimer = TUNING.alarmDuration;
  g.lastSeen = { x: game.player.x, y: game.player.y };
  return g;
}

export function applyShot(game, shot) {
  game.frozen = true;
  game.phase = 'playing';
  game.elapsed = 47; // a mid-run clock, so the HUD reads like real play
  game.score = 240;
  // Make sure the level behind the shot is level 1.
  if (game.levelIndex !== 0) game._loadLevel(0);
  game.player.shards = 1;
  game.world.shards[0].taken = true;

  if (shot === 'start') {
    // Opening view: player at the entrance, three guards on patrol with
    // their cones sweeping the rooms.
    placePlayer(game, 1, 1, 0);
    placeGuard(game, 0, 9, 16, -Math.PI / 2, 'patrol', 0);
    placeGuard(game, 1, 17, 16, -Math.PI / 2, 'patrol', 0);
    placeGuard(game, 2, 25, 4, Math.PI, 'patrol', 0);
    game.elapsed = 0;
    game.score = 0;
    game.player.shards = 0;
    game.world.shards[0].taken = false;
  } else if (shot === 'play') {
    // Sneaking behind the crate at (10, 2) while guard 1's cone sweeps by.
    // Guard 1 patrols the left hall; put it mid-patrol, half-suspicious.
    placePlayer(game, 9, 3, Math.PI / 2, true);
    placeGuard(game, 0, 9, 6, -Math.PI / 2, 'suspicious', 0.55);
    placeGuard(game, 1, 17, 14, Math.PI, 'patrol', 0.1);
    placeGuard(game, 2, 25, 7, Math.PI / 2, 'patrol', 0);
    game.coins = [];
  } else if (shot === 'alarm') {
    // Spotted in the open: guard 1 alarmed and closing in, cone red.
    placePlayer(game, 12, 9, Math.PI, false);
    const g1 = placeGuard(game, 0, 12, 11, -Math.PI / 2, 'alarmed', 1);
    g1.caughtTimer = 0.7;
    placeGuard(game, 1, 17, 10, Math.PI, 'investigate', 0.8);
    placeGuard(game, 2, 25, 7, Math.PI / 2, 'patrol', 0.2);
    game.coins = [{ x: 15 * TILE + 16, y: 12 * TILE + 16, t: 0.6, dur: 0.45, fromX: 12 * TILE + 16, fromY: 9 * TILE + 16, landed: true }];
  } else if (shot === 'win') {
    // On the exit, vault cleared.
    placePlayer(game, 27, 16, 0);
    placeGuard(game, 0, 9, 9, Math.PI / 2, 'patrol', 0);
    placeGuard(game, 1, 20, 14, -Math.PI / 2, 'patrol', 0);
    placeGuard(game, 2, 25, 7, Math.PI, 'patrol', 0);
    game.phase = 'win';
    game.score = 1150;
  }
  game._updateHud();
  window.__shotReady = true;
}
