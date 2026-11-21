// Shadow Vault — configuration: palette, tuning and the three levels.
// Every level is a tile map (30 columns x 19 rows) plus guard patrol routes.
// Map legend: '#' wall, '.' floor, 'C' crate (cover, blocks sight + movement),
// 'B' bush / shadow (walkable, hides the player), 'S' data shard (optional
// collectible), 'E' exit, 'P' player start, '1'..'5' guard spawns.
export const TILE = 32;
export const COLS = 30;
export const ROWS = 19;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 608

export const PALETTE = {
  floorA: '#1c2436',
  floorB: '#181f30',
  floorEdge: '#232c42',
  wall: '#39415c',
  wallTop: '#4d5878',
  wallDark: '#232a3e',
  crate: '#6b4f2a',
  crateEdge: '#8a6a3c',
  bush: '#14301f',
  bushLeaf: '#1f4d2e',
  bushLeaf2: '#2a6b3c',
  exit: '#22e58a',
  exitGlow: '#0e5c38',
  shard: '#39d5ff',
  coin: '#ffd94d',
  player: '#2fd6c3',
  playerDark: '#0f7d72',
  guard: '#ff5a4e',
  guardDark: '#8f1d16',
  cone: '255, 214, 90',
  coneHot: '255, 84, 60',
  text: '#e8ecf5',
  dim: '#8b94ab',
};

export const TUNING = {
  playerWalk: 150,
  playerSneak: 88,
  guardPatrol: 68,
  guardChase: 148,
  guardInvestigate: 105,
  visionRange: 195,
  visionHalfAngle: 0.62, // ~35.5 degrees each side
  bushHideRange: 58, // a guard closer than this still spots you in a bush
  suspicionGain: 1.35, // per second at point blank, standing, fully in cone
  suspicionDecay: 0.4,
  suspiciousAt: 0.35, // guard stops and stares
  sneakGainFactor: 0.45,
  alarmDuration: 7, // seconds guards stay alarmed after last sighting
  caughtGrace: 1.25, // seconds of close-range sight before you are caught
  catchRange: 34,
  coinCount: 3,
  coinThrowRange: 280,
  coinLureRadius: 210,
  shardScore: 100,
  levelBonus: 250,
};

export const LEVELS = [
  {
    name: 'Level 1 — The Lobby',
    hint: 'Slip past the patrols and reach the green exit. Bushes hide you; crates block sight.',
    map: [
      '##############################',
      '#P.....#.............#.....S.#',
      '#......#..C......B...#.......#',
      '#......#.............#...C...#',
      '#......#.....####....#...3...#',
      '#......#.............#.......#',
      '#..B...#..S......C...#..C....#',
      '#......#.............#.......#',
      '#............................#',
      '#.......................####.#',
      '#..C......B.......C.....B..S.#',
      '#.............#..............#',
      '#..###........#......#.......#',
      '#.............#..###.#.......#',
      '#..S......C...#....B.#..C....#',
      '#.............#......#.......#',
      '#........1....#..2...#.....E.#',
      '#.............#......#.......#',
      '##############################',
    ],
    guards: [
      { spawn: [9, 16], waypoints: [[9, 16], [9, 9], [12, 9], [12, 16]] },
      { spawn: [17, 16], waypoints: [[17, 16], [17, 10], [20, 10], [20, 16]] },
      { spawn: [25, 4], waypoints: [[25, 4], [25, 7], [27, 7], [27, 13]] },
    ],
  },
  {
    name: 'Level 2 — The Gallery',
    hint: 'Four guards now, tighter sightlines. Toss a coin (click) to pull a guard away.',
    map: [
      '##############################',
      '#P.....#..B...#.......#....S.#',
      '#......#......#..C....#......#',
      '#...C..#......#####...#..C...#',
      '#......#......#.......#......#',
      '#......#S.....#.......#..B...#',
      '#...4..#....C.........#......#',
      '#...................C........#',
      '#.B#......#.............3....#',
      '#..#......#.......#..........#',
      '#..#...C..#..C....#........S.#',
      '#..#......#.......#..........#',
      '#.......B.#.......#.....####.#',
      '#....####.........#....C.....#',
      '#.................#..........#',
      '#..........C........B....#...#',
      '#.S.....1......2.........#.E.#',
      '#........................#...#',
      '##############################',
    ],
    guards: [
      { spawn: [8, 16], waypoints: [[8, 16], [8, 9], [12, 9], [12, 16]] },
      { spawn: [15, 16], waypoints: [[15, 16], [15, 6], [17, 6], [17, 16]] },
      { spawn: [24, 8], waypoints: [[24, 8], [24, 15], [27, 15], [27, 8]] },
      { spawn: [4, 6], waypoints: [[4, 6], [4, 14], [6, 14], [6, 6]] },
    ],
  },
  {
    name: 'Level 3 — The Vault',
    hint: 'Five guards, one vault, no mistakes. Sneak (Shift) to stay unseen longer.',
    map: [
      '##############################',
      '#P....#..B..#......#.....#.S.#',
      '#.....#.....#..C...#.....#...#',
      '#..C..#.....#......#....C#...#',
      '#.....#.....#####..#.B...#...#',
      '#.....#SC...#......#.....#...#',
      '#.....#.....#......#.........#',
      '#.....#.......C....#.......4.#',
      '#.B#........B.......C........#',
      '#..#.....#............#......#',
      '#..#.....#......#.....#.B....#',
      '#........#......#.....#...CS.#',
      '#...####.#.C....#.....#......#',
      '#........#......#.C...#......#',
      '#.5......#......#.......####.#',
      '#.....B.........#............#',
      '#.S.....1.....2......3.....E.#',
      '#............................#',
      '##############################',
    ],
    guards: [
      { spawn: [8, 16], waypoints: [[8, 16], [8, 7], [11, 7], [11, 16]] },
      { spawn: [14, 16], waypoints: [[14, 16], [14, 5], [18, 5], [18, 16]] },
      { spawn: [21, 16], waypoints: [[21, 16], [21, 9], [23, 9], [23, 16]] },
      { spawn: [27, 7], waypoints: [[27, 7], [27, 12], [24, 12], [24, 7]] },
      { spawn: [2, 14], waypoints: [[2, 14], [2, 9], [4, 9], [4, 14]] },
    ],
  },
];
