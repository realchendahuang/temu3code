import type { IconName } from './icons';

export type { IconName } from './icons';

export type Lang =
  | 'en'
  | 'zh-CN'
  | 'zh-TW'
  | 'ja'
  | 'ko'
  | 'fr'
  | 'es'
  | 'de'
  | 'pt-BR'
  | 'ru'
  | 'ar'
  | 'it'
  | 'nl'
  | 'pl'
  | 'tr'
  | 'vi'
  | 'id'
  | 'hi';

export type StageId = 'meadow' | 'bridge' | 'furnace';
export type TargetPriority = 'first' | 'strong' | 'weak';

export type Difficulty = 'normal' | 'crunch' | 'gdpr';

export type PolicyId =
  | 'star_patch'
  | 'vip_first_class'
  | 'vacuum_carpet'
  | 'rage_overclock'
  | 'pr_insurance'
  | 'stealth_pipes';

export interface PolicyChoice {
  id: PolicyId;
  icon: IconName;
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
}

export type AchievementId =
  | 'first_vip'
  | 'carpet_combo'
  | 'carpet_nuke'
  | 'all_branches'
  | 'zero_vip_harm'
  | 'true_mit_saint'
  | 'gdpr_slayer'
  | 'endless_15'
  | 'canyon_master'
  | 'trilogy_lord';

export interface AchievementDef {
  id: AchievementId;
  icon: IconName;
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
}

export interface FlyingCoin {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  duration: number;
  amount: number;
}

export interface WaveBanner {
  title: string;
  subtitle: string;
  timer: number;
  maxTimer: number;
  tone: 'normal' | 'boss' | 'endless';
}

export type TowerBaseType = 'barracks' | 'archer' | 'mage' | 'artillery';
export type TowerBranch = 'none' | 'a' | 'b';

export type EnemyKind = 'dev' | 'fork' | 'auditor' | 'veteran' | 'gdpr';

export type TargetingMode = 'none' | 'rally' | 'rug' | 'delete';

export interface Vec2 {
  x: number;
  y: number;
}

export interface TowerPad {
  id: string;
  x: number;
  y: number;
  defaultRally: Vec2;
}

export interface TowerStat {
  cost: number;
  range: number;
  damage: number;
  cooldown: number;
  splashRadius?: number;
  guardHp?: number;
  guardDamage?: number;
  guardArmor?: number;
  guardRespawn?: number;
  slowAmount?: number;
  slowDuration?: number;
}

export interface Tower {
  id: number;
  padId: string;
  x: number;
  y: number;
  type: TowerBaseType;
  level: 1 | 2 | 3;
  branch: TowerBranch;
  totalSpent: number;
  cooldownTimer: number;
  shotsFired: number;
  rampStacks: number;
  rampDecay: number;
  recoil: number;
  rallyPoint: Vec2;
  guardIds: number[];
  targetPriority?: TargetPriority;
  kills?: number;
  totalDamage?: number;
  goldEarned?: number;
}

export interface Guard {
  id: number;
  towerId: number | null; // null for hero apology temporary fans
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  hp: number;
  maxHp: number;
  damage: number;
  armor: number;
  attackTimer: number;
  attackCooldown: number;
  engagedEnemyId: number | null;
  respawnTimer: number;
  alive: boolean;
  facing: number;
  walkPhase: number;
  hitFlash: number;
  lungeTimer?: number;
  tempLife?: number;
  variant: 'normal' | 'vouched' | 'bot' | 'fan';
  salutingVip: boolean;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  lane: 0 | 1;
  dist: number;
  x: number;
  y: number;
  laneOffset: number;
  hp: number;
  maxHp: number;
  baseSpeed: number;
  armor: number;      // physical damage reduction 0..0.8
  magicResist: number; // magic damage reduction 0..0.8
  reward: number;
  lifeCost: number;
  radius: number;
  isBoss: boolean;
  engagedByGuardId: number | null;
  engagedByHero: boolean;
  attackTimer: number;
  attackDamage: number;
  slowTimer: number;
  slowFactor: number;
  stunTimer: number;
  enraged: boolean;
  hitFlash: number;
  lungeTimer?: number;
  walkPhase: number;
  bubbleText: string | null;
  bubbleTimer: number;
  bossAuraTimer: number;
}

export interface VipUnit {
  id: number;
  lane: 0 | 1;
  dist: number;
  x: number;
  y: number;
  laneOffset: number;
  baseSpeed: number;
  payout: number;
  escortedByHero: boolean;
  escortTime: number;
  aoeShieldUsed: boolean;
  fleeing: boolean;
  fleeTimer: number;
  walkPhase: number;
  bubbleText: string | null;
  bubbleTimer: number;
}

export interface Hero {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  nextXp: number;
  speed: number;
  damage: number;
  attackTimer: number;
  stance: 'idle' | 'rage' | 'vip';
  escortingVipId: number | null;
  engagedEnemyId: number | null;
  alive: boolean;
  respawnTimer: number;
  facing: number;
  walkPhase: number;
  hitFlash: number;
  lungeTimer?: number;
  apologyAuraTimer: number;
  apologyCasts: number;
  bubbleText: string | null;
  bubbleTimer: number;
}

export interface Projectile {
  id: number;
  kind: 'arrow' | 'sniper' | 'magic' | 'mortar' | 'yolo';
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  targetEnemyId: number | null;
  progress: number;
  duration: number;
  arcHeight: number;
  damage: number;
  damageType: 'physical' | 'magic' | 'true';
  splashRadius: number;
  slowAmount?: number;
  slowDuration?: number;
  stunDuration?: number;
  pushback?: number;
  siphonGold?: number;
  crit?: boolean;
  hitsVip?: boolean;
  sourceTowerId?: number;
}

export interface LightningArc {
  points: Vec2[];
  life: number;
  maxLife: number;
  color: string;
}

export interface LeakPuddle {
  id: number;
  x: number;
  y: number;
  radius: number;
  pulse: number;
}

export interface FakeRug {
  id: number;
  x: number;
  y: number;
  radius: number;
  elapsed: number;
  duration: number;
  trapped: Enemy[];
  cleanedPuddles: number;
}

export interface ScorchCrater {
  id: number;
  x: number;
  y: number;
  radius: number;
}

export interface FallingDeleteKey {
  x: number;
  y: number;
  radius: number;
  elapsed: number;
  impactTime: number;
  impacted: boolean;
  fadeTime: number;
}

export interface SuctionBeam {
  targetX: number;
  targetY: number;
  isVip: boolean;
  life: number;
  maxLife: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity?: number;
  ring?: boolean;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale?: number;
}

export interface SpawnEvent {
  delay: number;
  lane: 0 | 1;
  entityType: EnemyKind | 'vip';
}

export interface WaveDef {
  waveNumber: number;
  titleZh: string;
  titleEn: string;
  events: SpawnEvent[];
}

export interface RunStats {
  enemiesBlocked: number;
  vipsEscorted: number;
  vipsScared: number;
  stealCasts: number;
  goldStolen: number;
  rugsBurst: number;
  deletesDropped: number;
  apologiesCasted: number;
  leakRaidsTriggered: number;
}
