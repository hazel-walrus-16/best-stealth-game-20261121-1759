// Shadow Vault — world: tile grid, collision, line of sight and pathfinding.
import { TILE, COLS, ROWS } from './config.js';

// A small deterministic hash so floor tiles get a stable shade variation.
export function tileHash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  h = (h ^ (h >> 16)) >>> 0;
  return h / 4294967295;
}

export class World {
  constructor(levelDef) {
    this.def = levelDef;
    this.grid = levelDef.map.map((row) => row.split(''));
    this.shards = [];
    this.playerStart = { x: 0, y: 0 };
    this.exit = { x: 0, y: 0 };
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = this.grid[y][x];
        if (c === 'P') this.playerStart = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
        if (c === 'E') this.exit = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 };
        if (c === 'S') this.shards.push({ tx: x, ty: y, x: x * TILE + TILE / 2, y: y * TILE + TILE / 2, taken: false });
      }
    }
  }

  tileAtPixel(px, py) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
    return this.grid[ty][tx];
  }

  isSolidTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
    const c = this.grid[ty][tx];
    return c === '#' || c === 'C';
  }

  // Walls and crates block a guard's gaze; bushes and shards do not.
  blocksSight(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
    const c = this.grid[ty][tx];
    return c === '#' || c === 'C';
  }

  isBushTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
    return this.grid[ty][tx] === 'B';
  }

  // Move a circle by (dx, dy), sliding along solid tiles, axis by axis.
  moveCircle(x, y, dx, dy, r) {
    let nx = x + dx;
    if (this.circleHits(nx, y, r)) nx = x;
    let ny = y + dy;
    if (this.circleHits(nx, ny, r)) ny = y;
    return { x: nx, y: ny };
  }

  circleHits(px, py, r) {
    const x0 = Math.floor((px - r) / TILE);
    const x1 = Math.floor((px + r) / TILE);
    const y0 = Math.floor((py - r) / TILE);
    const y1 = Math.floor((py + r) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!this.isSolidTile(tx, ty)) continue;
        const cx = Math.max(tx * TILE, Math.min(px, tx * TILE + TILE));
        const cy = Math.max(ty * TILE, Math.min(py, ty * TILE + TILE));
        const ddx = px - cx;
        const ddy = py - cy;
        if (ddx * ddx + ddy * ddy < r * r) return true;
      }
    }
    return false;
  }

  // Straight-line sight between two pixel points, sampled every 4 px.
  hasLineOfSight(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 4));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.blocksSight(Math.floor((x0 + dx * t) / TILE), Math.floor((y0 + dy * t) / TILE))) return false;
    }
    return true;
  }

  // Breadth-first path over walkable tiles; returns pixel waypoints (tile centres).
  findPath(sx, sy, tx, ty) {
    const start = { x: Math.floor(sx / TILE), y: Math.floor(sy / TILE) };
    const goal = { x: Math.floor(tx / TILE), y: Math.floor(ty / TILE) };
    if (start.x === goal.x && start.y === goal.y) return [{ x: tx, y: ty }];
    if (this.isSolidTile(goal.x, goal.y)) return null;
    const key = (x, y) => y * COLS + x;
    const prev = new Map();
    const queue = [start];
    prev.set(key(start.x, start.y), null);
    while (queue.length) {
      const cur = queue.shift();
      if (cur.x === goal.x && cur.y === goal.y) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (this.isSolidTile(nx, ny) || prev.has(key(nx, ny))) continue;
        prev.set(key(nx, ny), cur);
        queue.push({ x: nx, y: ny });
      }
    }
    if (!prev.has(key(goal.x, goal.y))) return null;
    const tiles = [];
    let cur = goal;
    while (cur) {
      tiles.push(cur);
      cur = prev.get(key(cur.x, cur.y));
    }
    tiles.reverse();
    tiles.shift(); // drop the tile we already stand on
    const points = tiles.map((t) => ({ x: t.x * TILE + TILE / 2, y: t.y * TILE + TILE / 2 }));
    points.push({ x: tx, y: ty });
    return points;
  }
}
