// Shadow Vault — main: game loop, phases, HUD, overlays and level flow.
// Phases: title -> playing -> (leveldone -> next level) -> win, or caught.
// A caught player restarts the level; nothing is ever an instant fail.
import { LEVELS, VIEW_W, VIEW_H, TUNING } from './config.js';
import { World } from './world.js';
import { Guard } from './guards.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { Renderer } from './render.js';
import { applyShot } from './shots.js';

const $ = (id) => document.getElementById(id);

export class Game {
  constructor() {
    this.canvas = $('game');
    this.canvas.width = VIEW_W;
    this.canvas.height = VIEW_H;
    this.renderer = new Renderer(this.canvas);
    this.audio = new AudioEngine();
    this.input = new Input(this.canvas, (x, y) => this.onCanvasClick(x, y));
    this.phase = 'title';
    this.levelIndex = 0;
    this.score = 0;
    this.totalTime = 0;
    this.elapsed = 0;
    this.coins = []; // coins in flight / landed {x, y, t, dur, fromX, fromY}
    this.frozen = false; // screenshot mode: render, but do not simulate
    this.time = 0;
    this.alarmFlash = 0;
    this._last = 0;
    this._maxSuspicion = 0;
    this._wasAlarmed = false;
    this._spottedPlayed = false;
    this._bindButtons();
    this._loadLevel(0);
    this._showOverlay('title');
    this._updateHud();
    window.addEventListener('keydown', (e) => this._onKey(e));
  }

  _bindButtons() {
    $('btn-start').addEventListener('click', () => this.startGame(0));
    for (const b of document.querySelectorAll('[data-level]')) {
      b.addEventListener('click', () => this.startGame(Number(b.dataset.level)));
    }
    $('btn-next').addEventListener('click', () => this.startGame(this.levelIndex + 1));
    $('btn-retry').addEventListener('click', () => this.startGame(this.levelIndex));
    $('btn-again').addEventListener('click', () => this.startGame(0));
    $('btn-title').addEventListener('click', () => this.toTitle());
    $('btn-resume').addEventListener('click', () => this.togglePause(false));
    $('btn-restart').addEventListener('click', () => this.startGame(this.levelIndex));
    $('btn-mute').addEventListener('click', () => this._toggleMute());
  }

  _onKey(e) {
    const k = e.key.toLowerCase();
    if (k === 'm') this._toggleMute();
    if (k === 'p' || k === 'escape') {
      if (this.phase === 'playing') this.togglePause(true);
      else if (this.phase === 'paused') this.togglePause(false);
    }
    if (k === 'enter') {
      if (this.phase === 'title') this.startGame(0);
      else if (this.phase === 'leveldone') this.startGame(this.levelIndex + 1);
      else if (this.phase === 'caught') this.startGame(this.levelIndex);
      else if (this.phase === 'win') this.startGame(0);
    }
    if (k === 'r' && (this.phase === 'caught' || this.phase === 'win')) {
      this.startGame(this.phase === 'win' ? 0 : this.levelIndex);
    }
  }

  _toggleMute() {
    const muted = this.audio.toggleMute();
    $('btn-mute').textContent = muted ? '🔇 Sound off' : '🔊 Sound on';
  }

  _loadLevel(index) {
    this.levelIndex = index;
    this.levelDef = LEVELS[index];
    this.world = new World(this.levelDef);
    this.player = new Player(this.world);
    this.guards = this.levelDef.guards.map((g) => new Guard(g, this.world));
    this.coins = [];
    this.elapsed = 0;
    this._maxSuspicion = 0;
    this._wasAlarmed = false;
    this._spottedPlayed = false;
    this.caughtGuard = null;
  }

  startGame(index) {
    this.audio.ensure();
    if (index === 0 && this.phase !== 'leveldone') this.score = 0;
    if (index === 0) this.totalTime = 0;
    this._loadLevel(index);
    this.phase = 'playing';
    this._showOverlay(null);
    this._updateHud();
  }

  toTitle() {
    this._loadLevel(0);
    this.phase = 'title';
    this._showOverlay('title');
    this._updateHud();
  }

  togglePause(on) {
    if (on && this.phase === 'playing') {
      this.phase = 'paused';
      this._showOverlay('pause');
    } else if (!on && this.phase === 'paused') {
      this.phase = 'playing';
      this._showOverlay(null);
    }
  }

  onCanvasClick(x, y) {
    if (this.phase !== 'playing' || this.frozen) return;
    this.audio.ensure();
    const coin = this.player.throwCoin(x, y);
    if (!coin) return;
    this.audio.coinThrow();
    this.coins.push(coin);
  }

  _showOverlay(name) {
    for (const id of ['title', 'level', 'win', 'caught', 'pause']) {
      $(`overlay-${id}`).classList.toggle('hidden', id !== name);
    }
  }

  _updateHud() {
    $('hud-level').textContent = this.levelDef.name;
    $('hud-shards').textContent = `◆ ${this.player.shards}/${this.world.shards.length}`;
    $('hud-coins').textContent = `● ${this.player.coins}`;
    $('hud-score').textContent = `Score ${this.score}`;
    const mins = Math.floor(this.elapsed / 60);
    const secs = Math.floor(this.elapsed % 60);
    $('hud-time').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const maxS = this.guards.reduce((m, g) => Math.max(m, g.suspicion), 0);
    $('suspicion-fill').style.width = `${Math.round(maxS * 100)}%`;
    $('suspicion-fill').style.background =
      maxS >= 1 ? '#ff3b2f' : maxS >= TUNING.suspiciousAt ? '#ffb02e' : '#ffe27a';
    const anyAlarmed = this.guards.some((g) => g.state === 'alarmed');
    const banner = $('alert-banner');
    banner.classList.toggle('hidden', !anyAlarmed && this.phase !== 'caught');
    if (anyAlarmed) banner.textContent = '⚠ ALARM — break line of sight and hide!';
  }

  _onAlarm(guard) {
    this.audio.alert();
    this._updateHud();
  }

  _onCaught(guard) {
    this.caughtGuard = guard;
    this.phase = 'caught';
    this.audio.caught();
    $('caught-detail').textContent =
      `A guard caught you in the open on ${this.levelDef.name}. ` +
      `You had ${this.player.shards} shard${this.player.shards === 1 ? '' : 's'} and ${this.score} points.`;
    this._showOverlay('caught');
    this._updateHud();
  }

  _onLevelComplete() {
    const timeBonus = Math.max(0, 300 - Math.floor(this.elapsed) * 2);
    this.score += TUNING.levelBonus + timeBonus;
    this.totalTime += this.elapsed;
    this.audio.win();
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.phase = 'win';
      $('win-detail').textContent =
        `All three vaults cleared in ${this._fmtTime(this.totalTime)} — ` +
        `${this.player.shards} shards this level, ${this.score} points in all. The vault is yours.`;
      this._showOverlay('win');
    } else {
      this.phase = 'leveldone';
      $('level-detail').textContent =
        `${this.levelDef.name} cleared in ${this._fmtTime(this.elapsed)} — ` +
        `+${TUNING.levelBonus} level bonus, +${timeBonus} time bonus. Score: ${this.score}.`;
      this._showOverlay('level');
    }
    this._updateHud();
  }

  _fmtTime(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  update(dt) {
    if (this.phase !== 'playing') return;
    this.elapsed += dt;
    this.time += dt;
    this.player.update(dt, this.input, (sneaking) => this.audio.step(sneaking));
    const shard = this.player.collectShards();
    if (shard) {
      this.score += TUNING.shardScore;
      this.audio.pickup();
    }
    // Coins: fly, land with a clink, lure nearby guards.
    for (const coin of this.coins) {
      coin.t += dt;
      if (!coin.landed && coin.t >= coin.dur) {
        coin.landed = true;
        this.audio.coinClink();
        for (const g of this.guards) g.hearCoin(coin.x, coin.y);
      }
    }
    this.coins = this.coins.filter((c) => c.t < c.dur + 3.5);
    const events = { alarm: (g) => this._onAlarm(g) };
    let caught = false;
    for (const guard of this.guards) {
      if (guard.update(dt, this.player, events)) caught = true;
    }
    this._maxSuspicion = this.guards.reduce((m, g) => Math.max(m, g.suspicion), 0);
    // One soft "spotted" blip per approach, not one per frame.
    if (this._maxSuspicion >= TUNING.suspiciousAt && this._maxSuspicion < 1 && !this._spottedPlayed) {
      this.audio.spotted();
      this._spottedPlayed = true;
    }
    if (this._maxSuspicion < 0.2) this._spottedPlayed = false;
    if (caught) {
      this._onCaught(this.guards.find((g) => g.caughtTimer >= TUNING.caughtGrace));
      return;
    }
    if (this.player.atExit()) this._onLevelComplete();
    this._updateHud();
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this._last) / 1000 || 0.016);
    this._last = now;
    // A bug in one update must never kill the loop: log it and keep playing.
    try {
      if (!this.frozen) this.update(dt);
      else this.time += dt;
    } catch (err) {
      console.error('Shadow Vault update error:', err);
    }
    this.renderer.draw(this, this.time);
    requestAnimationFrame((t) => this.frame(t));
  }

  start() {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot) {
      applyShot(this, shot);
      this._showOverlay(shot === 'win' ? 'win' : null);
      if (shot === 'win') {
        $('win-detail').textContent =
          'All three vaults cleared — the vault is yours. Score: 1,150.';
      }
    }
    requestAnimationFrame((t) => this.frame(t));
  }
}

const game = new Game();
window.__game = game;
game.start();
