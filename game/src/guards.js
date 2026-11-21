// Shadow Vault — guards: patrol routes, suspicion, alarm, chase and recovery.
// A guard never fails you on first sight: suspicion has to fill, and once the
// alarm sounds the guards chase your last seen spot, then calm down and go
// back to their patrols when they lose you.
import { TILE, TUNING } from './config.js';
import { angleDiff, guardSeesPlayer } from './vision.js';

export const GUARD_STATES = ['patrol', 'suspicious', 'alarmed', 'investigate', 'return'];

export class Guard {
  constructor(def, world) {
    this.world = world;
    const [sx, sy] = def.spawn;
    this.x = sx * TILE + TILE / 2;
    this.y = sy * TILE + TILE / 2;
    this.waypoints = def.waypoints.map(([wx, wy]) => ({
      x: wx * TILE + TILE / 2,
      y: wy * TILE + TILE / 2,
    }));
    this.wpIndex = 0;
    this.facing = -Math.PI / 2; // face up the map to start
    this.state = 'patrol';
    this.suspicion = 0;
    this.lastSeen = null; // {x, y} of the player when last spotted
    this.alarmTimer = 0;
    this.lookTimer = 0;
    this.path = null; // pixel waypoints from findPath
    this.pathIndex = 0;
    this.scanAngle = 0;
    this.walkPhase = 0;
    this.caughtTimer = 0;
  }

  setPathTo(tx, ty) {
    this.path = this.world.findPath(this.x, this.y, tx, ty);
    this.pathIndex = 0;
  }

  followPath(dt, speed) {
    if (!this.path || this.pathIndex >= this.path.length) return true;
    const target = this.path[this.pathIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) {
      this.pathIndex++;
      return this.pathIndex >= this.path.length;
    }
    const step = Math.min(dist, speed * dt);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.faceToward(target.x, target.y, dt, 8);
    this.walkPhase += dt * speed * 0.06;
    return false;
  }

  faceToward(tx, ty, dt, turnRate) {
    const want = Math.atan2(ty - this.y, tx - this.x);
    const d = angleDiff(want, this.facing);
    const maxTurn = turnRate * dt;
    this.facing += Math.max(-maxTurn, Math.min(maxTurn, d));
  }

  update(dt, player, events) {
    const seen = guardSeesPlayer(this.world, this, player);
    if (seen.seen) {
      const gainRate = TUNING.suspicionGain * (0.35 + 0.85 * seen.closeness);
      const factor = player.sneaking ? TUNING.sneakGainFactor : 1;
      this.suspicion = Math.min(1, this.suspicion + gainRate * factor * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.alarmTimer = TUNING.alarmDuration;
    } else if (this.state !== 'alarmed' && this.state !== 'investigate') {
      this.suspicion = Math.max(0, this.suspicion - TUNING.suspicionDecay * dt);
    }

    if (this.suspicion >= 1 && this.state !== 'alarmed') {
      this.state = 'alarmed';
      this.alarmTimer = TUNING.alarmDuration;
      this.setPathTo(this.lastSeen.x, this.lastSeen.y);
      events.alarm(this);
    }

    switch (this.state) {
      case 'patrol': {
        if (this.suspicion >= TUNING.suspiciousAt) {
          this.state = 'suspicious';
          this.lookTimer = 0.9;
          break;
        }
        const wp = this.waypoints[this.wpIndex];
        if (!this.path) this.setPathTo(wp.x, wp.y);
        if (this.followPath(dt, TUNING.guardPatrol)) {
          this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
          this.path = null;
          // Pause and scan at each waypoint before moving on.
          this.state = 'suspicious';
          this.lookTimer = 0.7;
          this.scanAngle = this.facing;
        }
        break;
      }
      case 'suspicious': {
        // Stop, stare toward the player (or scan), then decide.
        if (this.lastSeen && this.suspicion >= TUNING.suspiciousAt) {
          this.faceToward(this.lastSeen.x, this.lastSeen.y, dt, 5);
        } else {
          this.facing += Math.sin(this.lookTimer * 4) * dt * 0.8;
        }
        this.lookTimer -= dt;
        if (this.lookTimer <= 0) {
          if (this.suspicion >= TUNING.suspiciousAt && this.lastSeen) {
            this.state = 'investigate';
            this.setPathTo(this.lastSeen.x, this.lastSeen.y);
          } else {
            this.state = 'patrol';
          }
        }
        break;
      }
      case 'alarmed': {
        this.alarmTimer -= dt;
        if (seen.seen) {
          // Keep chasing the fresh position while the player is visible.
          this.setPathTo(player.x, player.y);
        }
        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
        if (seen.seen && distToPlayer < 45) {
          // Cornered: the guard stands over the player and the caught
          // timer below finishes the job. Do not wander off to investigate.
          this.faceToward(player.x, player.y, dt, 8);
          break;
        }
        const arrived = this.followPath(dt, TUNING.guardChase);
        if (arrived || this.alarmTimer <= 0) {
          if (this.alarmTimer <= 0) {
            this.state = 'return';
            this.suspicion = 0.4;
            this.setPathTo(this.waypoints[this.wpIndex].x, this.waypoints[this.wpIndex].y);
          } else if (!seen.seen) {
            // Reached the last seen spot and the player is not there:
            // look around, then give up.
            this.state = 'investigate';
            this.lookTimer = 1.6;
          } else {
            // Still looking right at the player: keep chasing.
            this.setPathTo(player.x, player.y);
          }
        }
        break;
      }
      case 'investigate': {
        this.lookTimer -= dt;
        this.facing += dt * 1.6; // sweep the area
        if (this.lookTimer <= 0) {
          this.state = 'return';
          this.suspicion = Math.max(0, this.suspicion - 0.5);
          const wp = this.waypoints[this.wpIndex];
          this.setPathTo(wp.x, wp.y);
        }
        break;
      }
      case 'return': {
        if (this.followPath(dt, TUNING.guardPatrol)) {
          this.state = 'patrol';
          this.path = null;
          this.suspicion = 0;
        }
        break;
      }
      default:
        this.state = 'patrol';
    }

    // Being caught needs a close-range, sustained sighting while alarmed —
    // a guard merely glimpsing you across the room never ends the run.
    const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
    if (this.state === 'alarmed' && seen.seen && distToPlayer < TUNING.visionRange * 0.55) {
      this.caughtTimer += dt;
    } else {
      this.caughtTimer = Math.max(0, this.caughtTimer - dt * 2);
    }
    return this.caughtTimer >= TUNING.caughtGrace;
  }

  // A thrown coin pulls this guard toward the clink if it is close enough.
  hearCoin(cx, cy) {
    const d = Math.hypot(cx - this.x, cy - this.y);
    if (d > TUNING.coinLureRadius) return false;
    if (this.state === 'alarmed') return false;
    this.state = 'investigate';
    this.lookTimer = 2.2;
    this.lastSeen = { x: cx, y: cy };
    this.setPathTo(cx, cy);
    return true;
  }

  get alertLevel() {
    if (this.state === 'alarmed') return 2;
    if (this.state === 'investigate' || this.suspicion >= TUNING.suspiciousAt) return 1;
    return 0;
  }
}
