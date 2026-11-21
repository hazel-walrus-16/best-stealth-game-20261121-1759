// Shadow Vault — vision: cone raycasts and the "can this guard see the player" test.
import { TILE, TUNING } from './config.js';

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// March a ray from (x, y) until it hits sight-blocking geometry or maxDist.
export function castRay(world, x, y, angle, maxDist) {
  const step = 4;
  const dx = Math.cos(angle) * step;
  const dy = Math.sin(angle) * step;
  let cx = x;
  let cy = y;
  let travelled = 0;
  while (travelled < maxDist) {
    cx += dx;
    cy += dy;
    travelled += step;
    if (world.blocksSight(Math.floor(cx / TILE), Math.floor(cy / TILE))) break;
  }
  return { x: cx, y: cy, dist: Math.min(travelled, maxDist) };
}

// The visible wedge of a guard: a fan of ray endpoints around facing.
export function conePolygon(world, x, y, facing, range, halfAngle, rays = 26) {
  const pts = [{ x, y }];
  for (let i = 0; i <= rays; i++) {
    const a = facing - halfAngle + (2 * halfAngle * i) / rays;
    pts.push(castRay(world, x, y, a, range));
  }
  return pts;
}

// Is the player spotted by this guard right now?
// Sneaking shrinks the effective range; hiding in a bush only fails at very
// close range; crates and walls break the line of sight.
export function guardSeesPlayer(world, guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  const range = player.sneaking
    ? TUNING.visionRange * 0.82
    : TUNING.visionRange;
  if (dist > range) return { seen: false, dist, closeness: 0 };
  const toPlayer = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(toPlayer, guard.facing)) > TUNING.visionHalfAngle) {
    return { seen: false, dist, closeness: 0 };
  }
  if (!world.hasLineOfSight(guard.x, guard.y, player.x, player.y)) {
    return { seen: false, dist, closeness: 0 };
  }
  const playerTileX = Math.floor(player.x / TILE);
  const playerTileY = Math.floor(player.y / TILE);
  if (world.isBushTile(playerTileX, playerTileY) && dist > TUNING.bushHideRange) {
    return { seen: false, dist, closeness: 0 };
  }
  const closeness = 1 - dist / range; // 0 at the edge, 1 on top of the guard
  return { seen: true, dist, closeness };
}
