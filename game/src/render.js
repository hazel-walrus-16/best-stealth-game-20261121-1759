// Shadow Vault — render: everything drawn on the canvas. Dark, moody, readable
// at a glance: guards pop against the floor, vision cones glow yellow (red
// when alarmed), cover is obvious, the exit is a lit green doorway.
import { TILE, COLS, ROWS, PALETTE, TUNING } from './config.js';
import { tileHash } from './world.js';
import { conePolygon } from './vision.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  draw(game, time) {
    const ctx = this.ctx;
    const { world, player, guards, coins, levelIndex } = game;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this._drawFloor(ctx, world);
    this._drawExit(ctx, world, time);
    this._drawShards(ctx, world, time);
    this._drawCover(ctx, world, time);
    this._drawWalls(ctx, world);
    this._drawCones(ctx, world, guards, time);
    this._drawCoins(ctx, coins);
    this._drawGuards(ctx, guards, time);
    this._drawPlayer(ctx, player, time);
    this._drawVignette(ctx);
    if (levelIndex === 0 && game.elapsed < 6 && game.phase === 'playing') {
      this._drawHint(ctx, game.levelDef.hint);
    }
  }

  _drawFloor(ctx, world) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = world.grid[y][x];
        if (c === '#') continue;
        const h = tileHash(x, y);
        ctx.fillStyle = h > 0.5 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        if (h > 0.92) {
          ctx.fillStyle = 'rgba(255,255,255,0.03)';
          ctx.fillRect(x * TILE + 4, y * TILE + 4, 5, 5);
        }
        ctx.strokeStyle = PALETTE.floorEdge;
        ctx.lineWidth = 1;
        ctx.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE, TILE);
      }
    }
  }

  _drawWalls(ctx, world) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (world.grid[y][x] !== '#') continue;
        const px = x * TILE;
        const py = y * TILE;
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(px, py, TILE, 5);
        ctx.fillStyle = PALETTE.wallDark;
        ctx.fillRect(px, py + TILE - 4, TILE, 4);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE, TILE);
      }
    }
  }

  _drawCover(ctx, world, time) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = world.grid[y][x];
        const px = x * TILE;
        const py = y * TILE;
        if (c === 'C') {
          ctx.fillStyle = PALETTE.crate;
          ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
          ctx.strokeStyle = PALETTE.crateEdge;
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
          ctx.beginPath();
          ctx.moveTo(px + 3, py + 3);
          ctx.lineTo(px + TILE - 3, py + TILE - 3);
          ctx.moveTo(px + TILE - 3, py + 3);
          ctx.lineTo(px + 3, py + TILE - 3);
          ctx.stroke();
        } else if (c === 'B') {
          // A bush: a dark shadow pool with leafy blobs — the hiding spot.
          ctx.fillStyle = PALETTE.bush;
          ctx.beginPath();
          ctx.ellipse(px + TILE / 2, py + TILE / 2, 17, 14, 0, 0, Math.PI * 2);
          ctx.fill();
          const sway = Math.sin(time * 1.4 + x * 1.7 + y) * 1.2;
          for (const [ox, oy, r, col] of [
            [-7, -4, 7, PALETTE.bushLeaf],
            [6, -6, 6, PALETTE.bushLeaf2],
            [7, 5, 7, PALETTE.bushLeaf],
            [-6, 6, 6, PALETTE.bushLeaf2],
            [0, 0, 6, PALETTE.bushLeaf],
          ]) {
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(px + TILE / 2 + ox + sway, py + TILE / 2 + oy, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  _drawExit(ctx, world, time) {
    const { x, y } = world.exit;
    const pulse = 0.55 + Math.sin(time * 3) * 0.2;
    const grad = ctx.createRadialGradient(x, y, 4, x, y, 46);
    grad.addColorStop(0, `rgba(34, 229, 138, ${pulse})`);
    grad.addColorStop(1, 'rgba(34, 229, 138, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 46, 0, Math.PI * 2);
    ctx.fill();
    // The doorway: a lit green arch with a running figure.
    ctx.fillStyle = PALETTE.exitGlow;
    ctx.fillRect(x - 13, y - 15, 26, 30);
    ctx.fillStyle = PALETTE.exit;
    ctx.fillRect(x - 10, y - 12, 20, 24);
    ctx.fillStyle = '#06281a';
    ctx.beginPath();
    ctx.arc(x, y - 5, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#06281a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 1);
    ctx.lineTo(x, y + 7);
    ctx.moveTo(x, y + 7);
    ctx.lineTo(x - 5, y + 12);
    ctx.moveTo(x, y + 7);
    ctx.lineTo(x + 5, y + 12);
    ctx.moveTo(x, y + 1);
    ctx.lineTo(x + 6, y - 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.exit;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', x, y - 22);
  }

  _drawShards(ctx, world, time) {
    for (const shard of world.shards) {
      if (shard.taken) continue;
      const bob = Math.sin(time * 2.4 + shard.tx) * 2;
      const grad = ctx.createRadialGradient(shard.x, shard.y + bob, 2, shard.x, shard.y + bob, 18);
      grad.addColorStop(0, 'rgba(57, 213, 255, 0.5)');
      grad.addColorStop(1, 'rgba(57, 213, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(shard.x, shard.y + bob, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(shard.x, shard.y + bob);
      ctx.rotate(Math.PI / 4 + Math.sin(time * 1.8 + shard.tx) * 0.15);
      ctx.fillStyle = PALETTE.shard;
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    }
  }

  _drawCones(ctx, world, guards, time) {
    for (const guard of guards) {
      const hot = guard.alertLevel === 2;
      const warm = guard.alertLevel === 1;
      const base = hot ? PALETTE.coneHot : PALETTE.cone;
      const pts = conePolygon(world, guard.x, guard.y, guard.facing, TUNING.visionRange, TUNING.visionHalfAngle);
      const grad = ctx.createRadialGradient(guard.x, guard.y, 8, guard.x, guard.y, TUNING.visionRange);
      const alpha = hot ? 0.5 : warm ? 0.38 : 0.26;
      grad.addColorStop(0, `rgba(${base}, ${alpha})`);
      grad.addColorStop(1, `rgba(${base}, 0.02)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fill();
      // Cone rim, brighter when the guard is suspicious.
      ctx.strokeStyle = `rgba(${base}, ${hot ? 0.85 : warm ? 0.6 : 0.35})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.stroke();
    }
  }

  _drawGuards(ctx, guards, time) {
    for (const guard of guards) {
      const bob = Math.sin(guard.walkPhase) * 1.5;
      // Shadow blob under the guard.
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(guard.x, guard.y + 9, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Body: a red-uniformed guard, facing shown by the visor wedge.
      ctx.fillStyle = PALETTE.guardDark;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y + bob * 0.3, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.guard;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y + bob * 0.3, 11, 0, Math.PI * 2);
      ctx.fill();
      const fx = Math.cos(guard.facing);
      const fy = Math.sin(guard.facing);
      ctx.fillStyle = '#ffd9d4';
      ctx.beginPath();
      ctx.arc(guard.x + fx * 5, guard.y + fy * 5 + bob * 0.3, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b0d0a';
      ctx.beginPath();
      ctx.arc(guard.x + fx * 7, guard.y + fy * 7 + bob * 0.3, 2.4, 0, Math.PI * 2);
      ctx.fill();
      // Helmet brim.
      ctx.strokeStyle = PALETTE.guardDark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y + bob * 0.3, 11, guard.facing - 1.1, guard.facing + 1.1);
      ctx.stroke();
      // Suspicion meter above the head.
      if (guard.suspicion > 0.05) {
        const w = 30;
        const x = guard.x - w / 2;
        const y = guard.y - 26 + bob * 0.3;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(x - 1, y - 1, w + 2, 7);
        ctx.fillStyle = guard.suspicion >= 1 ? '#ff3b2f' : guard.suspicion >= TUNING.suspiciousAt ? '#ffb02e' : '#ffe27a';
        ctx.fillRect(x, y, w * guard.suspicion, 5);
      }
      // "!" when alarmed, "?" when suspicious.
      if (guard.state === 'alarmed') {
        this._drawMark(ctx, guard.x, guard.y - 34, '!', '#ff3b2f');
      } else if (guard.state === 'suspicious' || guard.state === 'investigate') {
        this._drawMark(ctx, guard.x, guard.y - 34, '?', '#ffb02e');
      }
    }
  }

  _drawMark(ctx, x, y, text, color) {
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  _drawCoins(ctx, coins) {
    for (const coin of coins) {
      if (coin.t >= coin.dur) {
        // Landed: a gold coin with a faint ring where it clinked.
        ctx.strokeStyle = 'rgba(255, 217, 77, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 10 + Math.sin(coin.t * 6) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      const p = Math.min(1, coin.t / coin.dur);
      const cx = coin.fromX + (coin.x - coin.fromX) * p;
      const cy = coin.fromY + (coin.y - coin.fromY) * p - Math.sin(p * Math.PI) * 34;
      ctx.fillStyle = PALETTE.coin;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a6d00';
      ctx.font = 'bold 7px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', cx, cy + 2.5);
    }
  }

  _drawPlayer(ctx, player, time) {
    // Shadow blob.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 9, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    const bob = player.moving ? Math.sin(time * 14) * 1 : 0;
    // A soft light pool around the infiltrator so they read at a glance.
    const glow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 40);
    glow.addColorStop(0, 'rgba(47, 214, 195, 0.20)');
    glow.addColorStop(1, 'rgba(47, 214, 195, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 40, 0, Math.PI * 2);
    ctx.fill();
    // Body: hooded infiltrator in teal.
    ctx.fillStyle = PALETTE.playerDark;
    ctx.beginPath();
    ctx.arc(player.x, player.y + bob * 0.4, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(player.x, player.y + bob * 0.4, 10, 0, Math.PI * 2);
    ctx.fill();
    const fx = Math.cos(player.facing);
    const fy = Math.sin(player.facing);
    ctx.fillStyle = '#062a26';
    ctx.beginPath();
    ctx.arc(player.x + fx * 4, player.y + fy * 4 + bob * 0.4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Sneak = crouched: draw a smaller, dimmer ring.
    if (player.sneaking) {
      ctx.strokeStyle = 'rgba(47, 214, 195, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (player.hiddenInBush) {
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#bfe9c8';
      ctx.fillText('HIDDEN', player.x, player.y - 20);
    }
  }

  _drawVignette(ctx) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.85);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  _drawHint(ctx, hint) {
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const w = ctx.measureText(hint).width + 24;
    ctx.fillStyle = 'rgba(5,8,16,0.82)';
    ctx.fillRect((this.canvas.width - w) / 2, this.canvas.height - 34, w, 24);
    ctx.fillStyle = '#cdd6ea';
    ctx.fillText(hint, this.canvas.width / 2, this.canvas.height - 17);
  }
}
