import type {
  AchievementDef,
  Difficulty,
  EnemyKind,
  PolicyChoice,
  StageId,
  TowerBaseType,
  TowerBranch,
  TowerPad,
  TowerStat,
  Vec2,
  WaveDef,
} from './types';

export const LOGICAL_W = 1280;
export const LOGICAL_H = 720;

export const CASTLE_POS: Vec2 = { x: 1165, y: 342 };
export const CASTLE_SIGN_POS: Vec2 = { x: 1165, y: 208 };

export const INITIAL_GOLD = 260;
export const INITIAL_LIVES = 20;

export interface DifficultyTuning {
  hpMult: number;
  speedMult: number;
  startGold: number;
  alarmMult: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyTuning> = {
  normal: { hpMult: 1.0, speedMult: 1.0, startGold: INITIAL_GOLD, alarmMult: 1.0 },
  crunch: { hpMult: 1.22, speedMult: 1.08, startGold: 245, alarmMult: 1.0 },
  gdpr: { hpMult: 1.42, speedMult: 1.14, startGold: 235, alarmMult: 1.15 },
};

// Fallback title/desc fields are kept for backward compatibility; runtime UI/Canvas
// text is localized across all 18 languages via `t(lang, 'policy.<id>.title|desc')`.
export const POLICY_POOL: PolicyChoice[] = [
  {
    id: 'star_patch',
    icon: 'star',
    titleZh: '30秒弹窗讨星',
    titleEn: '30s Star Beggar',
    descZh: '每拦1个开发者 +4$',
    descEn: '+$4 per blocked dev.',
  },
  {
    id: 'vip_first_class',
    icon: 'briefcase',
    titleZh: 'VIP 贵宾通道',
    titleEn: 'VIP Fast Lane',
    descZh: 'VIP 移速+25%、多给+45$，炸跑多罚+25$',
    descEn: 'VIPs +25% faster, +$45 pay, +$25 fine if hit.',
  },
  {
    id: 'vacuum_carpet',
    icon: 'eraser',
    titleZh: '假删扩容地毯',
    titleEn: 'Bottomless Rug',
    descZh: '地毯冷却-8s，撑爆后晕眩1.8s',
    descEn: 'Rug CD -8s. Burst stuns 1.8s.',
  },
  {
    id: 'rage_overclock',
    icon: 'zap',
    titleZh: '全员红温加班',
    titleEn: 'Crunch Overclock',
    descZh: '全塔攻速+16%，波次警报每秒+0.35%',
    descEn: 'Towers +16% faster. Alarm +0.35%/s.',
  },
  {
    id: 'pr_insurance',
    icon: 'lifeBuoy',
    titleZh: '危机公关险',
    titleEn: 'PR Insurance',
    descZh: '城堡回4血，领主满血且上限+80',
    descEn: '+4 Castle HP. Hero +80 max HP & heal.',
  },
  {
    id: 'stealth_pipes',
    icon: 'eyeOff',
    titleZh: '隐藏埋点管',
    titleEn: 'Stealth Pipes',
    descZh: '偷数据多赚+35%，警报少涨6%',
    descEn: 'Steal Data +35% cash, -6% alarm.',
  },
];

// Fallback title/desc fields are kept for backward compatibility; runtime UI
// text is localized across all 18 languages via `t(lang, 'ach.<id>.title|desc')`.
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_vip',
    icon: 'award',
    titleZh: '红毯金牌陪跑',
    titleEn: 'Red-Carpet Escort',
    descZh: '派领主陪跑大厂 VIP 拿双倍赞助。',
    descEn: 'Escort a Golden VIP with Theo for 2x pay.',
  },
  {
    id: 'carpet_combo',
    icon: 'layers',
    titleZh: '扫进地毯',
    titleEn: 'Master Sweeper',
    descZh: '单次地毯扫 4 名敌人或 2 滩日志。',
    descEn: 'Sweep 4+ devs or 2+ leak logs in one Rug.',
  },
  {
    id: 'carpet_nuke',
    icon: 'flame',
    titleZh: '凌晨清场',
    titleEn: '4 AM Clean-Up',
    descZh: '地毯炸开 4.5s 内删推炸中至少 2 人。',
    descEn: 'Drop 4AM Delete within 4.5s of a rug burst (2+ hits).',
  },
  {
    id: 'all_branches',
    icon: 'castle',
    titleZh: '全栈造势',
    titleEn: 'Full-Stack Hype',
    descZh: '单局建齐 4 种塔并升 2 座满级塔。',
    descEn: 'Build all 4 tower types and 2+ Lv.3 towers.',
  },
  {
    id: 'zero_vip_harm',
    icon: 'shieldCheck',
    titleZh: '金主零差评',
    titleEn: 'Investor Relations',
    descZh: '0 次误伤 VIP 通关第 10 波。',
    descEn: 'Clear Wave 10 with 0 VIPs scared off.',
  },
  {
    id: 'true_mit_saint',
    icon: 'feather',
    titleZh: '真·开源圣人',
    titleEn: 'True MIT Saint',
    descZh: '0 次偷数据且 0 伤 VIP 通关。',
    descEn: 'Clear Wave 10 with 0 Steal Data and 0 VIP hits.',
  },
  {
    id: 'gdpr_slayer',
    icon: 'scale',
    titleZh: '罚单粉碎机',
    titleEn: 'Fine Shredder',
    descZh: '正面击溃第 10 波 GDPR 巨装。',
    descEn: 'Defeat the Wave 10 EU GDPR Boss.',
  },
  {
    id: 'endless_15',
    icon: 'infinity',
    titleZh: '审计钉子户',
    titleEn: 'Audit Survivor',
    descZh: '无尽审计模式打到第 15 波。',
    descEn: 'Reach Wave 15 in Endless Audit.',
  },
  {
    id: 'canyon_master',
    icon: 'landmark',
    titleZh: '峡谷控场',
    titleEn: 'Canyon Boss',
    descZh: '通关第 2 关欧盟审计峡谷。',
    descEn: 'Clear Stage 2: EU Audit Canyon.',
  },
  {
    id: 'trilogy_lord',
    icon: 'crown',
    titleZh: '三部曲霸主',
    titleEn: 'Trilogy Emperor',
    descZh: '通关全部 3 关战役。',
    descEn: 'Clear all 3 campaign stages.',
  },
];

export const VIP_PAYOUT = 80;
export const VIP_ESCORT_PAYOUT = 160;
export const VIP_PENALTY = 60;

export const SKILL_CDS = {
  steal: 20,
  rug: 30,
  delete: 45,
  apology: 28,
} as const;

// Smooth multi-bend Kingdom Rush pathways that merge at center choke, split around island, and rejoin at castle gate
export const RAW_PATHS: [Vec2[], Vec2[]] = [
  // Lane 0: Upper Open-Source Trail
  [
    { x: -30, y: 208 },
    { x: 135, y: 208 },
    { x: 255, y: 238 },
    { x: 375, y: 348 },
    { x: 585, y: 348 },
    { x: 695, y: 214 },
    { x: 878, y: 214 },
    { x: 978, y: 348 },
    { x: 1118, y: 348 },
  ],
  // Lane 1: Lower Community Market Loop (active from Wave 3+)
  [
    { x: -30, y: 525 },
    { x: 165, y: 525 },
    { x: 295, y: 472 },
    { x: 375, y: 348 },
    { x: 585, y: 348 },
    { x: 708, y: 492 },
    { x: 895, y: 492 },
    { x: 978, y: 348 },
    { x: 1118, y: 348 },
  ],
];

export interface SampledPath {
  points: Vec2[];
  cumDist: number[];
  totalLength: number;
}

function catmullRom(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

function buildSmoothPath(raw: Vec2[], stepsPerSeg = 18): SampledPath {
  const pts: Vec2[] = [];
  for (let i = 0; i < raw.length - 1; i++) {
    const p0 = raw[Math.max(0, i - 1)];
    const p1 = raw[i];
    const p2 = raw[i + 1];
    const p3 = raw[Math.min(raw.length - 1, i + 2)];
    for (let s = 0; s < stepsPerSeg; s++) {
      pts.push(catmullRom(p0, p1, p2, p3, s / stepsPerSeg));
    }
  }
  pts.push(raw[raw.length - 1]);

  const cumDist: number[] = [0];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    total += Math.hypot(dx, dy);
    cumDist.push(total);
  }
  return { points: pts, cumDist, totalLength: total };
}

export const SAMPLED_PATHS: [SampledPath, SampledPath] = [
  buildSmoothPath(RAW_PATHS[0]),
  buildSmoothPath(RAW_PATHS[1]),
];

function samplePathListAt(
  paths: [SampledPath, SampledPath],
  lane: 0 | 1,
  dist: number,
  laneOffset = 0
): { x: number; y: number; nx: number; ny: number } {
  const path = paths[lane];
  const clamped = Math.max(0, Math.min(path.totalLength, dist));
  let lo = 0;
  let hi = path.cumDist.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (path.cumDist[mid] <= clamped) lo = mid;
    else hi = mid;
  }
  const d0 = path.cumDist[lo];
  const d1 = path.cumDist[hi];
  const frac = d1 > d0 ? (clamped - d0) / (d1 - d0) : 0;
  const a = path.points[lo];
  const b = path.points[hi];
  const tx = b.x - a.x;
  const ty = b.y - a.y;
  const len = Math.hypot(tx, ty) || 1;
  const nx = -ty / len;
  const ny = tx / len;
  return {
    x: a.x + tx * frac + nx * laneOffset,
    y: a.y + ty * frac + ny * laneOffset,
    nx,
    ny,
  };
}

function closestRoadSampleInPaths(
  paths: [SampledPath, SampledPath],
  x: number,
  y: number
): { x: number; y: number; tx: number; ty: number; nx: number; ny: number; distToRoad: number } {
  let bestDist = Infinity;
  let bestX = x;
  let bestY = y;
  let bestTx = 1;
  let bestTy = 0;
  for (const path of paths) {
    const pts = path.points;
    for (let i = 0; i < pts.length; i += 2) {
      const p = pts[i];
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestDist) {
        bestDist = d;
        bestX = p.x;
        bestY = p.y;
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(pts.length - 1, i + 1)];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        bestTx = dx / len;
        bestTy = dy / len;
      }
    }
  }
  return {
    x: bestX,
    y: bestY,
    tx: bestTx,
    ty: bestTy,
    nx: -bestTy,
    ny: bestTx,
    distToRoad: bestDist,
  };
}

export function samplePathAt(lane: 0 | 1, dist: number, laneOffset = 0): { x: number; y: number; nx: number; ny: number } {
  return samplePathListAt(SAMPLED_PATHS, lane, dist, laneOffset);
}

export function closestPointOnRoads(x: number, y: number): { x: number; y: number; distToRoad: number } {
  const s = closestRoadSample(x, y);
  return { x: s.x, y: s.y, distToRoad: s.distToRoad };
}

export function closestRoadSample(
  x: number,
  y: number
): { x: number; y: number; tx: number; ty: number; nx: number; ny: number; distToRoad: number } {
  return closestRoadSampleInPaths(SAMPLED_PATHS, x, y);
}

export const TOWER_PADS: TowerPad[] = [
  { id: 'p1', x: 205, y: 360, defaultRally: { x: 255, y: 245 } },
  { id: 'p2', x: 335, y: 162, defaultRally: { x: 310, y: 278 } },
  { id: 'p3', x: 342, y: 562, defaultRally: { x: 325, y: 448 } },
  { id: 'p4', x: 486, y: 248, defaultRally: { x: 486, y: 348 } },
  { id: 'p5', x: 492, y: 472, defaultRally: { x: 492, y: 348 } },
  { id: 'p6', x: 792, y: 350, defaultRally: { x: 792, y: 214 } },
  { id: 'p7', x: 792, y: 122, defaultRally: { x: 792, y: 214 } },
  { id: 'p8', x: 808, y: 585, defaultRally: { x: 808, y: 492 } },
  { id: 'p9', x: 1018, y: 242, defaultRally: { x: 1018, y: 348 } },
];

export const TOWER_STATS: Record<
  TowerBaseType,
  { lv1: TowerStat; lv2: TowerStat; lv3a: TowerStat; lv3b: TowerStat }
> = {
  barracks: {
    lv1: { cost: 70, range: 148, damage: 8, cooldown: 0.92, guardHp: 90, guardDamage: 8, guardArmor: 0.08, guardRespawn: 8.2 },
    lv2: { cost: 110, range: 158, damage: 13, cooldown: 0.82, guardHp: 145, guardDamage: 14, guardArmor: 0.24, guardRespawn: 7.2 },
    lv3a: { cost: 180, range: 168, damage: 20, cooldown: 0.82, guardHp: 265, guardDamage: 20, guardArmor: 0.58, guardRespawn: 6.5 },
    lv3b: { cost: 180, range: 174, damage: 22, cooldown: 0.62, guardHp: 190, guardDamage: 22, guardArmor: 0.30, guardRespawn: 6.2 },
  },
  archer: {
    lv1: { cost: 70, range: 178, damage: 13, cooldown: 0.70 },
    lv2: { cost: 100, range: 198, damage: 22, cooldown: 0.58 },
    lv3a: { cost: 165, range: 215, damage: 16, cooldown: 0.23 },
    lv3b: { cost: 175, range: 325, damage: 82, cooldown: 1.42, slowAmount: 0.35, slowDuration: 2.2 },
  },
  mage: {
    lv1: { cost: 100, range: 172, damage: 28, cooldown: 1.20 },
    lv2: { cost: 140, range: 195, damage: 46, cooldown: 1.08, slowAmount: 0.2, slowDuration: 1.5 },
    lv3a: { cost: 200, range: 215, damage: 64, cooldown: 0.98, slowAmount: 0.3, slowDuration: 2.0 },
    lv3b: { cost: 210, range: 220, damage: 64, cooldown: 1.10 },
  },
  artillery: {
    lv1: { cost: 125, range: 188, damage: 36, cooldown: 2.25, splashRadius: 70 },
    lv2: { cost: 165, range: 205, damage: 60, cooldown: 2.05, splashRadius: 80 },
    lv3a: { cost: 230, range: 225, damage: 42, cooldown: 2.15, splashRadius: 68 },
    lv3b: { cost: 235, range: 225, damage: 112, cooldown: 2.45, splashRadius: 104 },
  },
};

export function getTowerStat(type: TowerBaseType, level: 1 | 2 | 3, branch: TowerBranch): TowerStat {
  const s = TOWER_STATS[type];
  if (level === 1) return s.lv1;
  if (level === 2) return s.lv2;
  return branch === 'b' ? s.lv3b : s.lv3a;
}

export interface EnemyArchetype {
  kind: EnemyKind;
  hp: number;
  speed: number;
  armor: number;
  magicResist: number;
  reward: number;
  lifeCost: number;
  radius: number;
  attackDamage: number;
  isBoss: boolean;
  nameZh: string;
  nameEn: string;
}

export const ENEMY_ARCHETYPES: Record<EnemyKind, EnemyArchetype> = {
  dev: {
    kind: 'dev',
    hp: 64,
    speed: 48,
    armor: 0,
    magicResist: 0,
    reward: 12,
    lifeCost: 1,
    radius: 17,
    attackDamage: 7,
    isBoss: false,
    nameZh: '提 Bug 开发者',
    nameEn: 'Bug Reporter',
  },
  fork: {
    kind: 'fork',
    hp: 48,
    speed: 82,
    armor: 0,
    magicResist: 0,
    reward: 14,
    lifeCost: 1,
    radius: 16,
    attackDamage: 6,
    isBoss: false,
    nameZh: 'MIT Fork 跑酷者',
    nameEn: 'MIT Fork Runner',
  },
  auditor: {
    kind: 'auditor',
    hp: 160,
    speed: 37,
    armor: 0.62,
    magicResist: 0,
    reward: 24,
    lifeCost: 2,
    radius: 21,
    attackDamage: 14,
    isBoss: false,
    nameZh: '重甲源码审计员',
    nameEn: 'Armored Auditor',
  },
  veteran: {
    kind: 'veteran',
    hp: 148,
    speed: 45,
    armor: 0.1,
    magicResist: 0.65,
    reward: 24,
    lifeCost: 2,
    radius: 20,
    attackDamage: 13,
    isBoss: false,
    nameZh: '硬核开源老兵',
    nameEn: 'OS Veteran',
  },
  gdpr: {
    kind: 'gdpr',
    hp: 2400,
    speed: 25,
    armor: 0.38,
    magicResist: 0.28,
    reward: 250,
    lifeCost: 10,
    radius: 34,
    attackDamage: 36,
    isBoss: true,
    nameZh: 'EU GDPR 监管巨装',
    nameEn: 'EU GDPR Enforcer',
  },
};

function makeSeq(
  items: Array<[number, 0 | 1, EnemyKind | 'vip', number?, number?]>
): WaveDef['events'] {
  // [startDelay, lane, kind, count=1, spacing=1.1]
  const raw: Array<{ t: number; lane: 0 | 1; entityType: EnemyKind | 'vip' }> = [];
  for (const [start, lane, entityType, count = 1, spacing = 1.1] of items) {
    for (let i = 0; i < count; i++) {
      raw.push({ t: start + i * spacing, lane, entityType });
    }
  }
  raw.sort((a, b) => a.t - b.t);
  let prev = 0;
  return raw.map((r) => {
    const delay = Math.max(0, r.t - prev);
    prev = r.t;
    return { delay, lane: r.lane, entityType: r.entityType };
  });
}

export const CAMPAIGN_WAVES: WaveDef[] = [
  {
    waveNumber: 1,
    titleZh: '第一批提 Bug 的普通用户',
    titleEn: 'First Bug Reports',
    events: makeSeq([
      [0.3, 0, 'dev', 4, 1.5],
      [6.8, 0, 'vip', 1, 1],
      [9.0, 0, 'dev', 4, 1.3],
    ]),
  },
  {
    waveNumber: 2,
    titleZh: '免费 MIT Fork 突然出现',
    titleEn: 'Free MIT Forks Appear',
    events: makeSeq([
      [0.3, 0, 'dev', 4, 1.1],
      [4.5, 0, 'fork', 4, 0.95],
      [9.2, 0, 'vip', 1, 1],
      [11.2, 0, 'dev', 4, 1.0],
      [13.8, 0, 'fork', 3, 0.85],
    ]),
  },
  {
    waveNumber: 3,
    titleZh: '双路夹击：下路开源市集开启',
    titleEn: 'Dual Lanes: Community Market Opens',
    events: makeSeq([
      [0.3, 0, 'dev', 5, 1.0],
      [1.2, 1, 'fork', 5, 1.0],
      [6.5, 0, 'vip', 1, 1],
      [8.2, 1, 'dev', 5, 0.9],
      [13.4, 1, 'vip', 1, 1],
      [14.5, 0, 'fork', 5, 0.8],
    ]),
  },
  {
    waveNumber: 4,
    titleZh: '重甲源码审计员进场（快建流量魔塔！）',
    titleEn: 'Armored Code Auditors Arrive!',
    events: makeSeq([
      [0.3, 0, 'auditor', 3, 2.2],
      [1.5, 1, 'dev', 6, 1.0],
      [7.2, 1, 'vip', 1, 1],
      [9.5, 0, 'fork', 5, 0.8],
      [11.5, 1, 'auditor', 2, 2.0],
      [15.0, 0, 'dev', 5, 0.85],
    ]),
  },
  {
    waveNumber: 5,
    titleZh: '黄金 VIP 混行高峰（当心炮塔误伤！）',
    titleEn: 'Rush Hour VIP Escort (Watch AOE!)',
    events: makeSeq([
      [0.2, 0, 'dev', 6, 0.85],
      [1.0, 1, 'fork', 6, 0.8],
      [4.8, 0, 'vip', 1, 1],
      [6.2, 0, 'auditor', 3, 1.7],
      [8.5, 1, 'vip', 1, 1],
      [10.8, 1, 'auditor', 3, 1.6],
      [14.5, 0, 'fork', 6, 0.7],
      [16.0, 1, 'dev', 6, 0.8],
    ]),
  },
  {
    waveNumber: 6,
    titleZh: '高魔抗硬核开源老兵登场',
    titleEn: 'Magic-Resistant OS Veterans',
    events: makeSeq([
      [0.3, 1, 'veteran', 4, 1.8],
      [1.0, 0, 'auditor', 3, 1.8],
      [6.5, 0, 'vip', 1, 1],
      [8.5, 0, 'veteran', 4, 1.6],
      [10.0, 1, 'fork', 7, 0.72],
      [14.5, 1, 'vip', 1, 1],
      [16.0, 1, 'auditor', 3, 1.5],
    ]),
  },
  {
    waveNumber: 7,
    titleZh: '高速 Fork 闪电战 + 重甲推进',
    titleEn: 'Fork Blitz & Heavy Audit',
    events: makeSeq([
      [0.2, 0, 'fork', 8, 0.65],
      [0.8, 1, 'fork', 8, 0.65],
      [6.0, 0, 'vip', 1, 1],
      [7.5, 0, 'auditor', 4, 1.4],
      [8.2, 1, 'veteran', 4, 1.4],
      [14.0, 1, 'vip', 1, 1],
      [15.8, 0, 'veteran', 4, 1.3],
      [16.2, 1, 'auditor', 4, 1.3],
    ]),
  },
  {
    waveNumber: 8,
    titleZh: '物魔双抗大军压境',
    titleEn: 'Dual-Armor Siege',
    events: makeSeq([
      [0.3, 0, 'auditor', 5, 1.35],
      [0.6, 1, 'veteran', 5, 1.35],
      [6.5, 1, 'vip', 1, 1],
      [8.0, 0, 'fork', 9, 0.6],
      [9.5, 1, 'dev', 8, 0.65],
      [14.0, 0, 'vip', 1, 1],
      [15.5, 0, 'veteran', 5, 1.2],
      [16.0, 1, 'auditor', 5, 1.2],
    ]),
  },
  {
    waveNumber: 9,
    titleZh: '决战前夜：大厂豪掷千金 + 全面审校',
    titleEn: 'Eve of Reckoning',
    events: makeSeq([
      [0.2, 0, 'vip', 1, 1],
      [1.2, 0, 'auditor', 5, 1.25],
      [1.2, 1, 'veteran', 5, 1.25],
      [6.8, 1, 'vip', 1, 1],
      [8.2, 0, 'fork', 10, 0.55],
      [9.0, 1, 'fork', 10, 0.55],
      [14.5, 0, 'vip', 1, 1],
      [16.2, 0, 'auditor', 6, 1.1],
      [16.8, 1, 'veteran', 6, 1.1],
    ]),
  },
  {
    waveNumber: 10,
    titleZh: '最终决战：EU GDPR 监管重装骑士降临！',
    titleEn: 'FINAL BOSS: EU GDPR Sovereign Enforcer!',
    events: makeSeq([
      [0.5, 0, 'gdpr', 1, 1],
      [2.2, 0, 'auditor', 5, 1.6],
      [2.8, 1, 'veteran', 5, 1.5],
      [8.5, 1, 'vip', 1, 1],
      [10.5, 1, 'fork', 10, 0.6],
      [13.5, 0, 'veteran', 4, 1.4],
      [16.5, 0, 'vip', 1, 1],
      [18.5, 1, 'auditor', 5, 1.3],
      [20.0, 0, 'fork', 8, 0.55],
    ]),
  },
];

export function generateEndlessWave(waveNumber: number): WaveDef {
  const tier = Math.max(1, waveNumber - 10);
  const heavyCount = 4 + Math.min(10, tier + Math.floor(tier / 2));
  const heavySpacing = Math.max(0.55, 1.25 - tier * 0.055);
  const forkCount = 6 + Math.min(14, tier * 2);
  const forkSpacing = Math.max(0.42, 0.56 - tier * 0.012);
  const primaryLane = (waveNumber % 2) as 0 | 1;
  const secondaryLane = ((waveNumber + 1) % 2) as 0 | 1;

  const items: Array<[number, 0 | 1, EnemyKind | 'vip', number?, number?]> = [
    [0.3, primaryLane, 'auditor', heavyCount, heavySpacing],
    [0.8, secondaryLane, 'veteran', heavyCount, heavySpacing],
    [5.4, primaryLane, 'vip', 1, 1],
    [6.8, 0, 'fork', forkCount, forkSpacing],
    [8.0, 1, 'fork', forkCount, forkSpacing],
    [13.6, secondaryLane, 'vip', 1, 1],
  ];
  if (tier >= 3) {
    // Late mixed push to keep Endless tactically demanding
    items.push([15.2, secondaryLane, 'auditor', Math.min(6, 2 + Math.floor(tier / 2)), 0.95]);
    items.push([15.8, primaryLane, 'veteran', Math.min(6, 2 + Math.floor(tier / 2)), 0.95]);
  }
  if (waveNumber % 3 === 0) {
    items.push([2.0, primaryLane, 'gdpr', 1, 1]);
    if (tier >= 9) {
      // Wave 21+ double-lane GDPR enforcers!
      items.push([9.5, secondaryLane, 'gdpr', 1, 1]);
    }
  }
  return {
    waveNumber,
    titleZh: `无尽审计 · 第 ${waveNumber} 波`,
    titleEn: `Endless Audit · Wave ${waveNumber}`,
    events: makeSeq(items),
  };
}

// =========================================================================
// Multi-Stage Campaign Configuration (Stage 1: Meadow, Stage 2: Canyon, Stage 3: Furnace)
// =========================================================================

export interface StageEntryMarker {
  x: number;
  y: number;
  labelZh: string;
  labelEn: string;
  unlockWave: number;
}

export interface StageConfig {
  id: StageId;
  bgAsset: 'map-meadow' | 'map-bridge' | 'map-furnace';
  nameZh: string;
  nameEn: string;
  descZh: string;
  descEn: string;
  castlePos: Vec2;
  castleSignPos: Vec2;
  heroStart: Vec2;
  entryBadges: [Vec2, Vec2];
  entryMarkers: [StageEntryMarker, StageEntryMarker];
  sampledPaths: [SampledPath, SampledPath];
  pads: TowerPad[];
  waves: WaveDef[];
  roadTheme: 'meadow' | 'bridge' | 'furnace';
  startingGold: number;
}

// Stage 2: EU Audit Canyon — Dramatic X-crossing killzone at (555, 360) + split east diamond loops!
const BRIDGE_RAW_PATHS: [Vec2[], Vec2[]] = [
  // Lane 0: Upper North Ridge -> Central X-Crossing (555, 360) -> South-East Gorge -> Castle Gate
  [
    { x: -30, y: 156 },
    { x: 135, y: 156 },
    { x: 295, y: 192 },
    { x: 435, y: 278 },
    { x: 555, y: 360 },
    { x: 675, y: 444 },
    { x: 780, y: 484 },
    { x: 938, y: 466 },
    { x: 1040, y: 380 },
    { x: 1115, y: 342 },
  ],
  // Lane 1: Lower South Gorge (unlocks Wave 2!) -> Central X-Crossing (555, 360) -> North-East Ridge -> Castle Gate
  [
    { x: -30, y: 560 },
    { x: 135, y: 560 },
    { x: 295, y: 522 },
    { x: 435, y: 440 },
    { x: 555, y: 360 },
    { x: 675, y: 266 },
    { x: 790, y: 212 },
    { x: 945, y: 224 },
    { x: 1040, y: 308 },
    { x: 1115, y: 342 },
  ],
];

const BRIDGE_SAMPLED_PATHS: [SampledPath, SampledPath] = [
  buildSmoothPath(BRIDGE_RAW_PATHS[0]),
  buildSmoothPath(BRIDGE_RAW_PATHS[1]),
];

function snapRallyToPaths(paths: [SampledPath, SampledPath], x: number, y: number): Vec2 {
  const s = closestRoadSampleInPaths(paths, x, y);
  return { x: Math.round(s.x), y: Math.round(s.y) };
}

const BRIDGE_TOWER_PADS: TowerPad[] = [
  { id: 'b1', x: 205, y: 272, defaultRally: snapRallyToPaths(BRIDGE_SAMPLED_PATHS, 215, 168) },
  { id: 'b2', x: 205, y: 462, defaultRally: snapRallyToPaths(BRIDGE_SAMPLED_PATHS, 215, 548) },
  { id: 'b3', x: 368, y: 360, defaultRally: snapRallyToPaths(BRIDGE_SAMPLED_PATHS, 428, 276) },
  { id: 'b4', x: 555, y: 224, defaultRally: snapRallyToPaths(BRIDGE_SAMPLED_PATHS, 555, 360) },
  { id: 'b5', x: 555, y: 492, defaultRally: snapRallyToPaths(BRIDGE_SAMPLED_PATHS, 555, 360) },
  { id: 'b6', x: 746, y: 350, defaultRally: snapRallyToPaths(BRIDGE_SAMPLED_PATHS, 790, 212) },
  { id: 'b7', x: 805, y: 128, defaultRally: snapRallyToPaths(BRIDGE_SAMPLED_PATHS, 805, 212) },
  { id: 'b8', x: 795, y: 582, defaultRally: snapRallyToPaths(BRIDGE_SAMPLED_PATHS, 795, 484) },
  { id: 'b9', x: 928, y: 350, defaultRally: snapRallyToPaths(BRIDGE_SAMPLED_PATHS, 1055, 342) },
];

const BRIDGE_CAMPAIGN_WAVES: WaveDef[] = [
  {
    waveNumber: 1,
    titleZh: '峡谷初探：北崖审查小队 + 首批大厂金主',
    titleEn: 'Canyon Scouts & Early VIP',
    events: makeSeq([
      [0.3, 0, 'dev', 5, 1.25],
      [5.8, 0, 'vip', 1, 1],
      [7.8, 0, 'fork', 4, 0.95],
      [11.8, 0, 'dev', 4, 1.1],
    ]),
  },
  {
    waveNumber: 2,
    titleZh: '十字路口告急：南谷栈道提前开启！',
    titleEn: 'X-Crossing Live: South Gorge Opens!',
    events: makeSeq([
      [0.3, 0, 'dev', 5, 1.0],
      [0.9, 1, 'fork', 5, 0.92],
      [5.5, 1, 'vip', 1, 1],
      [7.6, 0, 'fork', 5, 0.85],
      [9.4, 1, 'dev', 5, 0.95],
      [13.6, 0, 'vip', 1, 1],
    ]),
  },
  {
    waveNumber: 3,
    titleZh: '双路 VIP 贵宾车队 + 重甲审计员突袭',
    titleEn: 'Dual-Lane VIP Rush & Armored Auditors',
    events: makeSeq([
      [0.3, 0, 'auditor', 3, 2.0],
      [1.0, 1, 'dev', 6, 0.85],
      [5.2, 0, 'vip', 1, 1],
      [7.4, 1, 'auditor', 2, 1.9],
      [9.5, 1, 'vip', 1, 1],
      [11.6, 0, 'fork', 6, 0.72],
      [13.2, 1, 'fork', 5, 0.75],
    ]),
  },
  {
    waveNumber: 4,
    titleZh: '物魔交叉钳击：审计员 × 硬核老兵',
    titleEn: 'Auditor & OS Veteran X-Pincer',
    events: makeSeq([
      [0.3, 0, 'auditor', 3, 1.75],
      [0.6, 1, 'veteran', 4, 1.65],
      [6.2, 0, 'vip', 1, 1],
      [8.2, 0, 'veteran', 3, 1.55],
      [9.0, 1, 'auditor', 3, 1.6],
      [13.8, 1, 'vip', 1, 1],
      [15.0, 0, 'fork', 7, 0.68],
    ]),
  },
  {
    waveNumber: 5,
    titleZh: '十字路口 Fork 闪电冲锋（护住金主！）',
    titleEn: 'X-Crossing Fork Blitz (Guard VIPs!)',
    events: makeSeq([
      [0.2, 0, 'fork', 8, 0.6],
      [0.7, 1, 'fork', 8, 0.6],
      [4.6, 0, 'vip', 1, 1],
      [6.2, 1, 'vip', 1, 1],
      [7.8, 0, 'auditor', 4, 1.45],
      [8.4, 1, 'veteran', 4, 1.45],
      [14.2, 0, 'dev', 6, 0.7],
      [15.0, 1, 'fork', 7, 0.62],
    ]),
  },
  {
    waveNumber: 6,
    titleZh: '欧盟峡谷重甲推进：切换塔优先目标！',
    titleEn: 'Heavy Canyon Push — Prioritize Strong!',
    events: makeSeq([
      [0.3, 0, 'auditor', 5, 1.4],
      [0.8, 1, 'veteran', 5, 1.4],
      [6.0, 1, 'vip', 1, 1],
      [8.0, 0, 'fork', 8, 0.58],
      [9.2, 1, 'auditor', 4, 1.35],
      [14.2, 0, 'vip', 1, 1],
      [15.4, 0, 'veteran', 4, 1.3],
    ]),
  },
  {
    waveNumber: 7,
    titleZh: '大厂金主混行高峰：双线同步施压',
    titleEn: 'Audit Canyon VIP Rush Hour',
    events: makeSeq([
      [0.2, 0, 'vip', 1, 1],
      [1.0, 0, 'veteran', 5, 1.3],
      [1.2, 1, 'auditor', 5, 1.3],
      [6.4, 1, 'vip', 1, 1],
      [8.0, 0, 'fork', 9, 0.55],
      [8.6, 1, 'fork', 9, 0.55],
      [14.2, 0, 'auditor', 4, 1.25],
      [14.6, 1, 'veteran', 4, 1.25],
    ]),
  },
  {
    waveNumber: 8,
    titleZh: '双路高速镜像潮 + 交叉重装编队',
    titleEn: 'Twin Fork Tsunami & Heavy Crossfire',
    events: makeSeq([
      [0.2, 0, 'fork', 10, 0.52],
      [0.6, 1, 'fork', 10, 0.52],
      [5.8, 0, 'vip', 1, 1],
      [7.0, 0, 'auditor', 5, 1.2],
      [7.4, 1, 'veteran', 5, 1.2],
      [13.4, 1, 'vip', 1, 1],
      [14.8, 0, 'veteran', 5, 1.15],
      [15.2, 1, 'auditor', 5, 1.15],
    ]),
  },
  {
    waveNumber: 9,
    titleZh: '裁决前夜：三路金主豪赌 + 满编审校团',
    titleEn: 'Eve of Verdict: Triple VIP Siege',
    events: makeSeq([
      [0.2, 0, 'vip', 1, 1],
      [1.0, 0, 'auditor', 6, 1.15],
      [1.2, 1, 'veteran', 6, 1.15],
      [6.5, 1, 'vip', 1, 1],
      [8.0, 0, 'fork', 10, 0.5],
      [8.4, 1, 'fork', 10, 0.5],
      [13.8, 0, 'vip', 1, 1],
      [15.2, 0, 'veteran', 6, 1.05],
      [15.6, 1, 'auditor', 6, 1.05],
    ]),
  },
  {
    waveNumber: 10,
    titleZh: '最终裁决：EU GDPR 巨装 + 双路审计总攻！',
    titleEn: 'FINAL VERDICT: GDPR Boss & Dual-Lane Auditors!',
    events: makeSeq([
      [0.4, 0, 'gdpr', 1, 1],
      [1.8, 0, 'auditor', 6, 1.35],
      [2.2, 1, 'auditor', 5, 1.4],
      [6.8, 1, 'vip', 1, 1],
      [8.8, 1, 'veteran', 6, 1.25],
      [10.2, 0, 'fork', 10, 0.52],
      [13.4, 0, 'veteran', 5, 1.25],
      [15.8, 0, 'vip', 1, 1],
      [17.5, 1, 'auditor', 5, 1.15],
      [18.8, 1, 'fork', 10, 0.5],
    ]),
  },
];

// Stage 3: 4 AM Server Furnace — Twin Parallel High-Speed Siege Lanes with Mid-Map S-Dip!
const FURNACE_RAW_PATHS: [Vec2[], Vec2[]] = [
  // Lane 0: North Fiber Trunk (active from Wave 1!)
  [
    { x: -30, y: 178 },
    { x: 210, y: 178 },
    { x: 380, y: 275 },
    { x: 610, y: 178 },
    { x: 860, y: 225 },
    { x: 1015, y: 348 },
    { x: 1118, y: 348 },
  ],
  // Lane 1: South GPU Trench (ALSO active from Wave 1!)
  [
    { x: -30, y: 530 },
    { x: 220, y: 530 },
    { x: 400, y: 430 },
    { x: 630, y: 528 },
    { x: 865, y: 470 },
    { x: 1015, y: 348 },
    { x: 1118, y: 348 },
  ],
];

const FURNACE_SAMPLED_PATHS: [SampledPath, SampledPath] = [
  buildSmoothPath(FURNACE_RAW_PATHS[0]),
  buildSmoothPath(FURNACE_RAW_PATHS[1]),
];

const FURNACE_TOWER_PADS: TowerPad[] = [
  { id: 'f1', x: 206, y: 288, defaultRally: snapRallyToPaths(FURNACE_SAMPLED_PATHS, 215, 180) },
  { id: 'f2', x: 206, y: 432, defaultRally: snapRallyToPaths(FURNACE_SAMPLED_PATHS, 220, 528) },
  { id: 'f3', x: 382, y: 148, defaultRally: snapRallyToPaths(FURNACE_SAMPLED_PATHS, 380, 275) },
  { id: 'f4', x: 400, y: 568, defaultRally: snapRallyToPaths(FURNACE_SAMPLED_PATHS, 400, 430) },
  { id: 'f5', x: 474, y: 354, defaultRally: snapRallyToPaths(FURNACE_SAMPLED_PATHS, 425, 265) },
  { id: 'f6', x: 638, y: 288, defaultRally: snapRallyToPaths(FURNACE_SAMPLED_PATHS, 625, 178) },
  { id: 'f7', x: 645, y: 422, defaultRally: snapRallyToPaths(FURNACE_SAMPLED_PATHS, 640, 528) },
  { id: 'f8', x: 842, y: 350, defaultRally: snapRallyToPaths(FURNACE_SAMPLED_PATHS, 860, 225) },
  { id: 'f9', x: 1012, y: 232, defaultRally: snapRallyToPaths(FURNACE_SAMPLED_PATHS, 1015, 348) },
];

const FURNACE_CAMPAIGN_WAVES: WaveDef[] = [
  {
    waveNumber: 1,
    titleZh: '凌晨开机：北线光纤 × 南线 GPU 双路齐发！',
    titleEn: '4 AM Boot: Twin-Lane Surge!',
    events: makeSeq([
      [0.3, 0, 'dev', 4, 1.35],
      [1.0, 1, 'dev', 4, 1.35],
      [6.4, 0, 'vip', 1, 1],
      [8.5, 1, 'dev', 3, 1.15],
      [9.0, 0, 'fork', 3, 1.05],
    ]),
  },
  {
    waveNumber: 2,
    titleZh: '双轨 VIP 交叉护航 · 免费 Fork 竞速',
    titleEn: 'Dual-Lane VIP Crossfire & Fork Sprint',
    events: makeSeq([
      [0.3, 0, 'fork', 4, 0.95],
      [0.8, 1, 'dev', 4, 1.0],
      [4.6, 0, 'vip', 1, 1],
      [5.2, 1, 'fork', 4, 0.9],
      [6.8, 0, 'dev', 5, 0.9],
      [9.6, 1, 'vip', 1, 1],
      [11.5, 1, 'dev', 4, 0.95],
      [12.2, 0, 'fork', 3, 0.85],
    ]),
  },
  {
    waveNumber: 3,
    titleZh: '熔炉升温：重甲审计员双轨首秀',
    titleEn: 'Furnace Heats Up: Twin-Lane Auditors',
    events: makeSeq([
      [0.3, 0, 'auditor', 2, 2.2],
      [0.8, 1, 'dev', 5, 0.9],
      [5.0, 1, 'vip', 1, 1],
      [5.6, 0, 'fork', 5, 0.78],
      [7.4, 1, 'auditor', 2, 2.0],
      [10.2, 0, 'vip', 1, 1],
      [11.8, 1, 'fork', 5, 0.8],
      [12.2, 0, 'auditor', 2, 1.9],
    ]),
  },
  {
    waveNumber: 4,
    titleZh: '凌晨四点物魔夹攻：审计员 × 开源老兵',
    titleEn: '4 AM Dual-Resist Pincer: Auditors & Veterans',
    events: makeSeq([
      [0.3, 0, 'auditor', 3, 1.85],
      [0.8, 1, 'veteran', 3, 1.85],
      [6.0, 1, 'dev', 5, 0.8],
      [6.2, 0, 'vip', 1, 1],
      [8.2, 0, 'veteran', 4, 1.6],
      [10.5, 1, 'auditor', 3, 1.75],
      [14.6, 0, 'fork', 6, 0.72],
      [15.0, 1, 'vip', 1, 1],
    ]),
  },
  {
    waveNumber: 5,
    titleZh: '光纤超频冲锋：双轨 Fork 闪电洪流',
    titleEn: 'Fiber Overclock: High-Speed Fork Flood',
    events: makeSeq([
      [0.2, 0, 'fork', 8, 0.62],
      [0.7, 1, 'fork', 8, 0.62],
      [5.4, 0, 'vip', 1, 1],
      [6.2, 1, 'veteran', 4, 1.5],
      [7.4, 0, 'auditor', 4, 1.5],
      [12.0, 1, 'vip', 1, 1],
      [14.0, 0, 'dev', 5, 0.72],
      [14.2, 1, 'fork', 6, 0.65],
    ]),
  },
  {
    waveNumber: 6,
    titleZh: '机房过热告警：双轨重装推进',
    titleEn: 'Thermal Throttling: Heavy Twin Push',
    events: makeSeq([
      [0.3, 0, 'auditor', 5, 1.45],
      [0.7, 1, 'veteran', 5, 1.45],
      [7.0, 0, 'vip', 1, 1],
      [8.0, 1, 'auditor', 4, 1.45],
      [9.2, 0, 'fork', 6, 0.62],
      [13.6, 1, 'vip', 1, 1],
      [13.8, 0, 'veteran', 4, 1.35],
      [15.4, 1, 'fork', 6, 0.62],
    ]),
  },
  {
    waveNumber: 7,
    titleZh: '大厂深夜查账：双线金主混行战',
    titleEn: 'Midnight VIP Audit Rush',
    events: makeSeq([
      [0.3, 0, 'vip', 1, 1],
      [0.8, 1, 'auditor', 5, 1.32],
      [1.4, 0, 'veteran', 5, 1.32],
      [7.2, 1, 'vip', 1, 1],
      [8.4, 0, 'fork', 8, 0.56],
      [9.2, 1, 'fork', 8, 0.56],
      [14.0, 0, 'auditor', 4, 1.3],
      [14.4, 1, 'veteran', 4, 1.3],
    ]),
  },
  {
    waveNumber: 8,
    titleZh: 'GPU 壕沟雪崩：镜像海啸 + 双抗铁壁',
    titleEn: 'GPU Trench Avalanche: Mirror Tsunami',
    events: makeSeq([
      [0.2, 0, 'fork', 9, 0.52],
      [0.6, 1, 'fork', 9, 0.52],
      [5.6, 0, 'vip', 1, 1],
      [6.8, 1, 'veteran', 5, 1.25],
      [7.2, 0, 'auditor', 5, 1.25],
      [13.2, 1, 'vip', 1, 1],
      [14.5, 0, 'veteran', 5, 1.2],
      [14.8, 1, 'auditor', 5, 1.2],
    ]),
  },
  {
    waveNumber: 9,
    titleZh: '03:59 删库前夕：三路金主豪赌 + 满编总审',
    titleEn: '03:59 AM: Triple VIP & Full Audit',
    events: makeSeq([
      [0.2, 0, 'vip', 1, 1],
      [1.0, 1, 'veteran', 6, 1.18],
      [1.2, 0, 'auditor', 6, 1.18],
      [7.2, 1, 'vip', 1, 1],
      [8.6, 0, 'fork', 9, 0.52],
      [9.0, 1, 'fork', 9, 0.52],
      [13.8, 0, 'vip', 1, 1],
      [15.0, 1, 'auditor', 6, 1.12],
      [15.4, 0, 'veteran', 6, 1.12],
    ]),
  },
  {
    waveNumber: 10,
    titleZh: '04:00 终极清算：EU GDPR 巨装 + 南线双抗总攻！',
    titleEn: '04:00 AM FINALE: GDPR Boss & South Pincer!',
    events: makeSeq([
      [0.4, 0, 'gdpr', 1, 1],
      [1.8, 1, 'auditor', 5, 1.4],
      [2.2, 0, 'auditor', 5, 1.45],
      [6.8, 1, 'vip', 1, 1],
      [7.8, 1, 'veteran', 5, 1.3],
      [10.5, 0, 'fork', 9, 0.54],
      [14.0, 0, 'veteran', 4, 1.3],
      [15.8, 1, 'auditor', 5, 1.25],
      [16.4, 0, 'vip', 1, 1],
      [18.2, 1, 'veteran', 5, 1.2],
      [19.0, 0, 'fork', 8, 0.54],
    ]),
  },
];

export const STAGES: Record<StageId, StageConfig> = {
  meadow: {
    id: 'meadow',
    bgAsset: 'map-meadow',
    nameZh: '硅谷草坪',
    nameEn: 'Silicon Meadow',
    descZh: '双路合流中路隘口 · 经典开局防线（第3波开下路）',
    descEn: 'Twin trails merge at center choke — classic opener (Lower lane Wave 3)',
    castlePos: CASTLE_POS,
    castleSignPos: CASTLE_SIGN_POS,
    heroStart: { x: 560, y: 348 },
    entryBadges: [
      { x: 56, y: 208 },
      { x: 56, y: 525 },
    ],
    entryMarkers: [
      { x: 62, y: 148, labelZh: '开源社区', labelEn: 'OSS Trail', unlockWave: 1 },
      { x: 66, y: 462, labelZh: '市集下路', labelEn: 'Market Ln', unlockWave: 3 },
    ],
    sampledPaths: SAMPLED_PATHS,
    pads: TOWER_PADS,
    waves: CAMPAIGN_WAVES,
    roadTheme: 'meadow',
    startingGold: INITIAL_GOLD,
  },
  bridge: {
    id: 'bridge',
    bgAsset: 'map-bridge',
    nameZh: '欧盟审计峡谷',
    nameEn: 'EU Audit Canyon',
    descZh: '中央 X 型石路死斗交叉口 · 第2波即双路夹击（起始 300$）',
    descEn: 'Central X-crossing cobble killzone — dual lanes from Wave 2 (300$ start)',
    castlePos: { x: 1165, y: 342 },
    castleSignPos: { x: 1165, y: 208 },
    heroStart: { x: 555, y: 360 },
    entryBadges: [
      { x: 56, y: 156 },
      { x: 56, y: 560 },
    ],
    entryMarkers: [
      { x: 62, y: 100, labelZh: '北崖步道', labelEn: 'North Ridge', unlockWave: 1 },
      { x: 66, y: 500, labelZh: '南谷栈道', labelEn: 'South Gorge', unlockWave: 2 },
    ],
    sampledPaths: BRIDGE_SAMPLED_PATHS,
    pads: BRIDGE_TOWER_PADS,
    waves: BRIDGE_CAMPAIGN_WAVES,
    roadTheme: 'bridge',
    startingGold: 300,
  },
  furnace: {
    id: 'furnace',
    bgAsset: 'map-furnace',
    nameZh: '午夜服务器熔炉',
    nameEn: '4 AM Server Furnace',
    descZh: '双轨光纤高能冲锋 · 第1波即双路齐开（起始 340$）',
    descEn: 'Twin high-speed fiber siege lanes — dual lanes from Wave 1 (340$ start)',
    castlePos: { x: 1165, y: 348 },
    castleSignPos: { x: 1165, y: 214 },
    heroStart: { x: 640, y: 350 },
    entryBadges: [
      { x: 56, y: 178 },
      { x: 56, y: 530 },
    ],
    entryMarkers: [
      { x: 62, y: 118, labelZh: '北线光纤', labelEn: 'North Fiber', unlockWave: 1 },
      { x: 66, y: 468, labelZh: '南线 GPU', labelEn: 'South GPU', unlockWave: 1 },
    ],
    sampledPaths: FURNACE_SAMPLED_PATHS,
    pads: FURNACE_TOWER_PADS,
    waves: FURNACE_CAMPAIGN_WAVES,
    roadTheme: 'furnace',
    startingGold: 340,
  },
};

export const STAGE_ORDER: StageId[] = ['meadow', 'bridge', 'furnace'];

export function getStageConfig(id: StageId): StageConfig {
  return STAGES[id] ?? STAGES.meadow;
}

export function sampleStagePathAt(
  stageId: StageId,
  lane: 0 | 1,
  dist: number,
  laneOffset = 0
): { x: number; y: number; nx: number; ny: number } {
  return samplePathListAt(getStageConfig(stageId).sampledPaths, lane, dist, laneOffset);
}

export function closestStageRoadSample(
  stageId: StageId,
  x: number,
  y: number
): { x: number; y: number; tx: number; ty: number; nx: number; ny: number; distToRoad: number } {
  return closestRoadSampleInPaths(getStageConfig(stageId).sampledPaths, x, y);
}

export function closestPointOnStageRoads(
  stageId: StageId,
  x: number,
  y: number
): { x: number; y: number; distToRoad: number } {
  const s = closestStageRoadSample(stageId, x, y);
  return { x: s.x, y: s.y, distToRoad: s.distToRoad };
}
