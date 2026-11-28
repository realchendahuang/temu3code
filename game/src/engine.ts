import { sfx } from './audio';
import {
  ACHIEVEMENTS,
  closestStageRoadSample,
  DIFFICULTY_CONFIG,
  ENEMY_ARCHETYPES,
  generateEndlessWave,
  getStageConfig,
  getTowerStat,
  INITIAL_GOLD,
  INITIAL_LIVES,
  POLICY_POOL,
  sampleStagePathAt,
  SKILL_CDS,
  STAGE_ORDER,
  type StageConfig,
  VIP_ESCORT_PAYOUT,
  VIP_PAYOUT,
  VIP_PENALTY,
} from './config';
import { getHeroBubbles, t } from './i18n';
import type {
  AchievementDef,
  AchievementId,
  Difficulty,
  Enemy,
  EnemyKind,
  FakeRug,
  FallingDeleteKey,
  FloatingText,
  FlyingCoin,
  Guard,
  Hero,
  Lang,
  LeakPuddle,
  LightningArc,
  Particle,
  PolicyChoice,
  PolicyId,
  Projectile,
  RunStats,
  ScorchCrater,
  SpawnEvent,
  StageId,
  SuctionBeam,
  TargetPriority,
  Tower,
  TowerBaseType,
  TowerBranch,
  VipUnit,
  WaveBanner,
  WaveDef,
} from './types';

export interface EngineCallbacks {
  onToast: (msg: string, tone?: 'info' | 'warn' | 'good' | 'purple') => void;
  onGameEnd: (kind: 'victory' | 'defeat' | 'endless_over') => void;
  onHudDirty: () => void;
  onPolicyDraft?: (choices: PolicyChoice[]) => void;
  onAchievement?: (def: AchievementDef) => void;
}

const STORAGE_KEY = 'temu3_kingdom_best_v1';
const ACHIEVEMENTS_STORAGE_KEY = 'temu3_kingdom_achievements_v1';
const CAREER_STORAGE_KEY = 'temu3_kingdom_career_v1';
const GOLD_HUD_TARGET_X = 135;
const GOLD_HUD_TARGET_Y = 32;
const MAX_FLYING_COINS = 35;
const MAX_SCORCH_CRATERS = 10;
const MAX_PARTICLES = 220;
const MAX_FLOATING_TEXTS = 48;

const VALID_ACHIEVEMENT_IDS = new Set<AchievementId>(ACHIEVEMENTS.map((a) => a.id));

export function loadUnlockedAchievements(): AchievementId[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: AchievementId[] = [];
    for (const item of parsed) {
      if (typeof item === 'string' && VALID_ACHIEVEMENT_IDS.has(item as AchievementId)) {
        const id = item as AchievementId;
        if (!out.includes(id)) out.push(id);
      }
    }
    return out;
  } catch {
    return [];
  }
}

export function saveUnlockedAchievement(id: AchievementId): boolean {
  if (!VALID_ACHIEVEMENT_IDS.has(id)) return false;
  try {
    if (typeof localStorage === 'undefined') return false;
    const list = loadUnlockedAchievements();
    if (list.includes(id)) return false;
    list.push(id);
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export interface BestRecord {
  wave: number;
  stars: number;
}

function getStageBestStorageKey(stageId: StageId): string {
  return stageId === 'meadow' ? STORAGE_KEY : `temu3_kingdom_best_${stageId}_v1`;
}

export function loadStageBestRecord(stageId: StageId): BestRecord | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(getStageBestStorageKey(stageId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BestRecord>;
    if (typeof parsed.wave === 'number' && typeof parsed.stars === 'number') {
      return { wave: parsed.wave, stars: parsed.stars };
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function saveStageBestRecord(stageId: StageId, wave: number, stars: number): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const prev = loadStageBestRecord(stageId);
    if (!prev || wave > prev.wave || (wave === prev.wave && stars > prev.stars)) {
      localStorage.setItem(getStageBestStorageKey(stageId), JSON.stringify({ wave, stars }));
    }
  } catch {
    // ignore
  }
}

export function loadBestRecord(): BestRecord | null {
  return loadStageBestRecord('meadow');
}

export function saveBestRecord(wave: number, stars: number): void {
  saveStageBestRecord('meadow', wave, stars);
}

export interface CareerStats {
  runsFinished: number;
  victories: number;
  totalBlocked: number;
  totalVipsEscorted: number;
  totalGoldStolen: number;
  bestEndlessWave: number;
}

function createEmptyCareerStats(): CareerStats {
  return {
    runsFinished: 0,
    victories: 0,
    totalBlocked: 0,
    totalVipsEscorted: 0,
    totalGoldStolen: 0,
    bestEndlessWave: 0,
  };
}

function sanitizeNonNegInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export function loadCareerStats(): CareerStats {
  try {
    if (typeof localStorage === 'undefined') return createEmptyCareerStats();
    const raw = localStorage.getItem(CAREER_STORAGE_KEY);
    if (!raw) return createEmptyCareerStats();
    const parsed = JSON.parse(raw) as Partial<CareerStats> | null;
    if (!parsed || typeof parsed !== 'object') return createEmptyCareerStats();
    return {
      runsFinished: sanitizeNonNegInt(parsed.runsFinished),
      victories: sanitizeNonNegInt(parsed.victories),
      totalBlocked: sanitizeNonNegInt(parsed.totalBlocked),
      totalVipsEscorted: sanitizeNonNegInt(parsed.totalVipsEscorted),
      totalGoldStolen: sanitizeNonNegInt(parsed.totalGoldStolen),
      bestEndlessWave: sanitizeNonNegInt(parsed.bestEndlessWave),
    };
  } catch {
    return createEmptyCareerStats();
  }
}

function saveCareerStats(stats: CareerStats): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore storage errors
  }
}

export function resetAllLocalProgress(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const keysToRemove = [
      STORAGE_KEY,
      'temu3_kingdom_best_bridge_v1',
      'temu3_kingdom_best_furnace_v1',
      ACHIEVEMENTS_STORAGE_KEY,
      CAREER_STORAGE_KEY,
    ];
    for (const key of keysToRemove) {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore per-key storage errors
      }
    }
  } catch {
    // ignore storage errors
  }
}

export class GameEngine {
  public lang: Lang = 'en';
  public stageId: StageId = 'meadow';
  public difficulty: Difficulty = 'normal';
  public activePolicies: PolicyId[] = [];
  public pendingPolicies: PolicyChoice[] | null = null;
  public gold = INITIAL_GOLD;
  public lives = INITIAL_LIVES;
  public maxLives = INITIAL_LIVES;
  public leakAlarm = 0; // 0..100

  public waveIndex = 0; // 0 = prep before wave 1, 1..10 campaign, 11+ endless
  public endlessMode = false;
  public waveActive = false;
  public betweenWaveTimer = 0;
  public victoryShown = false;
  public gameOver = false;
  public paused = false;
  public speedMultiplier: 1 | 2 | 3 = 1;

  public time = 0;
  public screenShake = 0;
  public signFlipTimer = 0; // castle roof "No Telemetry" trapdoor animation
  public leakFlashTimer = 0;
  public movePing: { x: number; y: number; timer: number } | null = null;

  public towers: Tower[] = [];
  public guards: Guard[] = [];
  public enemies: Enemy[] = [];
  public vips: VipUnit[] = [];
  public projectiles: Projectile[] = [];
  public lightningArcs: LightningArc[] = [];
  public leakPuddles: LeakPuddle[] = [];
  public fakeRugs: FakeRug[] = [];
  public scorchCraters: ScorchCrater[] = [];
  public fallingDeletes: FallingDeleteKey[] = [];
  public suctionBeams: SuctionBeam[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public unlockedAchievements: AchievementId[] = [];
  public flyingCoins: FlyingCoin[] = [];
  public waveBanner: WaveBanner | null = null;

  public skillCds = {
    steal: 0,
    rug: 0,
    delete: 0,
    apology: 0,
  };

  public hero: Hero;
  public stats: RunStats;

  private nextId = 1;
  private spawnQueue: SpawnEvent[] = [];
  private spawnTimer = 0;
  private heroRegenIdle = 0;
  private auditorPuddleCooldown = new Map<number, number>();
  private auditorInspectedPuddles = new Map<number, Set<number>>();
  private forkBoostTriggered = new Set<number>();
  private forkBoostTimers = new Map<number, number>();
  private bossPhaseTriggered = new Set<number>();
  private bossRallyTimers = new Map<number, number>();
  private armorShredTimers = new Map<number, number>();
  private heroChaseVipId: number | null = null;
  private heroIgnoreVipTimer = 0;
  private draftedWaves = new Set<number>();
  private builtBaseTypes = new Set<TowerBaseType>();
  private lv3TowersReached = new Set<number>();
  private lastRugBurstTime = -Infinity;
  private deleteCastTimes = new WeakMap<FallingDeleteKey, number>();
  private lastBgmIntensity: -1 | 0 | 1 | 2 = -1;
  private careerRunCounted = false;
  private careerVictoryCounted = false;
  private careerRecordedBlocked = 0;
  private careerRecordedVips = 0;
  private careerRecordedGoldStolen = 0;
  private callbacks: EngineCallbacks;

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
    this.unlockedAchievements = loadUnlockedAchievements();
    this.gold = this.getStartingGold();
    this.hero = this.createInitialHero();
    this.stats = this.createInitialStats();
  }

  public getStage(): StageConfig {
    return getStageConfig(this.stageId);
  }

  public setStage(id: StageId): void {
    this.stageId = getStageConfig(id).id;
    this.reset();
  }

  private getStartingGold(): number {
    const stageGold = this.getStage().startingGold;
    const diffDelta = DIFFICULTY_CONFIG[this.difficulty].startGold - INITIAL_GOLD;
    return Math.max(100, stageGold + diffDelta);
  }

  private createInitialHero(): Hero {
    const start = this.getStage().heroStart;
    return {
      x: start.x,
      y: start.y,
      targetX: start.x,
      targetY: start.y,
      hp: 280,
      maxHp: 280,
      level: 1,
      xp: 0,
      nextXp: 80,
      speed: 175,
      damage: 26,
      attackTimer: 0,
      stance: 'idle',
      escortingVipId: null,
      engagedEnemyId: null,
      alive: true,
      respawnTimer: 0,
      facing: -1,
      walkPhase: 0,
      hitFlash: 0,
      lungeTimer: 0,
      apologyAuraTimer: 0,
      apologyCasts: 0,
      bubbleText: null,
      bubbleTimer: 0,
    };
  }

  private createInitialStats(): RunStats {
    return {
      enemiesBlocked: 0,
      vipsEscorted: 0,
      vipsScared: 0,
      stealCasts: 0,
      goldStolen: 0,
      rugsBurst: 0,
      deletesDropped: 0,
      apologiesCasted: 0,
      leakRaidsTriggered: 0,
    };
  }

  public setDifficulty(d: Difficulty): void {
    this.difficulty = d;
    if (this.waveIndex === 0 && this.towers.length === 0 && this.time === 0) {
      this.gold = this.getStartingGold();
    }
    this.callbacks.onHudDirty();
  }

  public hasPolicy(id: PolicyId): boolean {
    return this.activePolicies.includes(id);
  }

  public selectPolicy(id: PolicyId): boolean {
    if (!this.pendingPolicies) return false;
    const chosen = this.pendingPolicies.find((p) => p.id === id);
    if (!chosen || this.activePolicies.includes(id)) return false;

    this.activePolicies.push(id);
    this.pendingPolicies = null;
    this.paused = false;

    if (id === 'pr_insurance') {
      const prevLives = this.lives;
      this.lives = Math.min(this.maxLives, this.lives + 4);
      const restored = this.lives - prevLives;
      this.hero.maxHp += 80;
      this.hero.alive = true;
      this.hero.respawnTimer = 0;
      this.hero.hp = this.hero.maxHp;
      const castle = this.getStage().castlePos;
      this.spawnBurst(castle.x - 24, castle.y - 16, '#4ade80', 18, 100);
      this.addFloatText(
        castle.x - 32,
        castle.y - 44,
        restored > 0
          ? t(this.lang, 'float.prInsured', { n: restored })
          : t(this.lang, 'float.prMaxHp'),
        '#4ade80',
        1.22
      );
      this.spawnBurst(this.hero.x, this.hero.y - 16, '#4ade80', 16, 95);
      this.addFloatText(this.hero.x, this.hero.y - 44, t(this.lang, 'float.heroMaxHp'), '#4ade80', 1.2);
    } else if (id === 'vacuum_carpet') {
      if (this.skillCds.rug > 0) {
        this.skillCds.rug = Math.max(0, this.skillCds.rug - 8);
      }
    } else if (id === 'vip_first_class') {
      for (const v of this.vips) {
        if (!v.fleeing) {
          v.baseSpeed *= 1.25;
          v.payout += 45;
        }
      }
    }

    const label = t(this.lang, `policy.${chosen.id}.title`);
    this.callbacks.onToast(
      t(this.lang, 'toast.policyActive', { name: label }),
      'good'
    );
    const extSfx = sfx as unknown as { policyPick?: () => void };
    if (extSfx.policyPick) extSfx.policyPick();
    else sfx.vipSuccess();
    this.callbacks.onHudDirty();
    return true;
  }

  public getActiveBoss(): Enemy | null {
    let boss: Enemy | null = null;
    for (const e of this.enemies) {
      if (e.isBoss && e.hp > 0 && (!boss || e.dist > boss.dist)) {
        boss = e;
      }
    }
    return boss;
  }

  public findInspectableAt(
    x: number,
    y: number
  ): { kind: 'enemy'; enemy: Enemy } | { kind: 'vip'; vip: VipUnit } | null {
    // Hit-test VIPs first so players can inspect VIPs even when walking in a dense pack
    let bestVip: VipUnit | null = null;
    let bestVipDist = Infinity;
    const vipHitRadius = 20 + 16;
    for (const v of this.vips) {
      const d = Math.min(Math.hypot(x - v.x, y - v.y), Math.hypot(x - v.x, y - (v.y - 16)));
      if (d <= vipHitRadius && d < bestVipDist) {
        bestVipDist = d;
        bestVip = v;
      }
    }
    if (bestVip) return { kind: 'vip', vip: bestVip };

    let bestEnemy: Enemy | null = null;
    let bestEnemyDist = Infinity;
    for (const e of this.enemies) {
      const yOff = e.isBoss ? 22 : 12;
      const d = Math.min(Math.hypot(x - e.x, y - e.y), Math.hypot(x - e.x, y - (e.y - yOff)));
      if (d <= e.radius + 16 && d < bestEnemyDist) {
        bestEnemyDist = d;
        bestEnemy = e;
      }
    }
    if (bestEnemy) return { kind: 'enemy', enemy: bestEnemy };

    return null;
  }

  public isTrueMitSaint(): boolean {
    return this.stats.stealCasts === 0 && this.stats.vipsScared === 0 && !this.gameOver;
  }

  private getPendingDraftMilestone(completedWave: number): number | null {
    const milestones = [3, 6, 9];
    for (let w = 14; w <= completedWave; w += 4) {
      milestones.push(w);
    }
    for (const m of milestones) {
      if (m <= completedWave && !this.draftedWaves.has(m)) {
        return m;
      }
    }
    return null;
  }

  private triggerPolicyDraft(): void {
    const pool = POLICY_POOL.filter((p) => !this.activePolicies.includes(p.id));
    if (pool.length === 0) return;

    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const choices = shuffled.slice(0, Math.min(3, shuffled.length));
    this.pendingPolicies = choices;
    this.callbacks.onPolicyDraft?.(choices);
  }

  public reset(): void {
    this.gold = this.getStartingGold();
    this.lives = INITIAL_LIVES;
    this.leakAlarm = 0;
    this.activePolicies = [];
    this.pendingPolicies = null;
    this.draftedWaves.clear();
    this.waveIndex = 0;
    this.endlessMode = false;
    this.waveActive = false;
    this.betweenWaveTimer = 0;
    this.victoryShown = false;
    this.gameOver = false;
    this.paused = false;
    this.speedMultiplier = 1;
    this.time = 0;
    this.screenShake = 0;
    this.signFlipTimer = 0;
    this.leakFlashTimer = 0;
    this.movePing = null;

    this.towers = [];
    this.guards = [];
    this.enemies = [];
    this.vips = [];
    this.projectiles = [];
    this.lightningArcs = [];
    this.leakPuddles = [];
    this.fakeRugs = [];
    this.scorchCraters = [];
    this.fallingDeletes = [];
    this.suctionBeams = [];
    this.particles = [];
    this.floatingTexts = [];
    this.flyingCoins = [];
    this.waveBanner = null;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.heroRegenIdle = 0;
    this.auditorPuddleCooldown.clear();
    this.auditorInspectedPuddles.clear();
    this.forkBoostTriggered.clear();
    this.forkBoostTimers.clear();
    this.bossPhaseTriggered.clear();
    this.bossRallyTimers.clear();
    this.armorShredTimers.clear();
    this.builtBaseTypes.clear();
    this.lv3TowersReached.clear();
    this.lastRugBurstTime = -Infinity;
    this.deleteCastTimes = new WeakMap<FallingDeleteKey, number>();
    this.heroChaseVipId = null;
    this.heroIgnoreVipTimer = 0;
    this.lastBgmIntensity = -1;
    this.careerRunCounted = false;
    this.careerVictoryCounted = false;
    this.careerRecordedBlocked = 0;
    this.careerRecordedVips = 0;
    this.careerRecordedGoldStolen = 0;

    this.skillCds = { steal: 0, rug: 0, delete: 0, apology: 0 };
    this.hero = this.createInitialHero();
    this.stats = this.createInitialStats();
    this.syncBgmIntensity();
    this.callbacks.onHudDirty();
  }

  public reloadLocalState(): void {
    this.unlockedAchievements = loadUnlockedAchievements();
    if (this.careerRunCounted) {
      this.careerRunCounted = false;
      this.careerVictoryCounted = false;
    }
    this.callbacks.onHudDirty();
  }

  private recordCareerOutcome(kind: 'victory' | 'defeat' | 'endless_over'): void {
    const career = loadCareerStats();
    if (!this.careerRunCounted) {
      career.runsFinished += 1;
      this.careerRunCounted = true;
    }
    if (kind === 'victory' && !this.careerVictoryCounted) {
      career.victories += 1;
      this.careerVictoryCounted = true;
    }

    const deltaBlocked = Math.max(0, this.stats.enemiesBlocked - this.careerRecordedBlocked);
    const deltaVips = Math.max(0, this.stats.vipsEscorted - this.careerRecordedVips);
    const deltaGoldStolen = Math.max(0, this.stats.goldStolen - this.careerRecordedGoldStolen);

    career.totalBlocked += deltaBlocked;
    career.totalVipsEscorted += deltaVips;
    career.totalGoldStolen += deltaGoldStolen;

    this.careerRecordedBlocked = this.stats.enemiesBlocked;
    this.careerRecordedVips = this.stats.vipsEscorted;
    this.careerRecordedGoldStolen = this.stats.goldStolen;

    if (this.endlessMode && this.waveIndex > this.getStage().waves.length) {
      career.bestEndlessWave = Math.max(career.bestEndlessWave, this.waveIndex);
    }

    saveCareerStats(career);
  }

  private unlockAchievement(id: AchievementId): boolean {
    if (this.unlockedAchievements.includes(id)) return false;
    this.unlockedAchievements.push(id);
    saveUnlockedAchievement(id);
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (def) {
      (sfx as unknown as { achievement?: () => void }).achievement?.();
      this.callbacks.onAchievement?.(def);
      this.callbacks.onHudDirty();
    }
    return true;
  }

  private checkAllBranchesAchievement(): void {
    const types = new Set<TowerBaseType>(this.builtBaseTypes);
    const lv3Ids = new Set<number>(this.lv3TowersReached);
    for (const tw of this.towers) {
      types.add(tw.type);
      if (tw.level === 3) lv3Ids.add(tw.id);
    }
    if (types.size >= 4 && lv3Ids.size >= 2) {
      this.unlockAchievement('all_branches');
    }
  }

  private checkTrilogyLordAchievement(): void {
    const allCleared = STAGE_ORDER.every((id) => {
      const rec = loadStageBestRecord(id);
      return rec !== null && rec.wave >= 10 && rec.stars >= 1;
    });
    if (allCleared) {
      this.unlockAchievement('trilogy_lord');
    }
  }

  private recordTowerDamage(towerId: number | null | undefined, amount: number, killed: boolean): void {
    if (towerId == null || amount <= 0) return;
    const tw = this.towers.find((t0) => t0.id === towerId);
    if (!tw) return;
    tw.totalDamage = (tw.totalDamage ?? 0) + amount;
    if (killed) {
      tw.kills = (tw.kills ?? 0) + 1;
    }
  }

  private recordTowerGold(towerId: number | null | undefined, amount: number): void {
    if (towerId == null || amount <= 0) return;
    const tw = this.towers.find((t0) => t0.id === towerId);
    if (!tw) return;
    tw.goldEarned = (tw.goldEarned ?? 0) + amount;
  }

  public spawnFlyingCoins(startX: number, startY: number, amount: number, count = 1): void {
    const total = Math.max(1, count);
    const perCoin = Math.max(1, Math.round(amount / total));
    for (let i = 0; i < total; i++) {
      if (this.flyingCoins.length >= MAX_FLYING_COINS) break;
      const jitterX = total > 1 ? (Math.random() - 0.5) * 28 : 0;
      const jitterY = total > 1 ? (Math.random() - 0.5) * 20 : 0;
      const sx = startX + jitterX;
      const sy = startY + jitterY;
      const dist = Math.hypot(GOLD_HUD_TARGET_X - sx, GOLD_HUD_TARGET_Y - sy);
      const duration = Math.min(0.86, Math.max(0.46, dist / 1050)) + i * 0.045;
      this.flyingCoins.push({
        x: sx,
        y: sy,
        startX: sx,
        startY: sy,
        targetX: GOLD_HUD_TARGET_X,
        targetY: GOLD_HUD_TARGET_Y,
        progress: 0,
        duration,
        amount: perCoin,
      });
    }
  }

  private syncBgmIntensity(): void {
    let level: 0 | 1 | 2 = 0;
    if (!this.gameOver && !this.victoryShown) {
      if (this.leakAlarm >= 70 || this.leakFlashTimer > 0 || this.enemies.some((e) => e.isBoss)) {
        level = 2;
      } else if (this.waveActive) {
        level = 1;
      }
    }
    if (level !== this.lastBgmIntensity) {
      this.lastBgmIntensity = level;
      (sfx as unknown as { setIntensity?: (lvl: 0 | 1 | 2) => void }).setIntensity?.(level);
    }
  }

  private cleanupEnemyTracking(enemyId: number): void {
    this.auditorPuddleCooldown.delete(enemyId);
    this.auditorInspectedPuddles.delete(enemyId);
    this.forkBoostTriggered.delete(enemyId);
    this.forkBoostTimers.delete(enemyId);
    this.bossPhaseTriggered.delete(enemyId);
    this.bossRallyTimers.delete(enemyId);
    this.armorShredTimers.delete(enemyId);
  }

  public getStars(): number {
    if (this.lives >= 18) return 3;
    if (this.lives >= 11) return 2;
    return 1;
  }

  public getNextWaveDef(): WaveDef {
    const nextNum = this.waveIndex + 1;
    const waves = this.getStage().waves;
    if (nextNum <= waves.length) return waves[nextNum - 1];
    return generateEndlessWave(nextNum);
  }

  public canCallNextWave(): boolean {
    if (this.gameOver || this.pendingPolicies !== null) return false;
    if (this.victoryShown && !this.endlessMode) return false;
    if (!this.endlessMode && this.waveIndex >= this.getStage().waves.length) return false;
    if (this.waveIndex === 0) return true;
    // Allow early call once current wave's spawns are done
    return this.spawnQueue.length === 0;
  }

  public getEarlyCallBonus(): number {
    if (this.waveIndex === 0 || !this.canCallNextWave()) return 0;
    const waveScale = Math.min(20, Math.max(0, this.waveIndex - 1) * 2);
    if (this.waveActive) return 32 + waveScale;
    return Math.max(12, Math.round(this.betweenWaveTimer * 3.0) + Math.floor(waveScale * 0.5));
  }

  public callNextWave(): void {
    if (!this.canCallNextWave()) return;
    const stage = this.getStage();
    const totalCampaignWaves = stage.waves.length;
    const badge0 = stage.entryBadges[0];
    const bonusFxX = badge0.x + 72;
    const bonusFxY = badge0.y - 10;
    const wasActive = this.waveActive;
    const bonus = this.getEarlyCallBonus();
    if (bonus > 0) {
      this.gold += bonus;
      this.spawnFlyingCoins(bonusFxX, bonusFxY, bonus, 2);
      this.addFloatText(bonusFxX, bonusFxY, `+${bonus}$`, '#facc15', 1.2);
      // Generous Kingdom Rush cooldown shave on early wave call
      const cdShave = wasActive ? 4 : Math.max(2, Math.round(this.betweenWaveTimer * 0.35));
      const hadCd =
        this.skillCds.steal > 0 ||
        this.skillCds.rug > 0 ||
        this.skillCds.delete > 0 ||
        this.skillCds.apology > 0;
      this.skillCds.steal = Math.max(0, this.skillCds.steal - cdShave);
      this.skillCds.rug = Math.max(0, this.skillCds.rug - cdShave);
      this.skillCds.delete = Math.max(0, this.skillCds.delete - cdShave);
      this.skillCds.apology = Math.max(0, this.skillCds.apology - cdShave);
      if (hadCd) {
        this.addFloatText(bonusFxX, bonusFxY + 26, t(this.lang, 'float.cdShave', { s: cdShave }), '#38bdf8', 0.98);
      }
    }

    const def = this.getNextWaveDef();
    this.waveIndex = def.waveNumber;
    this.waveActive = true;
    this.betweenWaveTimer = 0;
    this.spawnQueue = def.events.map((e) => ({ ...e }));
    this.spawnTimer = 0;

    const bannerDuration = 2.2;
    const tone: WaveBanner['tone'] =
      def.waveNumber === totalCampaignWaves
        ? 'boss'
        : def.waveNumber > totalCampaignWaves
          ? 'endless'
          : 'normal';
    const localizedDesc =
      def.waveNumber <= totalCampaignWaves
        ? t(this.lang, `wave.${stage.id}.${def.waveNumber}`)
        : t(this.lang, 'wave.endless', { n: def.waveNumber });
    let bannerTitle: string;
    let bannerSubtitle: string;
    if (tone === 'boss') {
      bannerTitle = t(this.lang, 'wave.bannerBoss', { total: totalCampaignWaves });
      bannerSubtitle = localizedDesc;
    } else if (tone === 'endless') {
      bannerTitle = t(this.lang, 'wave.bannerEndless', { n: def.waveNumber });
      bannerSubtitle =
        def.waveNumber % 3 === 0
          ? t(this.lang, 'wave.endlessSubBoss')
          : t(this.lang, 'wave.endlessSubNormal');
    } else {
      bannerTitle = t(this.lang, 'wave.bannerNormal', {
        n: def.waveNumber,
        total: totalCampaignWaves,
      });
      bannerSubtitle = localizedDesc;
    }
    this.waveBanner = {
      title: bannerTitle,
      subtitle: bannerSubtitle,
      timer: bannerDuration,
      maxTimer: bannerDuration,
      tone,
    };

    sfx.waveHorn();
    if (def.waveNumber === totalCampaignWaves) {
      this.callbacks.onToast(t(this.lang, 'toast.bossIncoming'), 'warn');
    } else {
      this.callbacks.onToast(
        t(this.lang, 'wave.toastFmt', { n: def.waveNumber, title: localizedDesc }),
        'info'
      );
    }
    if (this.endlessMode && this.waveIndex >= 15) {
      this.unlockAchievement('endless_15');
    }
    this.syncBgmIntensity();
    this.callbacks.onHudDirty();
  }

  public enterEndlessMode(): void {
    this.endlessMode = true;
    this.victoryShown = false;
    this.paused = false;
    this.betweenWaveTimer = 8;
    this.callbacks.onToast(t(this.lang, 'toast.endlessStart'), 'purple');
    this.syncBgmIntensity();
    this.callbacks.onHudDirty();
  }

  // ---- Tower CRUD ----

  public getTowerAtPad(padId: string): Tower | undefined {
    return this.towers.find((tw) => tw.padId === padId);
  }

  public buildTower(padId: string, type: TowerBaseType): boolean {
    const pad = this.getStage().pads.find((p) => p.id === padId);
    if (!pad || this.getTowerAtPad(padId)) return false;
    const stat = getTowerStat(type, 1, 'none');
    if (this.gold < stat.cost) return false;

    this.gold -= stat.cost;
    const tower: Tower = {
      id: this.nextId++,
      padId: pad.id,
      x: pad.x,
      y: pad.y,
      type,
      level: 1,
      branch: 'none',
      totalSpent: stat.cost,
      cooldownTimer: 0.2,
      shotsFired: 0,
      rampStacks: 0,
      rampDecay: 0,
      recoil: 0,
      rallyPoint: { ...pad.defaultRally },
      guardIds: [],
      targetPriority: 'first',
      kills: 0,
      totalDamage: 0,
      goldEarned: 0,
    };
    this.towers.push(tower);
    this.builtBaseTypes.add(type);
    if (type === 'barracks') {
      this.syncBarracksGuards(tower);
    }
    this.spawnBurst(pad.x, pad.y, '#fde047', 12, 85);
    sfx.build();
    this.checkAllBranchesAchievement();
    this.callbacks.onHudDirty();
    return true;
  }

  public cycleTowerTargetPriority(towerId: number): TargetPriority | null {
    const tw = this.towers.find((x) => x.id === towerId);
    if (!tw || tw.type === 'barracks') return null;
    const current: TargetPriority = tw.targetPriority ?? 'first';
    const next: TargetPriority =
      current === 'first' ? 'strong' : current === 'strong' ? 'weak' : 'first';
    tw.targetPriority = next;
    sfx.inspect?.();
    this.callbacks.onHudDirty();
    return next;
  }

  public upgradeTower(towerId: number, branch: TowerBranch = 'none'): boolean {
    const tw = this.towers.find((x) => x.id === towerId);
    if (!tw || tw.level >= 3) return false;
    const nextLevel = (tw.level + 1) as 2 | 3;
    const targetBranch: TowerBranch = nextLevel === 3 ? (branch === 'b' ? 'b' : 'a') : 'none';
    const stat = getTowerStat(tw.type, nextLevel, targetBranch);
    if (this.gold < stat.cost) return false;

    this.gold -= stat.cost;
    tw.level = nextLevel;
    tw.branch = targetBranch;
    tw.totalSpent += stat.cost;
    tw.recoil = 1;
    if (tw.type === 'barracks') {
      this.syncBarracksGuards(tw);
    }
    if (nextLevel === 3) {
      this.lv3TowersReached.add(tw.id);
    }
    this.spawnBurst(tw.x, tw.y - 16, nextLevel === 3 ? '#c084fc' : '#38bdf8', 18, 110);
    sfx.build();
    this.checkAllBranchesAchievement();
    this.callbacks.onHudDirty();
    return true;
  }

  public sellTower(towerId: number): boolean {
    const idx = this.towers.findIndex((x) => x.id === towerId);
    if (idx === -1) return false;
    const tw = this.towers[idx];
    const refund = Math.round(tw.totalSpent * 0.72);
    this.gold += refund;
    // Despawn all guards belonging to this tower and release every engaged enemy cleanly
    const removedGuardIds = new Set<number>();
    for (const g of this.guards) {
      if (g.towerId === tw.id) {
        removedGuardIds.add(g.id);
        if (g.engagedEnemyId !== null) {
          this.releaseEnemyFromGuard(g.engagedEnemyId, g.id);
        }
        if (g.alive) {
          this.spawnBurst(g.x, g.y - 6, '#cbd5e1', 5, 45);
        }
      }
    }
    if (removedGuardIds.size > 0) {
      for (const e of this.enemies) {
        if (e.engagedByGuardId !== null && removedGuardIds.has(e.engagedByGuardId)) {
          e.engagedByGuardId = null;
        }
      }
      this.guards = this.guards.filter((g) => !removedGuardIds.has(g.id));
    }
    tw.guardIds = [];
    this.towers.splice(idx, 1);
    this.addFloatText(tw.x, tw.y - 24, `+${refund}$`, '#facc15', 1.1);
    this.spawnBurst(tw.x, tw.y, '#94a3b8', 10, 70);
    sfx.sell();
    this.callbacks.onHudDirty();
    return true;
  }

  public setBarracksRally(towerId: number, x: number, y: number): boolean {
    const tw = this.towers.find((t0) => t0.id === towerId);
    if (!tw || tw.type !== 'barracks') return false;
    const stat = getTowerStat(tw.type, tw.level, tw.branch);
    let rx = x;
    let ry = y;
    const clampToRange = (px: number, py: number) => {
      const d = Math.hypot(px - tw.x, py - tw.y);
      if (d > stat.range && d > 0.001) {
        const ratio = stat.range / d;
        return { x: tw.x + (px - tw.x) * ratio, y: tw.y + (py - tw.y) * ratio };
      }
      return { x: px, y: py };
    };
    ({ x: rx, y: ry } = clampToRange(rx, ry));
    // Snap gently onto nearest road centerline if close so guards form a tight roadblock
    const road = closestStageRoadSample(this.stageId, rx, ry);
    if (road.distToRoad <= 46) {
      ({ x: rx, y: ry } = clampToRange(road.x, road.y));
    }
    tw.rallyPoint = { x: rx, y: ry };
    this.syncBarracksGuards(tw);
    // Disengage guards from faraway fights so they reposition immediately to the new flag
    for (const g of this.guards) {
      if (g.towerId === tw.id && g.engagedEnemyId !== null) {
        const en = this.enemies.find((e) => e.id === g.engagedEnemyId);
        if (!en || Math.hypot(en.x - g.homeX, en.y - g.homeY) > 95) {
          this.releaseEnemyFromGuard(g.engagedEnemyId, g.id);
          g.engagedEnemyId = null;
        }
      }
    }
    this.movePing = { x: rx, y: ry, timer: 0.7 };
    sfx.build();
    return true;
  }

  private syncBarracksGuards(tw: Tower): void {
    const stat = getTowerStat(tw.type, tw.level, tw.branch);
    // Orient 3-guard chevron cleanly across and along the road at rallyPoint
    const road = closestStageRoadSample(this.stageId, tw.rallyPoint.x, tw.rallyPoint.y);
    const tx = road.tx;
    const ty = road.ty;
    const nx = road.nx;
    const ny = road.ny;
    const offsets = [
      { x: tx * 11 + nx * 13, y: ty * 11 + ny * 13 },
      { x: tx * 11 - nx * 13, y: ty * 11 - ny * 13 },
      { x: -tx * 13, y: -ty * 13 },
    ];
    const variant: Guard['variant'] =
      tw.level === 3 ? (tw.branch === 'a' ? 'vouched' : 'bot') : 'normal';

    const existing = this.guards.filter((g) => g.towerId === tw.id);
    while (existing.length < 3) {
      const i = existing.length;
      const g: Guard = {
        id: this.nextId++,
        towerId: tw.id,
        x: tw.x,
        y: tw.y + 8,
        homeX: tw.rallyPoint.x + offsets[i].x,
        homeY: tw.rallyPoint.y + offsets[i].y,
        hp: stat.guardHp ?? 90,
        maxHp: stat.guardHp ?? 90,
        damage: stat.guardDamage ?? 8,
        armor: stat.guardArmor ?? 0.08,
        attackTimer: 0,
        attackCooldown: stat.cooldown,
        engagedEnemyId: null,
        respawnTimer: 0,
        alive: true,
        facing: -1,
        walkPhase: Math.random() * 6,
        hitFlash: 0,
        lungeTimer: 0,
        variant,
        salutingVip: false,
      };
      this.guards.push(g);
      existing.push(g);
    }

    existing.forEach((g, idx) => {
      const off = offsets[idx % 3];
      g.homeX = tw.rallyPoint.x + off.x;
      g.homeY = tw.rallyPoint.y + off.y;
      const newMax = stat.guardHp ?? 90;
      if (newMax > g.maxHp) {
        g.hp += newMax - g.maxHp;
      }
      g.maxHp = newMax;
      g.damage = stat.guardDamage ?? 8;
      g.armor = stat.guardArmor ?? 0.08;
      g.attackCooldown = stat.cooldown;
      g.variant = variant;
    });
    tw.guardIds = existing.map((g) => g.id);
  }

  // ---- Hero & Ultimates ----

  public moveHeroTo(x: number, y: number): void {
    if (!this.hero.alive) return;
    const maxX = Math.max(40, this.getStage().castlePos.x - 55);
    const clampedX = Math.max(40, Math.min(maxX, x));
    const clampedY = Math.max(70, Math.min(660, y));
    this.hero.targetX = clampedX;
    this.hero.targetY = clampedY;

    // Immediately disengage Lord Theo cleanly from any melee combat
    if (this.hero.engagedEnemyId !== null) {
      this.hero.engagedEnemyId = null;
    }
    for (const e of this.enemies) {
      if (e.engagedByHero) e.engagedByHero = false;
    }

    // If user clicked directly on/near an active VIP, auto-intercept & escort that VIP!
    let targetVip: VipUnit | null = null;
    let bestVipDist = 58;
    for (const v of this.vips) {
      if (v.fleeing) continue;
      const d = Math.hypot(v.x - clampedX, v.y - clampedY);
      if (d < bestVipDist) {
        bestVipDist = d;
        targetVip = v;
      }
    }

    if (targetVip) {
      this.heroChaseVipId = targetVip.id;
      this.heroIgnoreVipTimer = 0;
    } else {
      this.heroChaseVipId = null;
      // Clicking away from an escorted VIP immediately breaks escort stance without snapping back
      if (this.hero.escortingVipId !== null || this.hero.stance === 'vip') {
        this.hero.escortingVipId = null;
        this.hero.stance = 'idle';
        this.heroIgnoreVipTimer = 0.85;
      } else {
        this.hero.stance = 'idle';
      }
    }

    // Keep attack timer primed so he responds snappily on reaching a fight
    this.hero.attackTimer = Math.min(this.hero.attackTimer, 0.18);
    this.movePing = { x: this.hero.targetX, y: this.hero.targetY, timer: 0.7 };
  }

  public castStealTelemetry(): boolean {
    if (this.gameOver || this.pendingPolicies !== null || this.skillCds.steal > 0) return false;
    this.skillCds.steal = SKILL_CDS.steal;
    this.signFlipTimer = 2.6;
    this.stats.stealCasts++;

    const hasStealth = this.hasPolicy('stealth_pipes');
    const goldMult = hasStealth ? 1.35 : 1;
    const perEnemy = Math.round(18 * goldMult);
    const perVip = Math.round(25 * goldMult);
    const minEarn = Math.round(45 * goldMult);

    let earned = 0;
    const targets: Array<{ x: number; y: number; isVip: boolean }> = [];

    for (const e of this.enemies) {
      earned += perEnemy;
      targets.push({ x: e.x, y: e.y - 12, isVip: false });
      this.addFloatText(e.x, e.y - 28, `+${perEnemy}$`, '#d8b4fe', 0.95);
    }
    for (const v of this.vips) {
      if (!v.fleeing) {
        earned += perVip;
        targets.push({ x: v.x, y: v.y - 16, isVip: true });
        this.addFloatText(v.x, v.y - 30, t(this.lang, 'float.stealth', { g: perVip }), '#fde047', 0.95);
      }
    }
    if (earned < minEarn) earned = minEarn;
    this.gold += earned;
    this.stats.goldStolen += earned;

    for (const tgt of targets) {
      this.suctionBeams.push({
        targetX: tgt.x,
        targetY: tgt.y,
        isVip: tgt.isVip,
        life: 1.4,
        maxLife: 1.4,
      });
    }

    // Drop 2–3 leaked data puddles on the road
    const puddleCount = Math.min(3, Math.max(2, Math.floor(targets.length / 3)));
    for (let i = 0; i < puddleCount; i++) {
      let px: number;
      let py: number;
      if (targets.length > 0) {
        const pick = targets[Math.floor(Math.random() * targets.length)];
        px = pick.x + (Math.random() - 0.5) * 28;
        py = pick.y + (Math.random() - 0.5) * 18;
      } else {
        const lowerUnlockWave = this.getStage().entryMarkers[1].unlockWave;
        const dualActive = this.waveIndex >= lowerUnlockWave || lowerUnlockWave <= 1;
        const lane = (dualActive ? i % 2 : 0) as 0 | 1;
        const pt = sampleStagePathAt(this.stageId, lane, 320 + Math.random() * 520, 0);
        px = pt.x;
        py = pt.y;
      }
      this.leakPuddles.push({
        id: this.nextId++,
        x: px,
        y: py,
        radius: 34,
        pulse: Math.random() * 6,
      });
    }
    while (this.leakPuddles.length > 5) {
      this.leakPuddles.shift();
    }

    const castle = this.getStage().castlePos;
    this.addFloatText(castle.x - 10, castle.y - 165, t(this.lang, 'float.telemetry', { g: earned }), '#e879f9', 1.3);
    this.spawnBurst(castle.x, castle.y - 95, '#c084fc', 18, 110);
    if (targets.length > 0) {
      const coinSamples = Math.min(6, targets.length);
      const perCoinAmt = Math.max(1, Math.round(earned / coinSamples));
      for (let i = 0; i < coinSamples; i++) {
        const idx = Math.floor((i * targets.length) / coinSamples);
        const tgt = targets[idx];
        this.spawnFlyingCoins(tgt.x, tgt.y, perCoinAmt, 1);
      }
    } else {
      this.spawnFlyingCoins(castle.x, castle.y - 95, earned, 3);
    }
    sfx.stealTelemetry();
    this.callbacks.onToast(t(this.lang, 'toast.stealOk', { g: earned }), 'purple');

    this.addLeakAlarm(hasStealth ? 28 : 34);
    this.callbacks.onHudDirty();
    return true;
  }

  public castFakeDeleteRug(x: number, y: number): boolean {
    if (this.gameOver || this.pendingPolicies !== null || this.skillCds.rug > 0) return false;
    this.skillCds.rug = Math.max(8, SKILL_CDS.rug - (this.hasPolicy('vacuum_carpet') ? 8 : 0));
    const radius = 92;

    const trapped: Enemy[] = [];
    const remainingEnemies: Enemy[] = [];
    for (const e of this.enemies) {
      if (!e.isBoss && trapped.length < 8 && Math.hypot(e.x - x, e.y - y) <= radius) {
        if (e.engagedByGuardId !== null) {
          this.releaseGuardFromEnemy(e.engagedByGuardId, e.id);
          e.engagedByGuardId = null;
        }
        if (e.engagedByHero) {
          e.engagedByHero = false;
          if (this.hero.engagedEnemyId === e.id) this.hero.engagedEnemyId = null;
        }
        trapped.push(e);
      } else {
        remainingEnemies.push(e);
      }
    }
    this.enemies = remainingEnemies;

    // Clean nearby leak puddles!
    const beforePuddles = this.leakPuddles.length;
    this.leakPuddles = this.leakPuddles.filter((p) => Math.hypot(p.x - x, p.y - y) > radius + 24);
    const cleaned = beforePuddles - this.leakPuddles.length;

    const alarmDrop = 25 + cleaned * 6;
    this.leakAlarm = Math.max(0, this.leakAlarm - alarmDrop);

    this.fakeRugs.push({
      id: this.nextId++,
      x,
      y,
      radius: 56,
      elapsed: 0,
      duration: 25,
      trapped,
      cleanedPuddles: cleaned,
    });

    this.spawnBurst(x, y, '#fbbf24', 18, 100);
    this.addFloatText(
      x,
      y - 26,
      trapped.length > 0
        ? t(this.lang, 'float.swept', { n: trapped.length, p: alarmDrop })
        : t(this.lang, 'float.cleaned', { p: alarmDrop }),
      '#fde047',
      1.15
    );
    sfx.rugSweep();
    if (trapped.length >= 4 || cleaned >= 2) {
      this.unlockAchievement('carpet_combo');
    }
    this.callbacks.onHudDirty();
    return true;
  }

  public castFourAmDelete(x: number, y: number): boolean {
    if (this.gameOver || this.pendingPolicies !== null || this.skillCds.delete > 0) return false;
    this.skillCds.delete = SKILL_CDS.delete;
    this.stats.deletesDropped++;

    const del: FallingDeleteKey = {
      x,
      y,
      radius: 108,
      elapsed: 0,
      impactTime: 0.52,
      impacted: false,
      fadeTime: 1.5,
    };
    this.deleteCastTimes.set(del, this.time);
    this.fallingDeletes.push(del);
    this.callbacks.onHudDirty();
    return true;
  }

  public castRingLightApology(): boolean {
    if (this.gameOver || this.pendingPolicies !== null || this.skillCds.apology > 0 || !this.hero.alive) return false;
    this.skillCds.apology = SKILL_CDS.apology;
    this.hero.apologyCasts++;
    this.stats.apologiesCasted++;
    this.hero.apologyAuraTimer = 3.6;

    const casts = this.hero.apologyCasts;
    const duration = casts === 1 ? 5.5 : casts === 2 ? 2.8 : 1.0;
    const slowAmt = casts === 1 ? 0.65 : casts === 2 ? 0.48 : 0.25;

    for (const e of this.enemies) {
      e.slowTimer = Math.max(e.slowTimer, duration);
      e.slowFactor = Math.max(e.slowFactor, slowAmt);
      if (casts === 1 && !e.isBoss) {
        e.stunTimer = Math.max(e.stunTimer, 1.1);
      } else if (casts >= 3) {
        e.bubbleText = t(this.lang, 'bubble.apologyLoop');
        e.bubbleTimer = 2.6;
      } else if (casts === 2 && Math.random() < 0.5) {
        e.bubbleText = t(this.lang, 'bubble.apologyAgain');
        e.bubbleTimer = 2.2;
      }
    }

    // Spawn 2 temporary fan guards next to Lord Theo
    const offsets = [
      { x: -24, y: 12 },
      { x: 24, y: 12 },
    ];
    for (const off of offsets) {
      this.guards.push({
        id: this.nextId++,
        towerId: null,
        x: this.hero.x + off.x,
        y: this.hero.y + off.y,
        homeX: this.hero.x + off.x,
        homeY: this.hero.y + off.y,
        hp: 110 + this.hero.level * 15,
        maxHp: 110 + this.hero.level * 15,
        damage: 11 + this.hero.level * 2,
        armor: 0.15,
        attackTimer: 0,
        attackCooldown: 0.85,
        engagedEnemyId: null,
        respawnTimer: 0,
        alive: true,
        facing: -1,
        walkPhase: 0,
        hitFlash: 0,
        lungeTimer: 0,
        tempLife: 16,
        variant: 'fan',
        salutingVip: false,
      });
    }

    this.leakAlarm = Math.max(0, this.leakAlarm - 22);
    const pool = getHeroBubbles(this.lang).apology;
    this.hero.bubbleText = pool[Math.floor(Math.random() * pool.length)];
    this.hero.bubbleTimer = 2.8;

    this.spawnBurst(this.hero.x, this.hero.y - 18, '#fef08a', 22, 130);
    sfx.apology();

    const toastKey = casts === 1 ? 'toast.apology1' : casts === 2 ? 'toast.apology2' : 'toast.apology3';
    this.callbacks.onToast(t(this.lang, toastKey), casts === 1 ? 'good' : 'warn');
    this.callbacks.onHudDirty();
    return true;
  }

  private addLeakAlarm(amount: number): void {
    const scaled = amount * DIFFICULTY_CONFIG[this.difficulty].alarmMult;
    this.leakAlarm = Math.min(100, this.leakAlarm + scaled);
    if (this.leakAlarm >= 100) {
      this.triggerLeakRaid();
    }
  }

  private triggerLeakRaid(): void {
    this.leakAlarm = 25;
    this.leakFlashTimer = 2.4;
    this.screenShake = Math.max(this.screenShake, 10);
    this.stats.leakRaidsTriggered++;
    // Consume exposed leak puddles as evidence when the raid triggers so they don't loop raids
    if (this.leakPuddles.length > 0) {
      for (const p of this.leakPuddles) {
        this.spawnBurst(p.x, p.y, '#e879f9', 6, 55);
      }
      this.leakPuddles = [];
    }
    sfx.alarmSiren();
    this.callbacks.onToast(t(this.lang, 'toast.leakRaid'), 'warn');

    // Spawn 3–6 armored auditors rushing from left entrances (scales in Endless)
    const stage = this.getStage();
    const totalCampaignWaves = stage.waves.length;
    const lowerUnlockWave = stage.entryMarkers[1].unlockWave;
    const count =
      this.waveIndex > totalCampaignWaves
        ? 4 + Math.min(2, Math.floor((this.waveIndex - totalCampaignWaves) / 3))
        : this.waveIndex >= 6
          ? 4
          : 3;
    for (let i = 0; i < count; i++) {
      const dualActive = this.waveIndex >= lowerUnlockWave || lowerUnlockWave <= 1;
      const lane = (dualActive ? i % 2 : 0) as 0 | 1;
      const e = this.spawnEnemy('auditor', lane);
      e.enraged = true;
      e.dist = Math.max(0, i * 28);
      const pos = sampleStagePathAt(this.stageId, e.lane, e.dist, e.laneOffset);
      e.x = pos.x;
      e.y = pos.y;
      e.bubbleText = t(this.lang, 'bubble.auditorLeak');
      e.bubbleTimer = 3.0;
    }
    this.syncBgmIntensity();
  }

  // ---- Spawning ----

  private spawnEnemy(kind: EnemyKind, lane: 0 | 1): Enemy {
    const arch = ENEMY_ARCHETYPES[kind];
    const diff = DIFFICULTY_CONFIG[this.difficulty];
    const endlessTier = Math.max(0, this.waveIndex - this.getStage().waves.length);
    const endlessHpScale =
      endlessTier > 0 ? 1 + endlessTier * 0.16 + endlessTier * endlessTier * 0.015 : 1;
    const endlessDmgScale = endlessTier > 0 ? 1 + endlessTier * 0.08 : 1;
    const laneOffset = (Math.random() - 0.5) * 22;
    const pos = sampleStagePathAt(this.stageId, lane, 0, laneOffset);
    const scaledHp = Math.round(arch.hp * endlessHpScale * diff.hpMult);
    const e: Enemy = {
      id: this.nextId++,
      kind,
      lane,
      dist: 0,
      x: pos.x,
      y: pos.y,
      laneOffset,
      hp: scaledHp,
      maxHp: scaledHp,
      baseSpeed: arch.speed * diff.speedMult,
      armor: arch.armor,
      magicResist: arch.magicResist,
      reward: arch.reward,
      lifeCost: arch.lifeCost,
      radius: arch.radius,
      isBoss: arch.isBoss,
      engagedByGuardId: null,
      engagedByHero: false,
      attackTimer: 0.4,
      attackDamage: Math.round(arch.attackDamage * endlessDmgScale),
      slowTimer: 0,
      slowFactor: 0,
      stunTimer: 0,
      enraged: false,
      hitFlash: 0,
      lungeTimer: 0,
      walkPhase: Math.random() * 6,
      bubbleText: null,
      bubbleTimer: 0,
      bossAuraTimer: 4.5,
    };
    this.enemies.push(e);
    if (arch.isBoss) {
      (sfx as unknown as { bossSpawn?: () => void }).bossSpawn?.();
    }
    return e;
  }

  private spawnVip(lane: 0 | 1): VipUnit {
    const stage = this.getStage();
    const laneOffset = (Math.random() - 0.5) * 14;
    const pos = sampleStagePathAt(this.stageId, lane, 0, laneOffset);
    const hasFirstClass = this.hasPolicy('vip_first_class');
    const v: VipUnit = {
      id: this.nextId++,
      lane,
      dist: 0,
      x: pos.x,
      y: pos.y,
      laneOffset,
      baseSpeed: hasFirstClass ? 54 * 1.25 : 54,
      payout: VIP_PAYOUT + (hasFirstClass ? 45 : 0),
      escortedByHero: false,
      escortTime: 0,
      aoeShieldUsed: false,
      fleeing: false,
      fleeTimer: 0,
      walkPhase: Math.random() * 6,
      bubbleText: t(this.lang, 'bubble.vipArrive'),
      bubbleTimer: 3.8,
    };
    this.vips.push(v);

    // Clear early heads-up so players can send Lord Theo & hold mortar/delete fire
    const entryY = stage.entryBadges[lane].y;
    this.addFloatText(
      98,
      entryY - 22,
      t(this.lang, 'float.vipIncoming'),
      '#fde047',
      1.22
    );
    this.pushParticle({
      x: 64,
      y: entryY,
      vx: 0,
      vy: 0,
      size: 46,
      color: '#fde047',
      life: 0.55,
      maxLife: 0.55,
      ring: true,
    });
    this.spawnBurst(64, entryY, '#fde047', 10, 80);
    sfx.coin();

    this.callbacks.onToast(
      t(this.lang, lane === 0 ? 'toast.vipIncoming0' : 'toast.vipIncoming1'),
      'good'
    );
    return v;
  }

  // ---- Main Simulation Tick ----

  public update(rawDt: number): void {
    if (this.paused || this.gameOver || this.pendingPolicies !== null) return;
    if (!Number.isFinite(rawDt) || rawDt <= 0) return;
    const scaledDt = Math.min(0.05, rawDt) * this.speedMultiplier;
    // Sub-step cleanly when scaledDt > 0.04 (e.g. 3x speed) so fast MIT Fork runners,
    // projectiles, and melee collisions remain deterministic and never tunnel.
    const steps = scaledDt > 0.04 ? Math.min(6, Math.ceil(scaledDt / 0.035)) : 1;
    const stepDt = scaledDt / steps;
    for (let i = 0; i < steps; i++) {
      if (this.paused || this.gameOver || this.pendingPolicies !== null) break;
      this.stepSimulation(stepDt);
    }
    this.syncBgmIntensity();
  }

  private stepSimulation(dt: number): void {
    this.time += dt;

    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 28);
    if (this.signFlipTimer > 0) this.signFlipTimer = Math.max(0, this.signFlipTimer - dt);
    if (this.leakFlashTimer > 0) this.leakFlashTimer = Math.max(0, this.leakFlashTimer - dt);
    if (this.heroIgnoreVipTimer > 0) {
      this.heroIgnoreVipTimer = Math.max(0, this.heroIgnoreVipTimer - dt);
    }
    if (this.movePing) {
      this.movePing.timer -= dt;
      if (this.movePing.timer <= 0) this.movePing = null;
    }
    if (this.waveBanner) {
      this.waveBanner.timer -= dt;
      if (this.waveBanner.timer <= 0) this.waveBanner = null;
    }

    // Tick down temporary per-enemy buff/debuff timers
    this.tickTimerMap(this.forkBoostTimers, dt);
    this.tickTimerMap(this.bossRallyTimers, dt);
    this.tickTimerMap(this.armorShredTimers, dt);

    // Skill cooldowns recharge once wave 1 has started (prevents pre-wave AFK gold farming)
    if (this.waveIndex > 0) {
      this.skillCds.steal = Math.max(0, this.skillCds.steal - dt);
      this.skillCds.rug = Math.max(0, this.skillCds.rug - dt);
      this.skillCds.delete = Math.max(0, this.skillCds.delete - dt);
      this.skillCds.apology = Math.max(0, this.skillCds.apology - dt);
    }

    // Uncleaned leak puddles slowly tick leak alarm up (capped to prevent runaway loops)
    if (this.leakPuddles.length > 0 && this.waveActive) {
      this.addLeakAlarm(Math.min(3.2, this.leakPuddles.length * 0.9) * dt);
    }
    if (this.waveActive && this.hasPolicy('rage_overclock')) {
      this.addLeakAlarm(0.35 * dt);
    }
    for (const p of this.leakPuddles) p.pulse += dt * 3.5;

    // Spawn queue
    if (this.spawnQueue.length > 0) {
      this.spawnTimer += dt;
      while (this.spawnQueue.length > 0 && this.spawnTimer >= this.spawnQueue[0].delay) {
        const ev = this.spawnQueue.shift()!;
        this.spawnTimer -= ev.delay;
        if (ev.entityType === 'vip') {
          this.spawnVip(ev.lane);
        } else {
          this.spawnEnemy(ev.entityType, ev.lane);
        }
      }
    }

    this.updateFakeRugs(dt);
    this.updateFallingDeletes(dt);
    this.updateVips(dt);
    this.updateHero(dt);
    this.updateGuards(dt);
    this.updateEnemies(dt);
    this.updateTowers(dt);
    this.updateProjectiles(dt);
    this.updateEffects(dt);
    this.checkWaveCompletion(dt);
  }

  private tickTimerMap(map: Map<number, number>, dt: number): void {
    if (map.size === 0) return;
    for (const [id, remain] of map) {
      const next = remain - dt;
      if (next <= 0) map.delete(id);
      else map.set(id, next);
    }
  }

  private updateFakeRugs(dt: number): void {
    const remaining: FakeRug[] = [];
    for (const rug of this.fakeRugs) {
      rug.elapsed += dt;
      if (rug.elapsed >= rug.duration) {
        // 41.6 GB EXPLOSION!
        this.stats.rugsBurst++;
        this.lastRugBurstTime = this.time;
        this.screenShake = Math.max(this.screenShake, 11);
        sfx.rugBurst();
        this.spawnBurst(rug.x, rug.y, '#ef4444', 28, 160);
        this.spawnBurst(rug.x, rug.y, '#facc15', 16, 120);
        this.addFloatText(rug.x, rug.y - 36, t(this.lang, 'float.burst'), '#f87171', 1.35);

        if (rug.trapped.length > 0) {
          this.callbacks.onToast(t(this.lang, 'toast.rugBurst'), 'warn');
          const stagePaths = this.getStage().sampledPaths;
          rug.trapped.forEach((e, idx) => {
            const path = stagePaths[e.lane];
            // Prevent unfair instant-breach if rug erupted right next to the castle gate
            const maxSafeDist = Math.max(40, path.totalLength - 135);
            e.dist = Math.max(10, Math.min(e.dist, maxSafeDist) - idx * 8);
            const pos = sampleStagePathAt(this.stageId, e.lane, e.dist, e.laneOffset);
            e.x = pos.x;
            e.y = pos.y;
            e.maxHp = Math.round(e.maxHp * 1.25);
            e.hp = Math.max(1, Math.min(e.maxHp, Math.round(e.hp * 1.25)));
            e.enraged = true;
            e.stunTimer = this.hasPolicy('vacuum_carpet') ? 1.8 : 1.15; // crisp landing window for the 4AM Delete combo!
            e.slowTimer = 0;
            e.slowFactor = 0;
            e.engagedByGuardId = null;
            e.engagedByHero = false;
            e.bubbleText = t(this.lang, 'bubble.rugNotDeleted');
            e.bubbleTimer = 2.4;
            this.enemies.push(e);
          });
        }
      } else {
        remaining.push(rug);
      }
    }
    this.fakeRugs = remaining;
  }

  private updateFallingDeletes(dt: number): void {
    const remaining: FallingDeleteKey[] = [];
    for (const d of this.fallingDeletes) {
      d.elapsed += dt;
      if (!d.impacted && d.elapsed >= d.impactTime) {
        d.impacted = true;
        this.screenShake = Math.max(this.screenShake, 15);
        sfx.deleteSlam();
        this.spawnBurst(d.x, d.y, '#ef4444', 32, 185);
        this.pushParticle({
          x: d.x,
          y: d.y,
          vx: 0,
          vy: 0,
          size: d.radius,
          color: '#f87171',
          life: 0.4,
          maxLife: 0.4,
          ring: true,
        });

        // True damage to all enemies in blast
        let damagedCount = 0;
        for (const e of [...this.enemies]) {
          if (Math.hypot(e.x - d.x, e.y - d.y) <= d.radius + e.radius * 0.5) {
            if (this.damageEnemy(e, 240, 'true')) {
              damagedCount++;
            }
          }
        }
        const castTime = this.deleteCastTimes.get(d) ?? this.time;
        const withinBurstWindow =
          this.lastRugBurstTime >= 0 &&
          this.time >= this.lastRugBurstTime &&
          (this.time - this.lastRugBurstTime <= 4.5 ||
            (castTime >= this.lastRugBurstTime && castTime - this.lastRugBurstTime <= 4.5));
        if (withinBurstWindow && damagedCount >= 2) {
          this.unlockAchievement('carpet_nuke');
        }
        // Check VIP friendly fire!
        this.checkVipSplash(d.x, d.y, d.radius);

        // Leave permanent ARCHIVED scorch crater (capped FIFO at 10 for Endless stability)
        this.scorchCraters.push({
          id: this.nextId++,
          x: d.x,
          y: d.y,
          radius: 54,
        });
        while (this.scorchCraters.length > MAX_SCORCH_CRATERS) {
          this.scorchCraters.shift();
        }
      }
      if (d.elapsed < d.fadeTime) {
        remaining.push(d);
      }
    }
    this.fallingDeletes = remaining;
  }

  private checkVipSplash(x: number, y: number, radius: number): void {
    for (const vip of this.vips) {
      if (vip.fleeing) continue;
      if (Math.hypot(vip.x - x, vip.y - y) <= radius + 12) {
        if (vip.escortedByHero && !vip.aoeShieldUsed) {
          vip.aoeShieldUsed = true;
          this.spawnBurst(vip.x, vip.y - 16, '#fde047', 12, 80);
          this.callbacks.onToast(t(this.lang, 'toast.vipShielded'), 'info');
          continue;
        }
        // VIP scared off!
        vip.fleeing = true;
        vip.fleeTimer = 2.4;
        vip.bubbleText = t(this.lang, 'bubble.vipFlee');
        vip.bubbleTimer = 2.4;
        const penalty = VIP_PENALTY + (this.hasPolicy('vip_first_class') ? 25 : 0);
        const fine = Math.min(this.gold, penalty);
        this.gold -= fine;
        this.stats.vipsScared++;
        this.addFloatText(vip.x, vip.y - 34, t(this.lang, 'float.vipMad', { g: penalty }), '#ef4444', 1.3);
        sfx.vipPenalty();
        this.callbacks.onToast(t(this.lang, 'toast.vipHit', { g: penalty }), 'warn');
        this.callbacks.onHudDirty();
      }
    }
  }

  private updateVips(dt: number): void {
    const stage = this.getStage();
    const alive: VipUnit[] = [];
    for (const v of this.vips) {
      if (v.bubbleTimer > 0) {
        v.bubbleTimer -= dt;
        if (v.bubbleTimer <= 0) v.bubbleText = null;
      }

      if (v.fleeing) {
        v.fleeTimer -= dt;
        v.dist = Math.max(0, v.dist - 165 * dt);
        const pos = sampleStagePathAt(this.stageId, v.lane, v.dist, v.laneOffset);
        const dxFlee = pos.x - v.x;
        if (Math.abs(dxFlee) > 0.15) v.facing = dxFlee >= 0 ? 1 : -1;
        v.x = pos.x;
        v.y = pos.y;
        v.walkPhase += dt * 16;
        if (v.fleeTimer > 0 && v.dist > 5) alive.push(v);
        continue;
      }

      // Check if actively escorted by Lord Theo (clears cleanly if Theo dies or walks away!)
      const heroNear =
        this.hero.alive &&
        this.heroIgnoreVipTimer <= 0 &&
        Math.hypot(this.hero.x - v.x, this.hero.y - v.y) <= 82;
      v.escortedByHero = heroNear;
      if (heroNear) {
        v.escortTime += dt;
      }

      const speed = v.baseSpeed * (heroNear ? 1.38 : 1);
      v.dist += speed * dt;
      v.walkPhase += dt * (heroNear ? 10 : 7);

      const path = stage.sampledPaths[v.lane];
      const pos = sampleStagePathAt(this.stageId, v.lane, v.dist, v.laneOffset);
      const dxVip = pos.x - v.x;
      if (Math.abs(dxVip) > 0.15) v.facing = dxVip >= 0 ? 1 : -1;
      v.x = pos.x;
      v.y = pos.y;

      if (v.dist >= path.totalLength - 8) {
        // Reached Castle!
        const doubled = v.escortTime >= 1.2 || heroNear;
        const policyBonus = this.hasPolicy('vip_first_class') ? 45 : 0;
        const pay = (doubled ? VIP_ESCORT_PAYOUT : VIP_PAYOUT) + policyBonus;
        this.gold += pay;
        this.stats.vipsEscorted++;
        if (doubled) {
          this.grantHeroXp(35);
          this.callbacks.onToast(t(this.lang, 'toast.vipEscorted', { g: pay }), 'good');
          this.unlockAchievement('first_vip');
        } else {
          this.callbacks.onToast(t(this.lang, 'toast.vipEntered', { g: pay }), 'good');
        }
        const castle = stage.castlePos;
        this.spawnFlyingCoins(castle.x - 32, castle.y - 24, pay, doubled ? 6 : 4);
        this.addFloatText(castle.x - 36, castle.y - 40, `+${pay}$ ${t(this.lang, 'canvas.vip')}`, '#fde047', 1.3);
        this.spawnBurst(castle.x - 30, castle.y, '#fde047', 16, 95);
        sfx.vipSuccess();
        this.callbacks.onHudDirty();
      } else {
        alive.push(v);
      }
    }
    this.vips = alive;
  }

  private updateHero(dt: number): void {
    const h = this.hero;
    if (h.hitFlash > 0) h.hitFlash = Math.max(0, h.hitFlash - dt * 5);
    if (h.lungeTimer && h.lungeTimer > 0) h.lungeTimer = Math.max(0, h.lungeTimer - dt);
    if (h.apologyAuraTimer > 0) h.apologyAuraTimer = Math.max(0, h.apologyAuraTimer - dt);
    if (h.bubbleTimer > 0) {
      h.bubbleTimer -= dt;
      if (h.bubbleTimer <= 0) h.bubbleText = null;
    }

    if (!h.alive) {
      h.respawnTimer -= dt;
      if (h.respawnTimer <= 0) {
        const castle = this.getStage().castlePos;
        h.alive = true;
        h.hp = h.maxHp;
        h.x = castle.x - 125;
        h.y = castle.y + 6;
        h.targetX = castle.x - 205;
        h.targetY = castle.y + 6;
        h.stance = 'idle';
        h.escortingVipId = null;
        h.engagedEnemyId = null;
        this.spawnBurst(h.x, h.y, '#38bdf8', 16, 90);
        this.addFloatText(
          h.x,
          h.y - 40,
          t(this.lang, 'float.theoReturns'),
          '#38bdf8',
          1.15
        );
        this.callbacks.onHudDirty();
      }
      return;
    }

    // If user clicked directly on a VIP, dynamically intercept them until within escort range
    if (this.heroChaseVipId !== null) {
      const chased = this.vips.find((v) => v.id === this.heroChaseVipId && !v.fleeing);
      if (chased) {
        const d = Math.hypot(chased.x - h.x, chased.y - h.y);
        if (d <= 52) {
          this.heroChaseVipId = null;
          h.targetX = h.x;
          h.targetY = h.y;
        } else {
          const maxX = Math.max(40, this.getStage().castlePos.x - 55);
          h.targetX = Math.max(40, Math.min(maxX, chased.x - 16));
          h.targetY = Math.max(70, Math.min(660, chased.y + 8));
        }
      } else {
        this.heroChaseVipId = null;
      }
    }

    // Move toward target if user commanded him
    const dx = h.targetX - h.x;
    const dy = h.targetY - h.y;
    const moveDist = Math.hypot(dx, dy);

    // Check nearby VIP for auto-bowing escort stance (unless player just pulled him away)
    let nearVip: VipUnit | null = null;
    if (this.heroIgnoreVipTimer <= 0) {
      let bestVipDist = 82;
      for (const v of this.vips) {
        if (v.fleeing) continue;
        const d = Math.hypot(v.x - h.x, v.y - h.y);
        if (d < bestVipDist) {
          bestVipDist = d;
          nearVip = v;
        }
      }
    }

    if (moveDist > 6) {
      const step = Math.min(moveDist, h.speed * dt);
      h.x += (dx / moveDist) * step;
      h.y += (dy / moveDist) * step;
      h.facing = dx >= 0 ? 1 : -1;
      h.walkPhase += dt * 13;
      h.stance = nearVip ? 'vip' : 'idle';
      h.escortingVipId = nearVip ? nearVip.id : null;
      this.heroRegenIdle += dt;
    } else if (nearVip) {
      // Escort VIP automatically!
      h.stance = 'vip';
      h.escortingVipId = nearVip.id;
      // Gently jog alongside VIP
      const ex = nearVip.x - 24;
      const ey = nearVip.y + 12;
      const edx = ex - h.x;
      const edy = ey - h.y;
      const ed = Math.hypot(edx, edy);
      if (ed > 4) {
        const step = Math.min(ed, h.speed * 0.92 * dt);
        h.x += (edx / ed) * step;
        h.y += (edy / ed) * step;
        h.targetX = h.x;
        h.targetY = h.y;
        h.walkPhase += dt * 10;
      }
      h.facing = 1;
      if (!h.bubbleText && Math.random() < dt * 0.65) {
        const list = getHeroBubbles(this.lang).vip;
        h.bubbleText = list[Math.floor(Math.random() * list.length)];
        h.bubbleTimer = 2.4;
      }
      this.heroRegenIdle += dt;
      // Release any enemy while busy sucking up to VIP!
      if (h.engagedEnemyId !== null) {
        const en = this.enemies.find((e) => e.id === h.engagedEnemyId);
        if (en) en.engagedByHero = false;
        h.engagedEnemyId = null;
      }
    } else {
      h.escortingVipId = null;
      // Find nearby enemy to blast with megaphone!
      let target: Enemy | null = null;
      let bestDist = 78;
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - h.x, e.y - h.y);
        if (d < bestDist) {
          bestDist = d;
          target = e;
        }
      }
      if (target) {
        h.stance = 'rage';
        h.facing = target.x >= h.x ? 1 : -1;
        this.heroRegenIdle = 0;
        // Engage enemy if free
        if (!target.engagedByGuardId && !target.engagedByHero && h.engagedEnemyId === null) {
          target.engagedByHero = true;
          h.engagedEnemyId = target.id;
        }

        h.attackTimer -= dt;
        if (h.attackTimer <= 0) {
          h.attackTimer = 0.76;
          h.lungeTimer = 0.24;
          sfx.megaphone();
          // Megaphone sonic cone hits up to 3 nearby enemies with instant knockback!
          const hitTargets = this.enemies
            .filter((e) => Math.hypot(e.x - h.x, e.y - h.y) <= 86)
            .slice(0, 3);
          for (const ht of hitTargets) {
            this.damageEnemy(ht, h.damage, 'physical');
            if (!ht.isBoss && this.enemies.includes(ht)) {
              ht.dist = Math.max(0, ht.dist - 10);
              const pos = sampleStagePathAt(this.stageId, ht.lane, ht.dist, ht.laneOffset);
              ht.x = pos.x;
              ht.y = pos.y;
            }
          }
          this.pushParticle({
            x: h.x + h.facing * 20,
            y: h.y - 16,
            vx: h.facing * 40,
            vy: 0,
            size: 38,
            color: '#f87171',
            life: 0.24,
            maxLife: 0.24,
            ring: true,
          });
          if (!h.bubbleText && Math.random() < 0.28) {
            const list = getHeroBubbles(this.lang).rage;
            h.bubbleText = list[Math.floor(Math.random() * list.length)];
            h.bubbleTimer = 2.0;
          }
        }
      } else {
        h.stance = 'idle';
        h.engagedEnemyId = null;
        this.heroRegenIdle += dt;
      }
    }

    // Out-of-combat HP regen
    if (this.heroRegenIdle > 2.4 && h.hp < h.maxHp) {
      h.hp = Math.min(h.maxHp, h.hp + 26 * dt);
    }
  }

  private grantHeroXp(amount: number): void {
    const h = this.hero;
    if (h.level >= 5) return;
    h.xp += amount;
    while (h.xp >= h.nextXp && h.level < 5) {
      h.xp -= h.nextXp;
      h.level++;
      h.nextXp = Math.round(h.nextXp * 1.55);
      h.maxHp += 50;
      h.hp = h.maxHp;
      h.damage += 7;
      this.addFloatText(h.x, h.y - 44, t(this.lang, 'float.levelUp', { lv: h.level }), '#fde047', 1.25);
      this.spawnBurst(h.x, h.y - 16, '#fde047', 18, 100);
      sfx.vipSuccess();
    }
  }

  private updateGuards(dt: number): void {
    const guardRate = this.hasPolicy('rage_overclock') ? 1.16 : 1;
    const keep: Guard[] = [];
    for (const g of this.guards) {
      if (g.hitFlash > 0) g.hitFlash = Math.max(0, g.hitFlash - dt * 5);
      if (g.lungeTimer && g.lungeTimer > 0) g.lungeTimer = Math.max(0, g.lungeTimer - dt);

      if (g.tempLife !== undefined) {
        g.tempLife -= dt;
        if (g.tempLife <= 0) {
          if (g.engagedEnemyId !== null) this.releaseEnemyFromGuard(g.engagedEnemyId, g.id);
          for (const e of this.enemies) {
            if (e.engagedByGuardId === g.id) e.engagedByGuardId = null;
          }
          continue;
        }
      }

      if (!g.alive) {
        if (g.tempLife !== undefined) continue;
        g.respawnTimer -= dt;
        if (g.respawnTimer <= 0) {
          g.alive = true;
          g.hp = g.maxHp;
          const tw = this.towers.find((t0) => t0.id === g.towerId);
          g.x = tw ? tw.x : g.homeX;
          g.y = tw ? tw.y + 8 : g.homeY;
        }
        keep.push(g);
        continue;
      }

      // Check if a VIP is walking right by — auto-salute!
      g.salutingVip = this.vips.some(
        (v) => !v.fleeing && Math.hypot(v.x - g.x, v.y - g.y) <= 56
      );

      // Validate currently engaged enemy & leash back if knockback sent it far away
      let engaged: Enemy | undefined;
      if (g.engagedEnemyId !== null) {
        engaged = this.enemies.find((e) => e.id === g.engagedEnemyId);
        if (!engaged || Math.hypot(engaged.x - g.homeX, engaged.y - g.homeY) > 155) {
          if (engaged && engaged.engagedByGuardId === g.id) engaged.engagedByGuardId = null;
          g.engagedEnemyId = null;
          engaged = undefined;
        }
      }

      // Look for an unengaged enemy near rally point (even stunned enemies!)
      if (!engaged) {
        let bestDist = 82;
        for (const e of this.enemies) {
          if (e.engagedByGuardId !== null || e.engagedByHero) continue;
          const d = Math.hypot(e.x - g.homeX, e.y - g.homeY);
          if (d < bestDist) {
            bestDist = d;
            engaged = e;
          }
        }
        if (engaged) {
          g.engagedEnemyId = engaged.id;
          engaged.engagedByGuardId = g.id;
        }
      }

      if (engaged) {
        const tx = engaged.x + 16;
        const ty = engaged.y;
        const dx = tx - g.x;
        const dy = ty - g.y;
        const dist = Math.hypot(dx, dy);
        g.facing = engaged.x >= g.x ? 1 : -1;
        if (dist > 14) {
          const step = Math.min(dist, 118 * dt);
          g.x += (dx / dist) * step;
          g.y += (dy / dist) * step;
          g.walkPhase += dt * 11;
        } else {
          g.attackTimer -= dt * guardRate;
          if (g.attackTimer <= 0) {
            g.attackTimer = g.attackCooldown;
            g.lungeTimer = 0.22;
            // Branch A: VOUCHED Knights 18% ban-instakill non-boss!
            if (g.variant === 'vouched' && !engaged.isBoss && Math.random() < 0.18) {
              this.addFloatText(
                engaged.x,
                engaged.y - 32,
                t(this.lang, 'float.banned'),
                '#ef4444',
                1.18
              );
              this.spawnBurst(engaged.x, engaged.y - 12, '#ef4444', 12, 100);
              sfx.megaphone();
              this.damageEnemy(engaged, 9999, 'true', 0, g.towerId ?? undefined);
            } else {
              this.damageEnemy(engaged, g.damage, 'physical', 0, g.towerId ?? undefined);
              if (g.variant === 'bot') {
                this.gold += 5;
                this.recordTowerGold(g.towerId, 5);
                this.spawnFlyingCoins(g.x, g.y - 16, 5, 1);
                this.addFloatText(g.x, g.y - 24, '+5$ @bot', '#38bdf8', 0.9);
                this.callbacks.onHudDirty();
              }
            }
          }
        }
      } else {
        // Walk back to home rally offset & regen slowly
        const dx = g.homeX - g.x;
        const dy = g.homeY - g.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 3) {
          const step = Math.min(dist, 106 * dt);
          g.x += (dx / dist) * step;
          g.y += (dy / dist) * step;
          g.facing = dx >= 0 ? 1 : -1;
          g.walkPhase += dt * 10;
        } else if (g.hp < g.maxHp) {
          g.hp = Math.min(g.maxHp, g.hp + 12 * dt);
        }
      }

      keep.push(g);
    }
    this.guards = keep;
  }

  private updateEnemies(dt: number): void {
    const alive: Enemy[] = [];
    let pendingLeakAlarm = 0;

    for (const e of this.enemies) {
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt * 5);
      if (e.lungeTimer && e.lungeTimer > 0) e.lungeTimer = Math.max(0, e.lungeTimer - dt);
      if (e.bubbleTimer > 0) {
        e.bubbleTimer -= dt;
        if (e.bubbleTimer <= 0) e.bubbleText = null;
      }
      if (e.slowTimer > 0) {
        e.slowTimer -= dt;
        if (e.slowTimer <= 0) e.slowFactor = 0;
      }
      if (e.stunTimer > 0) {
        e.stunTimer -= dt;
        alive.push(e);
        continue;
      }

      // Boss GDPR periodic rally pulse (speed-buffs nearby open-source forces!)
      if (e.isBoss) {
        e.bossAuraTimer -= dt;
        if (e.bossAuraTimer <= 0) {
          e.bossAuraTimer = 6.0;
          this.pushParticle({
            x: e.x,
            y: e.y - 14,
            vx: 0,
            vy: 0,
            size: 135,
            color: '#60a5fa',
            life: 0.48,
            maxLife: 0.48,
            ring: true,
          });
          for (const ally of this.enemies) {
            if (ally.id !== e.id && Math.hypot(ally.x - e.x, ally.y - e.y) <= 145) {
              this.bossRallyTimers.set(ally.id, 2.5);
              ally.slowFactor *= 0.5;
            }
          }
          e.bubbleText = t(this.lang, 'bubble.gdprArticle83');
          e.bubbleTimer = 2.6;
        }
      }

      // If engaged in melee with guard or hero, fight instead of moving
      if (e.engagedByGuardId !== null) {
        const guard = this.guards.find((g) => g.id === e.engagedByGuardId && g.alive);
        if (!guard) {
          e.engagedByGuardId = null;
        } else {
          e.attackTimer -= dt;
          if (e.attackTimer <= 0) {
            e.attackTimer = 1.05;
            e.lungeTimer = 0.22;
            const dmg = Math.max(1, Math.round(e.attackDamage * (1 - guard.armor)));
            guard.hp -= dmg;
            guard.hitFlash = 1;
            if (guard.hp <= 0) {
              guard.alive = false;
              guard.lungeTimer = 0;
              guard.engagedEnemyId = null;
              const tw = this.towers.find((t0) => t0.id === guard.towerId);
              const st = tw ? getTowerStat(tw.type, tw.level, tw.branch) : null;
              guard.respawnTimer = st?.guardRespawn ?? 8;
              e.engagedByGuardId = null;
              this.spawnBurst(guard.x, guard.y, '#94a3b8', 8, 60);
            }
          }
          alive.push(e);
          continue;
        }
      }

      if (e.engagedByHero) {
        if (!this.hero.alive || this.hero.engagedEnemyId !== e.id || this.hero.stance === 'vip') {
          e.engagedByHero = false;
        } else {
          e.attackTimer -= dt;
          if (e.attackTimer <= 0) {
            e.attackTimer = 1.0;
            e.lungeTimer = 0.22;
            const heroArmor = Math.min(0.3, 0.15 + (this.hero.level - 1) * 0.03);
            const dmg = Math.max(1, Math.round(e.attackDamage * (1 - heroArmor)));
            this.hero.hp -= dmg;
            this.hero.hitFlash = 1;
            this.heroRegenIdle = 0;
            if (this.hero.hp <= 0) {
              this.handleHeroDefeated();
            }
          }
          alive.push(e);
          continue;
        }
      }

      // Check ARCHIVED crater boost for Auditors & Boss!
      let craterBoost = 1;
      if (e.kind === 'auditor' || e.isBoss) {
        for (const c of this.scorchCraters) {
          if (Math.hypot(e.x - c.x, e.y - c.y) <= c.radius) {
            craterBoost = 1.38;
            break;
          }
        }
      }

      const forkBoost = this.forkBoostTimers.has(e.id) ? 1.48 : 1;
      const bossRallyBoost = this.bossRallyTimers.has(e.id) ? 1.25 : 1;

      const speed =
        e.baseSpeed *
        (e.enraged ? 1.28 : 1) *
        craterBoost *
        forkBoost *
        bossRallyBoost *
        (1 - e.slowFactor);

      e.dist += speed * dt;
      e.walkPhase += dt * (speed * 0.17);
      const stage = this.getStage();
      const path = stage.sampledPaths[e.lane];
      const pos = sampleStagePathAt(this.stageId, e.lane, e.dist, e.laneOffset);
      const dxMove = pos.x - e.x;
      if (Math.abs(dxMove) > 0.15) {
        e.facing = dxMove >= 0 ? 1 : -1;
      }
      e.x = pos.x;
      e.y = pos.y;

      // Normal Armored Code Auditors walking over uncleaned IP LOG puddles inspect each puddle once (+7% alarm, 3s CD)!
      // Already-enraged raid/boss/rug auditors are excluded to prevent exponential leak-raid loops.
      if (e.kind === 'auditor' && !e.enraged && this.leakPuddles.length > 0) {
        const nextAllowed = this.auditorPuddleCooldown.get(e.id) ?? 0;
        if (this.time >= nextAllowed) {
          const seen = this.auditorInspectedPuddles.get(e.id);
          const puddle = this.leakPuddles.find(
            (p) =>
              (!seen || !seen.has(p.id)) &&
              Math.hypot(e.x - p.x, e.y - p.y) <= p.radius + e.radius * 0.5
          );
          if (puddle) {
            if (seen) seen.add(puddle.id);
            else this.auditorInspectedPuddles.set(e.id, new Set([puddle.id]));
            this.auditorPuddleCooldown.set(e.id, this.time + 3.0);
            pendingLeakAlarm += 7;
            e.bubbleText = t(this.lang, 'bubble.auditorLogFound');
            e.bubbleTimer = 2.4;
            this.addFloatText(
              e.x,
              e.y - 34,
              t(this.lang, 'float.alarmUp', { p: 7 }),
              '#e879f9',
              1.05
            );
            this.spawnBurst(puddle.x, puddle.y, '#e879f9', 8, 70);
          }
        }
      }

      if (e.dist >= path.totalLength - 8) {
        // Breached the Castle!
        this.cleanupEnemyTracking(e.id);
        this.lives = Math.max(0, this.lives - e.lifeCost);
        this.screenShake = Math.max(this.screenShake, e.isBoss ? 16 : 8);
        const castle = stage.castlePos;
        this.addFloatText(castle.x - 30, castle.y - 24, `-${e.lifeCost} ${t(this.lang, 'stat.hp')}`, '#ef4444', 1.3);
        sfx.vipPenalty();
        this.callbacks.onHudDirty();
        if (this.lives <= 0) {
          this.triggerDefeat();
        }
      } else {
        alive.push(e);
      }
    }
    this.enemies = alive;

    // Apply puddle-inspection alarm AFTER finalizing `this.enemies` so any triggered raid appends safely
    if (pendingLeakAlarm > 0) {
      this.addLeakAlarm(pendingLeakAlarm);
      this.callbacks.onHudDirty();
    }
  }

  private handleHeroDefeated(): void {
    const h = this.hero;
    h.hp = 0;
    h.alive = false;
    h.respawnTimer = 12;
    h.engagedEnemyId = null;
    h.escortingVipId = null;
    h.stance = 'idle';
    h.lungeTimer = 0;
    h.apologyAuraTimer = 0;
    h.bubbleText = null;
    h.bubbleTimer = 0;
    this.heroChaseVipId = null;
    this.heroIgnoreVipTimer = 0;
    for (const en of this.enemies) {
      if (en.engagedByHero) en.engagedByHero = false;
    }
    for (const v of this.vips) {
      v.escortedByHero = false;
    }
    this.spawnBurst(h.x, h.y - 16, '#f87171', 16, 95);
    this.addFloatText(h.x, h.y - 32, t(this.lang, 'float.ko', { s: 12 }), '#f87171', 1.25);
    this.callbacks.onHudDirty();
  }

  private updateTowers(dt: number): void {
    // Precompute @bot scraper speed aura sources
    const botAuras = this.towers.filter(
      (tw) => tw.type === 'barracks' && tw.level === 3 && tw.branch === 'b'
    );

    for (const tw of this.towers) {
      if (tw.recoil > 0) tw.recoil = Math.max(0, tw.recoil - dt * 5);
      if (tw.type === 'barracks') continue;

      if (tw.rampDecay > 0) {
        tw.rampDecay -= dt;
        if (tw.rampDecay <= 0) tw.rampStacks = 0;
      }

      const auraBoost = botAuras.some((b) => Math.hypot(b.x - tw.x, b.y - tw.y) <= 255) ? 1.15 : 1;
      const policyRate = this.hasPolicy('rage_overclock') ? 1.16 : 1;
      tw.cooldownTimer -= dt * auraBoost * policyRate;
      if (tw.cooldownTimer > 0) continue;

      const stat = getTowerStat(tw.type, tw.level, tw.branch);
      const priority: TargetPriority = tw.targetPriority ?? 'first';
      // Honor tower targetPriority ('first' | 'strong' | 'weak') — NEVER targets Golden VIPs!
      let best: Enemy | null = null;
      for (const e of this.enemies) {
        if (Math.hypot(e.x - tw.x, e.y - tw.y) > stat.range) continue;
        if (!best) {
          best = e;
          continue;
        }
        if (priority === 'strong') {
          if (e.hp > best.hp || (e.hp === best.hp && e.dist > best.dist)) {
            best = e;
          }
        } else if (priority === 'weak') {
          if (e.hp < best.hp || (e.hp === best.hp && e.dist > best.dist)) {
            best = e;
          }
        } else if (e.dist > best.dist) {
          best = e;
        }
      }
      if (!best) continue;

      tw.recoil = 1;
      tw.shotsFired++;

      if (tw.type === 'archer') {
        const isGatling = tw.level === 3 && tw.branch === 'a';
        const isSniper = tw.level === 3 && tw.branch === 'b';
        if (isGatling) {
          tw.rampStacks = Math.min(8, tw.rampStacks + 1);
          tw.rampDecay = 2.2;
          if (tw.rampStacks >= 6 && tw.shotsFired % 4 === 0) {
            this.spawnBurst(tw.x, tw.y - 36, '#fb923c', 4, 55);
          }
        }
        const cdFactor = isGatling ? Math.max(0.52, 1 - tw.rampStacks * 0.06) : 1;
        tw.cooldownTimer = stat.cooldown * cdFactor;

        const crit = isSniper && Math.random() < 0.32;
        this.projectiles.push({
          id: this.nextId++,
          kind: isSniper ? 'sniper' : 'arrow',
          x: tw.x,
          y: tw.y - 34,
          startX: tw.x,
          startY: tw.y - 34,
          targetX: best.x,
          targetY: best.y - 12,
          targetEnemyId: best.id,
          progress: 0,
          duration: isSniper ? 0.16 : 0.23,
          arcHeight: isSniper ? 10 : 32,
          damage: crit ? stat.damage * 2 : stat.damage,
          damageType: 'physical',
          splashRadius: 0,
          slowAmount: stat.slowAmount,
          slowDuration: stat.slowDuration,
          crit,
          sourceTowerId: tw.id,
        });
        if (isSniper) sfx.sniper();
        else sfx.arrow();
      } else if (tw.type === 'mage') {
        tw.cooldownTimer = stat.cooldown;
        const isStarFunnel = tw.level === 3 && tw.branch === 'a';
        const isArc = tw.level === 3 && tw.branch === 'b';

        if (isArc) {
          // Instant Plaintext Chain Lightning (up to 3 enemies + armor shred!)
          const hit: Enemy[] = [best];
          let cur = best;
          for (let bounce = 0; bounce < 2; bounce++) {
            let next: Enemy | null = null;
            let bestJump = 145;
            for (const cand of this.enemies) {
              if (hit.includes(cand)) continue;
              const d = Math.hypot(cand.x - cur.x, cand.y - cur.y);
              if (d < bestJump) {
                bestJump = d;
                next = cand;
              }
            }
            if (!next) break;
            hit.push(next);
            cur = next;
          }
          const pts = [{ x: tw.x, y: tw.y - 38 }, ...hit.map((h0) => ({ x: h0.x, y: h0.y - 14 }))];
          this.lightningArcs.push({ points: pts, life: 0.28, maxLife: 0.28, color: '#c084fc' });
          const mults = [1, 0.78, 0.58];
          hit.forEach((en, idx) => {
            this.armorShredTimers.set(en.id, 3.5);
            this.spawnBurst(en.x, en.y - 14, '#c084fc', 4, 55);
            this.damageEnemy(en, Math.round(stat.damage * mults[idx]), 'magic', 0, tw.id);
          });
          sfx.magic();
        } else {
          const triggerStun = isStarFunnel && tw.shotsFired % 3 === 0;
          this.projectiles.push({
            id: this.nextId++,
            kind: 'magic',
            x: tw.x,
            y: tw.y - 38,
            startX: tw.x,
            startY: tw.y - 38,
            targetX: best.x,
            targetY: best.y - 14,
            targetEnemyId: best.id,
            progress: 0,
            duration: 0.25,
            arcHeight: 20,
            damage: stat.damage,
            damageType: 'magic',
            splashRadius: 0,
            slowAmount: stat.slowAmount,
            slowDuration: stat.slowDuration,
            stunDuration: triggerStun ? 1.4 : undefined,
            siphonGold: triggerStun ? 8 : undefined,
            sourceTowerId: tw.id,
          });
          sfx.magic();
        }
      } else if (tw.type === 'artillery') {
        tw.cooldownTimer = stat.cooldown;
        const isYolo = tw.level === 3 && tw.branch === 'a';
        const isShock = tw.level === 3 && tw.branch === 'b';
        const shells = isYolo ? 3 : 1;

        // Gather extra nearby targets in range so YOLO 3-shell volley blankets the pack
        const packTargets = isYolo
          ? this.enemies.filter(
              (e) => e.id !== best.id && Math.hypot(e.x - tw.x, e.y - tw.y) <= stat.range + 20
            )
          : [];

        for (let s = 0; s < shells; s++) {
          const anchor = s > 0 && packTargets.length >= s ? packTargets[s - 1] : best;
          const jitterX =
            isYolo && s > 0 ? (Math.random() - 0.5) * 60 : (Math.random() - 0.5) * 14;
          const jitterY =
            isYolo && s > 0 ? (Math.random() - 0.5) * 36 : (Math.random() - 0.5) * 10;
          this.projectiles.push({
            id: this.nextId++,
            kind: isYolo ? 'yolo' : 'mortar',
            x: tw.x,
            y: tw.y - 30,
            startX: tw.x,
            startY: tw.y - 30,
            targetX: anchor.x + jitterX,
            targetY: anchor.y + jitterY,
            targetEnemyId: null,
            progress: -s * 0.14,
            duration: 0.54,
            arcHeight: 112,
            damage: stat.damage,
            damageType: 'physical',
            splashRadius: stat.splashRadius ?? 70,
            stunDuration: isShock ? 1.25 : undefined,
            pushback: isShock ? 46 : undefined,
            hitsVip: true,
            sourceTowerId: tw.id,
          });
        }
      }
    }
  }

  private updateProjectiles(dt: number): void {
    const active: Projectile[] = [];
    for (const p of this.projectiles) {
      p.progress += dt / p.duration;
      if (p.progress < 0) {
        active.push(p);
        continue;
      }

      if (p.targetEnemyId !== null) {
        const tgt = this.enemies.find((e) => e.id === p.targetEnemyId);
        if (tgt) {
          p.targetX = tgt.x;
          p.targetY = tgt.y - 14;
        }
      }

      const tNorm = Math.min(1, p.progress);
      p.x = p.startX + (p.targetX - p.startX) * tNorm;
      p.y =
        p.startY +
        (p.targetY - p.startY) * tNorm -
        Math.sin(tNorm * Math.PI) * p.arcHeight;

      if (p.progress >= 1) {
        this.resolveProjectileImpact(p);
      } else {
        active.push(p);
      }
    }
    this.projectiles = active;
  }

  private resolveProjectileImpact(p: Projectile): void {
    if (p.splashRadius > 0) {
      sfx.mortarBoom();
      this.screenShake = Math.max(this.screenShake, p.pushback ? 7.5 : 4);
      this.spawnBurst(p.targetX, p.targetY, p.kind === 'yolo' ? '#fb923c' : '#f97316', 16, 120);
      this.pushParticle({
        x: p.targetX,
        y: p.targetY,
        vx: 0,
        vy: 0,
        size: p.splashRadius,
        color: '#fb923c',
        life: 0.28,
        maxLife: 0.28,
        ring: true,
      });
      if (p.pushback) {
        this.pushParticle({
          x: p.targetX,
          y: p.targetY,
          vx: 0,
          vy: 0,
          size: p.splashRadius * 0.72,
          color: '#fde047',
          life: 0.34,
          maxLife: 0.34,
          ring: true,
        });
      }

      for (const e of [...this.enemies]) {
        const dist = Math.hypot(e.x - p.targetX, e.y - p.targetY);
        if (dist <= p.splashRadius + e.radius * 0.5) {
          const falloff = dist < p.splashRadius * 0.5 ? 1 : 0.72;
          this.damageEnemy(e, Math.round(p.damage * falloff), p.damageType, 0, p.sourceTowerId);
          if (!this.enemies.includes(e)) continue;
          if (p.stunDuration) {
            if (!e.isBoss) {
              e.stunTimer = Math.max(e.stunTimer, p.stunDuration);
            } else {
              e.slowTimer = Math.max(e.slowTimer, 0.55);
              e.slowFactor = Math.max(e.slowFactor, 0.35);
            }
          }
          if (p.pushback) {
            const kb = e.isBoss ? 10 : p.pushback;
            e.dist = Math.max(0, e.dist - kb);
            const pos = sampleStagePathAt(this.stageId, e.lane, e.dist, e.laneOffset);
            e.x = pos.x;
            e.y = pos.y;
          }
        }
      }

      if (p.hitsVip) {
        this.checkVipSplash(p.targetX, p.targetY, p.splashRadius);
      }
      return;
    }

    // Single target impact (retarget nearby enemy if original died in flight for Star Funnel/magic)
    let tgt = this.enemies.find((e) => e.id === p.targetEnemyId);
    if (!tgt && p.kind === 'magic') {
      let bestD = 65;
      for (const cand of this.enemies) {
        const d = Math.hypot(cand.x - p.targetX, cand.y - p.targetY);
        if (d < bestD) {
          bestD = d;
          tgt = cand;
        }
      }
    }
    if (!tgt) return;

    const armorPierce = p.kind === 'sniper' ? 0.35 : 0;
    this.damageEnemy(tgt, p.damage, p.damageType, armorPierce, p.sourceTowerId);
    if (p.crit) {
      this.addFloatText(tgt.x, tgt.y - 34, t(this.lang, 'float.crit', { dmg: p.damage }), '#fde047', 1.15);
      this.spawnBurst(tgt.x, tgt.y - 14, '#fde047', 7, 75);
    }
    if (p.slowAmount && p.slowDuration) {
      tgt.slowTimer = Math.max(tgt.slowTimer, p.slowDuration);
      tgt.slowFactor = Math.max(tgt.slowFactor, p.slowAmount);
    }
    if (p.stunDuration) {
      if (!tgt.isBoss) {
        tgt.stunTimer = Math.max(tgt.stunTimer, p.stunDuration);
      } else {
        tgt.slowTimer = Math.max(tgt.slowTimer, 1.3);
        tgt.slowFactor = Math.max(tgt.slowFactor, 0.45);
      }
    }
    if (p.siphonGold) {
      this.gold += p.siphonGold;
      this.recordTowerGold(p.sourceTowerId, p.siphonGold);
      this.spawnFlyingCoins(tgt.x, tgt.y - 18, p.siphonGold, 1);
      this.addFloatText(tgt.x, tgt.y - 30, t(this.lang, 'float.starGold', { g: p.siphonGold }), '#facc15', 1.0);
      sfx.coin();
      this.callbacks.onHudDirty();
    }
  }

  private damageEnemy(
    e: Enemy,
    rawDamage: number,
    type: 'physical' | 'magic' | 'true',
    armorPierce = 0,
    sourceTowerId?: number
  ): boolean {
    const idx = this.enemies.findIndex((x) => x.id === e.id);
    if (idx === -1) return false;

    let dmg = rawDamage;
    if (type === 'physical') {
      const shredded = this.armorShredTimers.has(e.id) ? 0.18 : 0;
      const effectiveArmor = Math.max(0, (e.armor - shredded) * (1 - armorPierce));
      dmg = Math.max(1, Math.round(rawDamage * (1 - effectiveArmor)));
    } else if (type === 'magic') {
      dmg = Math.max(1, Math.round(rawDamage * (1 - e.magicResist)));
    }

    const prevHp = Math.max(0, e.hp);
    const effectiveDamage = Math.min(prevHp, dmg);
    e.hp -= dmg;
    e.hitFlash = 1;
    const killed = e.hp <= 0;
    this.recordTowerDamage(sourceTowerId, effectiveDamage, killed);

    if (killed) {
      if (e.engagedByGuardId !== null) {
        this.releaseGuardFromEnemy(e.engagedByGuardId, e.id);
      }
      if (e.engagedByHero && this.hero.engagedEnemyId === e.id) {
        this.hero.engagedEnemyId = null;
      }
      this.cleanupEnemyTracking(e.id);
      this.enemies.splice(idx, 1);
      const reward = e.reward + (this.hasPolicy('star_patch') ? 4 : 0);
      this.gold += reward;
      this.stats.enemiesBlocked++;
      if (Math.hypot(this.hero.x - e.x, this.hero.y - e.y) <= 135) {
        this.grantHeroXp(e.isBoss ? 120 : 16);
      }
      const coinCount = e.isBoss ? 8 : e.kind === 'auditor' || e.kind === 'veteran' ? 2 : 1;
      this.spawnFlyingCoins(e.x, e.y - 14, reward, coinCount);
      this.addFloatText(e.x, e.y - 24, `+${reward}$`, '#fde047', e.isBoss ? 1.4 : 0.92);
      this.spawnBurst(e.x, e.y - 12, e.isBoss ? '#60a5fa' : '#f8fafc', e.isBoss ? 34 : 10, e.isBoss ? 160 : 75);
      sfx.coin();
      if (e.isBoss || e.kind === 'gdpr') {
        this.unlockAchievement('gdpr_slayer');
      }
      this.callbacks.onHudDirty();
      return true;
    }

    // MIT Fork Runner: brief speed burst when first dropping below 50% HP!
    if (e.kind === 'fork' && e.hp <= e.maxHp * 0.5 && !this.forkBoostTriggered.has(e.id)) {
      this.forkBoostTriggered.add(e.id);
      this.forkBoostTimers.set(e.id, 2.2);
      e.bubbleText = t(this.lang, 'bubble.forkBurst');
      e.bubbleTimer = 2.1;
      this.addFloatText(e.x, e.y - 26, t(this.lang, 'float.forked'), '#38bdf8', 0.96);
      this.spawnBurst(e.x, e.y - 10, '#38bdf8', 8, 80);
    }

    // EU GDPR Boss: at 50% HP triggers dramatic enforcement wave summoning 2 Armored Auditors!
    if (e.isBoss && e.hp <= e.maxHp * 0.5 && !this.bossPhaseTriggered.has(e.id)) {
      this.bossPhaseTriggered.add(e.id);
      this.triggerBossEnforcement(e);
    }
    return true;
  }

  private triggerBossEnforcement(boss: Enemy): void {
    this.screenShake = Math.max(this.screenShake, 12);
    sfx.alarmSiren();
    this.spawnBurst(boss.x, boss.y - 16, '#60a5fa', 26, 155);
    this.spawnBurst(boss.x, boss.y - 16, '#fde047', 16, 120);
    this.pushParticle({
      x: boss.x,
      y: boss.y - 12,
      vx: 0,
      vy: 0,
      size: 130,
      color: '#60a5fa',
      life: 0.52,
      maxLife: 0.52,
      ring: true,
    });
    this.pushParticle({
      x: boss.x,
      y: boss.y - 12,
      vx: 0,
      vy: 0,
      size: 92,
      color: '#fde047',
      life: 0.42,
      maxLife: 0.42,
      ring: true,
    });

    boss.bubbleText = t(this.lang, 'bubble.gdprPhase2');
    boss.bubbleTimer = 3.2;
    this.addFloatText(
      boss.x,
      boss.y - 50,
      t(this.lang, 'float.gdprEnforce'),
      '#60a5fa',
      1.32
    );
    this.callbacks.onToast(
      t(this.lang, 'toast.gdprReinforce'),
      'warn'
    );

    const offsets = [
      { back: 36, side: -14 },
      { back: 62, side: 14 },
    ];
    for (const off of offsets) {
      const escort = this.spawnEnemy('auditor', boss.lane);
      escort.dist = Math.max(10, boss.dist - off.back);
      escort.laneOffset = off.side;
      const pos = sampleStagePathAt(this.stageId, escort.lane, escort.dist, escort.laneOffset);
      escort.x = pos.x;
      escort.y = pos.y;
      escort.enraged = true;
      escort.bubbleText = t(this.lang, 'bubble.auditEscort');
      escort.bubbleTimer = 2.4;
      this.spawnBurst(escort.x, escort.y - 10, '#60a5fa', 10, 85);
    }
  }

  private releaseEnemyFromGuard(enemyId: number, guardId: number): void {
    const e = this.enemies.find((x) => x.id === enemyId);
    if (e && e.engagedByGuardId === guardId) e.engagedByGuardId = null;
  }

  private releaseGuardFromEnemy(guardId: number, enemyId: number): void {
    const g = this.guards.find((x) => x.id === guardId);
    if (g && g.engagedEnemyId === enemyId) g.engagedEnemyId = null;
  }

  private updateEffects(dt: number): void {
    this.lightningArcs = this.lightningArcs.filter((a) => {
      a.life -= dt;
      return a.life > 0;
    });
    this.suctionBeams = this.suctionBeams.filter((b) => {
      b.life -= dt;
      return b.life > 0;
    });
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      if (!p.ring) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.gravity) p.vy += p.gravity * dt;
      }
      return p.life > 0;
    });
    this.floatingTexts = this.floatingTexts.filter((f) => {
      f.life -= dt;
      f.y += f.vy * dt;
      return f.life > 0;
    });
    if (this.flyingCoins.length > 0) {
      const nextCoins: FlyingCoin[] = [];
      for (const c of this.flyingCoins) {
        c.progress += dt / c.duration;
        if (c.progress >= 1) continue;
        const tNorm = Math.max(0, Math.min(1, c.progress));
        const ease = 1 - Math.pow(1 - tNorm, 2.2);
        const arcLift = Math.sin(tNorm * Math.PI) * 58;
        c.x = c.startX + (c.targetX - c.startX) * ease;
        c.y = c.startY + (c.targetY - c.startY) * ease - arcLift;
        nextCoins.push(c);
      }
      this.flyingCoins = nextCoins;
    }
  }

  private checkWaveCompletion(dt: number): void {
    if (this.gameOver) return;

    if (!this.waveActive) {
      if (this.betweenWaveTimer > 0 && this.waveIndex > 0 && (!this.victoryShown || this.endlessMode)) {
        this.betweenWaveTimer -= dt;
        if (this.betweenWaveTimer <= 0 && this.canCallNextWave()) {
          this.callNextWave();
        }
      }
      return;
    }

    const anyTrapped = this.fakeRugs.some((r) => r.trapped.length > 0);
    if (this.spawnQueue.length === 0 && this.enemies.length === 0 && this.vips.length === 0 && !anyTrapped) {
      this.waveActive = false;
      saveStageBestRecord(this.stageId, this.waveIndex, this.getStars());

      if (!this.endlessMode && this.waveIndex >= this.getStage().waves.length) {
        this.victoryShown = true;
        if (this.stats.vipsScared === 0) {
          this.unlockAchievement('zero_vip_harm');
        }
        if (this.isTrueMitSaint()) {
          this.unlockAchievement('true_mit_saint');
        }
        if (this.stageId === 'bridge') {
          this.unlockAchievement('canyon_master');
        }
        this.checkTrilogyLordAchievement();
        this.recordCareerOutcome('victory');
        sfx.victory();
        this.syncBgmIntensity();
        this.callbacks.onGameEnd('victory');
      } else {
        if (this.endlessMode && this.waveIndex > this.getStage().waves.length) {
          const career = loadCareerStats();
          if (this.waveIndex > career.bestEndlessWave) {
            career.bestEndlessWave = this.waveIndex;
            saveCareerStats(career);
          }
        }
        this.betweenWaveTimer = 11;
        this.syncBgmIntensity();
        this.callbacks.onToast(t(this.lang, 'hud.waveComplete', { n: this.waveIndex }), 'good');
        const milestone = this.getPendingDraftMilestone(this.waveIndex);
        if (milestone !== null) {
          this.draftedWaves.add(milestone);
          this.triggerPolicyDraft();
        }
      }
      this.callbacks.onHudDirty();
    }
  }

  private triggerDefeat(): void {
    if (this.gameOver) return;
    this.gameOver = true;
    saveStageBestRecord(this.stageId, Math.max(1, this.waveIndex), 0);
    const kind: 'defeat' | 'endless_over' = this.endlessMode ? 'endless_over' : 'defeat';
    this.recordCareerOutcome(kind);
    sfx.defeat();
    this.syncBgmIntensity();
    this.callbacks.onGameEnd(kind);
  }

  private pushParticle(p: Particle): void {
    this.particles.push(p);
    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
  }

  public spawnBurst(x: number, y: number, color: string, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.35 + Math.random() * 0.75);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 24,
        size: 3 + Math.random() * 4,
        color,
        life: 0.35 + Math.random() * 0.3,
        maxLife: 0.65,
        gravity: 210,
      });
    }
    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
  }

  public addFloatText(x: number, y: number, text: string, color: string, scale = 1): void {
    this.floatingTexts.push({
      x,
      y,
      vy: -34,
      text,
      color,
      life: 1.15,
      maxLife: 1.15,
      scale,
    });
    if (this.floatingTexts.length > MAX_FLOATING_TEXTS) {
      this.floatingTexts.splice(0, this.floatingTexts.length - MAX_FLOATING_TEXTS);
    }
  }
}
