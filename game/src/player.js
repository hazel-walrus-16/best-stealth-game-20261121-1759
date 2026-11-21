// Shadow Vault — player: movement, sneaking, coin throws, shards and the exit.
import { TILE, TUNING } from './config.js';

export class Player {
  constructor(world) {
    this.world = world;
    this.reset();
  }

  reset() {
    this.x = this.world.playerStart.x;
    this.y = this.world.playerStart.y;
    this.r = 11;
    this.facing = 0;
    this.moving = false;
    this.sneaking = false;
    this.coins = TUNING.coinCount;
    this.shards = 0;
    this.stepPhase = 0;
  }

  get tileX() {
    return Math.floor(this.x / TILE);
  }

  get tileY() {
    return Math.floor(this.y / TILE);
  }

  get hiddenInBush() {
    return this.world.isBushTile(this.tileX, this.tileY);
  }

  update(dt, input, onStep) {
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    this.moving = dx !== 0 || dy !== 0;
    this.sneaking = !!input.sneak;
    if (!this.moving) return;
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    const speed = this.sneaking ? TUNING.playerSneak : TUNING.playerWalk;
    const moved = this.world.moveCircle(this.x, this.y, dx * speed * dt, dy * speed * dt, this.r);
    const actuallyMoved = Math.hypot(moved.x - this.x, moved.y - this.y);
    this.x = moved.x;
    this.y = moved.y;
    this.facing = Math.atan2(dy, dx);
    if (actuallyMoved > 0.5) {
      this.stepPhase += actuallyMoved;
      // A soft footstep tick every ~26 px walked (further apart while sneaking).
      const stride = this.sneaking ? 34 : 26;
      if (this.stepPhase >= stride) {
        this.stepPhase = 0;
        onStep(this.sneaking);
      }
    }
  }

  // Throw a coin toward a point: returns the landing spot, or null if refused.
  throwCoin(tx, ty) {
    if (this.coins <= 0) return null;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > TUNING.coinThrowRange || dist < 20) return null;
    this.coins--;
    return { x: tx, y: ty, t: 0, dur: 0.45, fromX: this.x, fromY: this.y };
  }

  collectShards() {
    for (const shard of this.world.shards) {
      if (shard.taken) continue;
      const d = Math.hypot(shard.x - this.x, shard.y - this.y);
      if (d < 24) {
        shard.taken = true;
        this.shards++;
        return shard;
      }
    }
    return null;
  }

  atExit() {
    return Math.hypot(this.world.exit.x - this.x, this.world.exit.y - this.y) < 26;
  }
}
