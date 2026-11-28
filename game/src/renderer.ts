import { assets, type AssetKey } from './assets';
import {
  getTowerStat,
  LOGICAL_H,
  LOGICAL_W,
  type SampledPath,
  type StageConfig,
} from './config';
import type { GameEngine } from './engine';
import { t as translate } from './i18n';
import { drawCanvasIcon, drawCanvasStar, type IconName } from './icons';
import type {
  Enemy,
  FlyingCoin,
  Guard,
  Hero,
  Lang,
  Projectile,
  TargetingMode,
  Tower,
  Vec2,
  VipUnit,
  WaveBanner,
} from './types';

export interface RenderUIState {
  selectedPadId: string | null;
  hoveredPadId: string | null;
  tutorialPadId?: string | null;
  targetingMode: TargetingMode;
  mouseX: number;
  mouseY: number;
  rallyTowerId: number | null;
  selectedEntity?: { kind: 'enemy' | 'vip'; id: number } | null;
  previewRange?: {
    x: number;
    y: number;
    range: number;
    splashRadius?: number;
    isArtillery?: boolean;
  } | null;
}

interface FireworkRocket {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  duration: number;
  palette: 'gold' | 'cyan' | 'violet';
}

interface FireworkSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  twinklePhase: number;
  kind: 'spark' | 'ring' | 'star' | 'bloom';
}

interface DefeatEmber {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  phase: number;
  kind: 'ember' | 'smoke';
  color: string;
}

interface OverlayBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface RoadPebble {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rot: number;
  shade: number;
}

interface GrassTuft {
  x: number;
  y: number;
  scale: number;
  phase: number;
  flip: number;
  tone: number;
}

interface CobbleSlab {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  tone: number;
  moss: boolean;
}

interface RoadLanternPost {
  x: number;
  y: number;
  phase: number;
  side: number;
}

type RoadTheme = 'meadow' | 'bridge' | 'furnace';

function getRoadTheme(stage: StageConfig): RoadTheme {
  return stage.roadTheme as RoadTheme;
}

interface FurnacePinchAnchor {
  x: number;
  y: number;
  ang: number;
}

interface FurnaceJunctions {
  pinchCenter: Vec2;
  pinchNorth: FurnacePinchAnchor;
  pinchSouth: FurnacePinchAnchor;
  gateMerge: Vec2;
  mergeNorthLead: FurnacePinchAnchor;
  mergeSouthLead: FurnacePinchAnchor;
}

interface FiberEdgeStrip {
  points: Vec2[];
  laneIdx: number;
  side: number;
  path2d: Path2D | null;
}

interface StageScenery {
  roadPebbles: RoadPebble[];
  grassTufts: GrassTuft[];
  cobbleSlabs: CobbleSlab[];
  lanternPosts: RoadLanternPost[];
  crossingCenter: Vec2 | null;
  furnaceJunctions: FurnaceJunctions | null;
  fiberEdgeStrips: FiberEdgeStrip[];
  combinedRoadPath: Path2D | null;
}

interface TwilightFirefly {
  baseX: number;
  baseY: number;
  ampX: number;
  ampY: number;
  speedX: number;
  speedY: number;
  pulseSpeed: number;
  phase: number;
  radius: number;
  warmth: number;
}

interface FurnaceSpark {
  baseX: number;
  baseY: number;
  driftX: number;
  riseSpeed: number;
  swayAmp: number;
  swaySpeed: number;
  pulseSpeed: number;
  phase: number;
  radius: number;
  palette: 'cyan' | 'amber' | 'violet';
}

interface CloudShadow {
  baseX: number;
  baseY: number;
  rx: number;
  ry: number;
  speed: number;
  alpha: number;
}

interface RendererSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  kind: 'spark' | 'smoke' | 'star';
}

interface LaserTracer {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
  crit: boolean;
}

interface TrackedProjectile {
  kind: Projectile['kind'];
  startX: number;
  startY: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  crit?: boolean;
}

// Deterministic pseudo-random helper [0, 1) so scenery never jitters
function hash01(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

// Defensive reader for optional melee lungeTimer added by gameplay engine
function getLungeTimer(entity: Enemy | Guard | Hero): number {
  const val = (entity as { lungeTimer?: number }).lungeTimer;
  return typeof val === 'number' && Number.isFinite(val) ? Math.max(0, val) : 0;
}

// Defensive readers for Round 3 gameplay engine VFX streams
function getFlyingCoins(engine: GameEngine): FlyingCoin[] {
  return Array.isArray(engine.flyingCoins) ? engine.flyingCoins : [];
}

function getWaveBanner(engine: GameEngine): WaveBanner | null {
  const val = engine.waveBanner;
  if (!val || typeof val.timer !== 'number' || val.timer <= 0) return null;
  return val;
}

function boxesOverlap(a: OverlayBox, b: OverlayBox, pad = 3): boolean {
  return !(
    a.x2 + pad <= b.x1 ||
    a.x1 - pad >= b.x2 ||
    a.y2 + pad <= b.y1 ||
    a.y1 - pad >= b.y2
  );
}

function closestPointOnPaths(
  paths: SampledPath[],
  x: number,
  y: number
): { x: number; y: number; distToRoad: number } {
  let bestDist = Infinity;
  let bestX = x;
  let bestY = y;
  for (const path of paths) {
    const pts = path.points;
    for (let i = 0; i < pts.length; i += 2) {
      const p = pts[i];
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestDist) {
        bestDist = d;
        bestX = p.x;
        bestY = p.y;
      }
    }
  }
  return { x: bestX, y: bestY, distToRoad: bestDist };
}

function findCrossingCenter(paths: [SampledPath, SampledPath], stageId: string): Vec2 | null {
  if (stageId !== 'bridge') return null;
  let bestDist = Infinity;
  let bestCenter: Vec2 | null = null;
  const p0 = paths[0].points;
  const p1 = paths[1].points;
  for (let i = 0; i < p0.length; i += 2) {
    const a = p0[i];
    if (a.x < 360 || a.x > 760) continue;
    for (let j = 0; j < p1.length; j += 2) {
      const b = p1[j];
      if (b.x < 360 || b.x > 760) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < bestDist) {
        bestDist = d;
        bestCenter = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
      }
    }
  }
  if (bestCenter && bestDist < 42) {
    return bestCenter;
  }
  return { x: 555, y: 360 };
}

function tangentAngleAt(pts: Vec2[], idx: number): number {
  const prev = pts[Math.max(0, idx - 2)];
  const next = pts[Math.min(pts.length - 1, idx + 2)];
  return Math.atan2(next.y - prev.y, next.x - prev.x);
}

function findFurnaceJunctions(
  paths: [SampledPath, SampledPath],
  theme: RoadTheme
): FurnaceJunctions | null {
  if (theme !== 'furnace') return null;
  const p0 = paths[0].points;
  const p1 = paths[1].points;

  // Locate central pinch where North Fiber Trunk & South GPU Trench squeeze closest (~390, 352)
  let bestPinchDist = Infinity;
  let bestI = 0;
  let bestJ = 0;
  for (let i = 0; i < p0.length; i += 2) {
    const a = p0[i];
    if (a.x < 290 || a.x > 490) continue;
    for (let j = 0; j < p1.length; j += 2) {
      const b = p1[j];
      if (b.x < 290 || b.x > 490) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < bestPinchDist) {
        bestPinchDist = d;
        bestI = i;
        bestJ = j;
      }
    }
  }

  const northPt = bestPinchDist < Infinity ? p0[bestI] : { x: 380, y: 275 };
  const southPt = bestPinchDist < Infinity ? p1[bestJ] : { x: 400, y: 430 };
  const pinchNorth: FurnacePinchAnchor = {
    x: northPt.x,
    y: northPt.y,
    ang: bestPinchDist < Infinity ? tangentAngleAt(p0, bestI) : 0,
  };
  const pinchSouth: FurnacePinchAnchor = {
    x: southPt.x,
    y: southPt.y,
    ang: bestPinchDist < Infinity ? tangentAngleAt(p1, bestJ) : 0,
  };
  const pinchCenter: Vec2 = {
    x: (pinchNorth.x + pinchSouth.x) * 0.5,
    y: (pinchNorth.y + pinchSouth.y) * 0.5,
  };

  // Locate Castle Gate merge where both lanes converge (~1015, 348)
  let gateMerge: Vec2 = { x: 1015, y: 348 };
  let mergeIdx0 = p0.length - 1;
  let mergeIdx1 = p1.length - 1;
  for (let i = 0; i < p0.length; i++) {
    const a = p0[i];
    if (a.x < 920 || a.x > 1095) continue;
    let closestJ = -1;
    let minD = Infinity;
    for (let j = 0; j < p1.length; j++) {
      const b = p1[j];
      if (b.x < 920 || b.x > 1095) continue;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < minD) {
        minD = d;
        closestJ = j;
      }
    }
    if (closestJ >= 0 && minD < 16) {
      gateMerge = { x: (a.x + p1[closestJ].x) * 0.5, y: (a.y + p1[closestJ].y) * 0.5 };
      mergeIdx0 = i;
      mergeIdx1 = closestJ;
      break;
    }
  }

  const pickLead = (path: SampledPath, mergeIdx: number, fallback: FurnacePinchAnchor): FurnacePinchAnchor => {
    const targetDist = Math.max(0, path.cumDist[mergeIdx] - 62);
    for (let k = mergeIdx; k >= 0; k--) {
      if (path.cumDist[k] <= targetDist) {
        return {
          x: path.points[k].x,
          y: path.points[k].y,
          ang: tangentAngleAt(path.points, k),
        };
      }
    }
    return fallback;
  };

  const mergeNorthLead = pickLead(paths[0], mergeIdx0, { x: 965, y: 306, ang: 0.66 });
  const mergeSouthLead = pickLead(paths[1], mergeIdx1, { x: 965, y: 392, ang: -0.66 });

  return {
    pinchCenter,
    pinchNorth,
    pinchSouth,
    gateMerge,
    mergeNorthLead,
    mergeSouthLead,
  };
}

function buildPolylinePath2D(pts: Vec2[]): Path2D | null {
  if (typeof Path2D === 'undefined' || pts.length < 2) return null;
  const p2d = new Path2D();
  p2d.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    p2d.lineTo(pts[i].x, pts[i].y);
  }
  return p2d;
}

function buildCombinedRoadPath2D(paths: SampledPath[]): Path2D | null {
  if (typeof Path2D === 'undefined') return null;
  const p2d = new Path2D();
  for (const path of paths) {
    const pts = path.points;
    if (pts.length < 2) continue;
    p2d.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      p2d.lineTo(pts[i].x, pts[i].y);
    }
  }
  return p2d;
}

function buildFiberEdgeStrips(
  paths: [SampledPath, SampledPath],
  castleX: number
): FiberEdgeStrip[] {
  const strips: FiberEdgeStrip[] = [];
  const edgeOffset = 23.5;

  for (let laneIdx = 0; laneIdx < paths.length; laneIdx++) {
    const path = paths[laneIdx];
    const otherPts = paths[laneIdx === 0 ? 1 : 0].points;
    const pts = path.points;

    for (const side of [-1, 1]) {
      let current: Vec2[] = [];
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p.x > castleX - 42) {
          if (current.length >= 2) {
            strips.push({ points: current, laneIdx, side, path2d: buildPolylinePath2D(current) });
          }
          current = [];
          continue;
        }
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(pts.length - 1, i + 1)];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const ex = p.x + nx * side * edgeOffset;
        const ey = p.y + ny * side * edgeOffset;

        // Skip curb pixels that overlap inside the other lane's roadway (prevents messy merge crossover)
        let insideOtherRoad = false;
        for (let j = 0; j < otherPts.length; j += 2) {
          const op = otherPts[j];
          const d = Math.hypot(ex - op.x, ey - op.y);
          if (d < 21.5) {
            insideOtherRoad = true;
            break;
          }
        }
        // On the shared Castle Gate straightaway, let Lane 0 own both clean outer fiber curbs
        if (!insideOtherRoad && laneIdx === 1 && p.x > 1005) {
          insideOtherRoad = true;
        }

        if (insideOtherRoad) {
          if (current.length >= 2) {
            strips.push({ points: current, laneIdx, side, path2d: buildPolylinePath2D(current) });
          }
          current = [];
        } else {
          current.push({ x: ex, y: ey });
        }
      }
      if (current.length >= 2) {
        strips.push({ points: current, laneIdx, side, path2d: buildPolylinePath2D(current) });
      }
    }
  }
  return strips;
}

// Painted warm amber lantern positions & alpine waterfall accents on map-bridge.webp (1280x720)
const BRIDGE_PAINTED_LANTERNS: Vec2[] = [
  { x: 235, y: 66 },
  { x: 951, y: 44 },
];
const BRIDGE_WATERFALL_STREAMS: Array<[Vec2, Vec2, Vec2]> = [
  [
    { x: 1246, y: 6 },
    { x: 1222, y: 36 },
    { x: 1196, y: 68 },
  ],
  [
    { x: 1206, y: 60 },
    { x: 1180, y: 92 },
    { x: 1152, y: 122 },
  ],
];

// Deterministic golden twilight fireflies drifting lazily across the EU Audit Canyon
const TWILIGHT_FIREFLIES: TwilightFirefly[] = Array.from({ length: 24 }, (_, i) => ({
  baseX: 70 + hash01(i * 19.7 + 3.1) * (LOGICAL_W - 140),
  baseY: 85 + hash01(i * 31.3 + 7.9) * (LOGICAL_H - 165),
  ampX: 22 + hash01(i * 11.3 + 1.7) * 34,
  ampY: 14 + hash01(i * 23.9 + 5.3) * 24,
  speedX: 0.28 + hash01(i * 7.1 + 9.2) * 0.36,
  speedY: 0.34 + hash01(i * 13.7 + 4.4) * 0.42,
  pulseSpeed: 1.8 + hash01(i * 29.1 + 2.8) * 2.1,
  phase: hash01(i * 41.9 + 6.5) * Math.PI * 2,
  radius: 1.7 + hash01(i * 17.3 + 8.1) * 1.6,
  warmth: hash01(i * 37.1 + 0.9),
}));

// Deterministic 4:00 AM glowing cyan & amber midnight sparks/embers drifting across Stage 3 Server Furnace
const FURNACE_SPARKS: FurnaceSpark[] = Array.from({ length: 30 }, (_, i) => {
  const roll = hash01(i * 43.3 + 1.7);
  const palette: FurnaceSpark['palette'] =
    roll < 0.52 ? 'cyan' : roll < 0.86 ? 'amber' : 'violet';
  return {
    baseX: 48 + hash01(i * 23.1 + 4.2) * (LOGICAL_W - 96),
    baseY: 64 + hash01(i * 37.9 + 8.6) * (LOGICAL_H - 120),
    driftX: (palette === 'amber' ? 10 : 7) + hash01(i * 13.3 + 2.4) * 13,
    riseSpeed: (palette === 'amber' ? 14 : 8) + hash01(i * 19.1 + 6.1) * 13,
    swayAmp: 12 + hash01(i * 29.7 + 3.5) * 20,
    swaySpeed: 0.55 + hash01(i * 11.9 + 5.7) * 0.75,
    pulseSpeed: 2.2 + hash01(i * 31.7 + 9.3) * 2.4,
    phase: hash01(i * 53.1 + 2.2) * Math.PI * 2,
    radius: (palette === 'amber' ? 1.55 : 1.7) + hash01(i * 17.7 + 7.1) * 1.35,
    palette,
  };
});

// Exact waypoints along the painted top-left brook on map-meadow.webp (1280x720)
const BROOK_UPPER_PTS: Vec2[] = [
  { x: 204, y: 4 },
  { x: 212, y: 26 },
  { x: 206, y: 52 },
];
const BROOK_MID_PTS: Vec2[] = [
  { x: 194, y: 76 },
  { x: 164, y: 94 },
  { x: 132, y: 112 },
];
const BROOK_LOWER_PTS: Vec2[] = [
  { x: 116, y: 138 },
  { x: 82, y: 156 },
  { x: 42, y: 170 },
];
const BROOK_FALLS: Array<{ x: number; y: number; w: number; h: number }> = [
  { x: 204, y: 63, w: 22, h: 15 },
  { x: 125, y: 124, w: 24, h: 16 },
];

const CLOUD_SHADOWS: CloudShadow[] = [
  { baseX: 180, baseY: 165, rx: 190, ry: 72, speed: 11, alpha: 0.085 },
  { baseX: 740, baseY: 320, rx: 235, ry: 88, speed: 8.5, alpha: 0.075 },
  { baseX: 1220, baseY: 545, rx: 210, ry: 78, speed: 13, alpha: 0.08 },
  { baseX: 480, baseY: 610, rx: 170, ry: 62, speed: 9.5, alpha: 0.065 },
];

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private sceneryCache = new Map<string, StageScenery>();

  // Offscreen static stage terrain cache: keyed by (stage.id, canvas.width, canvas.height, bgLoadedFlag)
  private staticCache: HTMLCanvasElement | null = null;
  private staticCacheCtx: CanvasRenderingContext2D | null = null;
  private staticCacheKey = '';

  // Pre-baked micro-sprite caches (eliminates per-frame radial gradients & software ctx.filter fallbacks)
  private glowSpriteCache = new Map<string, HTMLCanvasElement>();
  private whiteSpriteCache = new Map<AssetKey, HTMLCanvasElement>();

  // Lightweight renderer-only VFX state (auto-resets on game restart)
  private lastEngineTime = 0;
  private lastWallMs = 0;
  private uiAnimTime = 0;
  private prevEnemyFlash = new Map<number, number>();
  private prevProjectiles = new Map<number, TrackedProjectile>();
  private bossHpTrails = new Map<number, number>();
  private bossBannerY = 60;
  private cachedTargetBannerY = 60;
  private lastBannerMeasureMs = -1000;
  private lastToastHidden: boolean | null = null;
  private lastBannerCanvasW = 0;
  private lastBannerCanvasH = 0;
  private toastEl: HTMLElement | null = null;
  private hudTopEl: HTMLElement | null = null;
  private sparks: RendererSpark[] = [];
  private laserTracers: LaserTracer[] = [];
  private prevStepHalf = new Map<string, number>();

  // Victory fireworks & Defeat ember stage-end FX state (ticks on wall clock so modals stay alive)
  private stageFxMode: 'none' | 'victory' | 'defeat' = 'none';
  private fireworkCooldown = 0;
  private fireworkRockets: FireworkRocket[] = [];
  private fireworkSparks: FireworkSpark[] = [];
  private defeatEmbers: DefeatEmber[] = [];
  private emberSpawnAcc = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not initialize 2D context');
    this.ctx = ctx;
    if (typeof document !== 'undefined') {
      this.toastEl = document.getElementById('banner-toast');
      this.hudTopEl = document.getElementById('hud-top');
    }
  }

  private getGlowSprite(
    key: string,
    size: number,
    stops: ReadonlyArray<[number, string]>,
    innerFrac = 0
  ): HTMLCanvasElement | null {
    const cached = this.glowSpriteCache.get(key);
    if (cached) return cached;
    if (typeof document === 'undefined' || size <= 0) return null;

    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const gctx = c.getContext('2d');
    if (!gctx) return null;

    const half = size * 0.5;
    const grad = gctx.createRadialGradient(half, half, half * innerFrac, half, half, half);
    for (const [offset, color] of stops) {
      grad.addColorStop(offset, color);
    }
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, size, size);
    this.glowSpriteCache.set(key, c);
    return c;
  }

  private getWhiteSprite(key: AssetKey, img: HTMLImageElement): HTMLCanvasElement | null {
    const cached = this.whiteSpriteCache.get(key);
    if (cached) return cached;
    if (typeof document === 'undefined' || !img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
      return null;
    }

    const isStrip = img.naturalWidth >= img.naturalHeight * 3;
    const maxDim = isStrip ? 512 : 192;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const sctx = c.getContext('2d');
    if (!sctx) return null;

    sctx.drawImage(img, 0, 0, w, h);
    sctx.globalCompositeOperation = 'source-in';
    sctx.fillStyle = '#ffffff';
    sctx.fillRect(0, 0, w, h);
    sctx.globalCompositeOperation = 'source-over';
    this.whiteSpriteCache.set(key, c);
    return c;
  }

  private drawHitFlashOverlay(
    key: AssetKey,
    img: HTMLImageElement | null,
    x: number,
    y: number,
    w: number,
    h: number,
    hitFlash: number,
    threshold: number,
    srcRect?: { sx: number; sy: number; sw: number; sh: number }
  ): void {
    if (hitFlash <= threshold || !img) return;
    const ctx = this.ctx;
    const flashAlpha = Math.min(0.76, Math.max(0.18, (hitFlash - threshold * 0.6) * 0.92));
    const white = this.getWhiteSprite(key, img);
    if (white) {
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = prevAlpha * flashAlpha;
      if (srcRect && img.naturalWidth > 0 && img.naturalHeight > 0) {
        const rx = white.width / img.naturalWidth;
        const ry = white.height / img.naturalHeight;
        ctx.drawImage(
          white,
          srcRect.sx * rx,
          srcRect.sy * ry,
          srcRect.sw * rx,
          srcRect.sh * ry,
          x,
          y,
          w,
          h
        );
      } else {
        ctx.drawImage(white, x, y, w, h);
      }
      ctx.globalAlpha = prevAlpha;
      return;
    }
    // Lightweight fallback flash halo if offscreen canvas is unavailable
    const cx = x + w * 0.5;
    const cy = y + h * 0.52;
    const rx = w * 0.36;
    const ry = h * 0.36;
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = prevAlpha * flashAlpha * 0.65;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = prevAlpha;
  }

  private emitFootDust(
    unitTag: string,
    x: number,
    y: number,
    walkPhase: number,
    moveDir: number,
    theme: RoadTheme,
    heavy = false
  ): void {
    const stepIdx = Math.floor(walkPhase / Math.PI);
    const prev = this.prevStepHalf.get(unitTag);
    this.prevStepHalf.set(unitTag, stepIdx);
    if (prev === undefined || prev === stepIdx) return;

    const dustColor =
      theme === 'furnace'
        ? 'rgba(125, 211, 252, 0.42)'
        : theme === 'bridge'
          ? 'rgba(203, 213, 225, 0.48)'
          : 'rgba(217, 198, 159, 0.58)';
    const count = heavy ? 3 : 1;
    for (let i = 0; i < count; i++) {
      this.pushSpark({
        x: x - moveDir * (4 + Math.random() * 6) + (Math.random() - 0.5) * (heavy ? 12 : 5),
        y: y + 1 + (Math.random() - 0.5) * 3,
        vx: -moveDir * (14 + Math.random() * 18) + (Math.random() - 0.5) * 10,
        vy: -(8 + Math.random() * (heavy ? 18 : 11)),
        size: (heavy ? 4.4 : 2.8) + Math.random() * (heavy ? 2.4 : 1.5),
        color: dustColor,
        life: 0.22 + Math.random() * 0.14,
        maxLife: 0.36,
        kind: 'smoke',
      });
    }
  }

  private getWalkStripFrame(walkKey: AssetKey, walkPhase: number): {
    img: HTMLImageElement;
    frameIdx: number;
    sx: number;
    sy: number;
    sw: number;
    sh: number;
  } | null {
    const img = assets.get(walkKey);
    if (!img || !img.complete || img.naturalWidth < img.naturalHeight * 3.2 || img.naturalHeight <= 0) {
      return null;
    }
    const frames = 4;
    const sw = img.naturalWidth / frames;
    const sh = img.naturalHeight;
    const norm = ((walkPhase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const frameIdx = Math.floor((norm / (Math.PI * 2)) * frames) % frames;
    return { img, frameIdx, sx: frameIdx * sw, sy: 0, sw, sh };
  }

  private drawTutorialBeacon(engine: GameEngine, ui: RenderUIState): void {
    const padId = ui.tutorialPadId;
    if (!padId || ui.selectedPadId === padId) return;
    if (engine.towers.some((tw) => tw.padId === padId)) return;
    const pad = engine.getStage().pads.find((p) => p.id === padId);
    if (!pad) return;

    const ctx = this.ctx;
    const t = this.uiAnimTime;
    const pulse = (t * 1.45) % 1;
    const bob = Math.sin(t * 5.2) * 5;

    ctx.save();
    ctx.translate(pad.x, pad.y);

    // Expanding outer ripple ring
    ctx.strokeStyle = `rgba(250, 204, 21, ${(1 - pulse) * 0.85})`;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.ellipse(0, 2, 34 + pulse * 26, 20 + pulse * 15, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner glowing gold ring
    ctx.strokeStyle = '#fde047';
    ctx.fillStyle = 'rgba(250, 204, 21, 0.16)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(0, 2, 35, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Bouncing golden chevron arrow pointing straight at the pad
    const ay = -42 + bob;
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, ay + 14);
    ctx.lineTo(-12, ay);
    ctx.lineTo(-5, ay);
    ctx.lineTo(-5, ay - 12);
    ctx.lineTo(5, ay - 12);
    ctx.lineTo(5, ay);
    ctx.lineTo(12, ay);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private drawCenteredIconLabel(
    icon: IconName,
    text: string,
    cx: number,
    cy: number,
    opts: {
      iconSize: number;
      iconColor: string;
      textColor: string;
      font: string;
      gap?: number;
      strokeWidth?: number;
      iconFill?: string;
      textStrokeColor?: string;
      textStrokeWidth?: number;
      textOffsetY?: number;
      maxTextWidth?: number;
    }
  ): void {
    const ctx = this.ctx;
    const gap = text ? (opts.gap ?? 4) : 0;
    ctx.save();
    ctx.setLineDash([]);
    ctx.font = opts.font;
    const rawTextW = text ? ctx.measureText(text).width : 0;
    const textW = opts.maxTextWidth ? Math.min(rawTextW, opts.maxTextWidth) : rawTextW;
    const totalW = opts.iconSize + gap + textW;
    const startX = cx - totalW / 2;
    drawCanvasIcon(
      ctx,
      icon,
      startX + opts.iconSize / 2,
      cy,
      opts.iconSize,
      opts.iconColor,
      opts.strokeWidth ?? 2.2,
      opts.iconFill
    );
    if (text) {
      const textX = startX + opts.iconSize + gap;
      const textY = cy + (opts.textOffsetY ?? 0.5);
      ctx.font = opts.font;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      if (opts.textStrokeColor) {
        ctx.strokeStyle = opts.textStrokeColor;
        ctx.lineWidth = opts.textStrokeWidth ?? 2.5;
        ctx.lineJoin = 'round';
        if (opts.maxTextWidth) {
          ctx.strokeText(text, textX, textY, opts.maxTextWidth);
        } else {
          ctx.strokeText(text, textX, textY);
        }
      }
      ctx.fillStyle = opts.textColor;
      if (opts.maxTextWidth) {
        ctx.fillText(text, textX, textY, opts.maxTextWidth);
      } else {
        ctx.fillText(text, textX, textY);
      }
    }
    ctx.restore();
  }

  private getTargetBossBannerY(force = false): number {
    if (typeof document !== 'undefined') {
      if (!this.toastEl) this.toastEl = document.getElementById('banner-toast');
      if (!this.hudTopEl) this.hudTopEl = document.getElementById('hud-top');
    }
    const toastHidden = this.toastEl ? this.toastEl.classList.contains('hidden') : true;
    const sizeChanged =
      this.canvas.width !== this.lastBannerCanvasW || this.canvas.height !== this.lastBannerCanvasH;
    if (
      !force &&
      !sizeChanged &&
      toastHidden === this.lastToastHidden &&
      this.lastWallMs - this.lastBannerMeasureMs < 250
    ) {
      return this.cachedTargetBannerY;
    }

    const cRect = this.canvas.getBoundingClientRect?.();
    let minTop = 60;
    if (cRect && cRect.height > 0 && this.hudTopEl) {
      const hRect = this.hudTopEl.getBoundingClientRect();
      if (hRect.height > 0) {
        const hudLogicalBottom = ((hRect.bottom - cRect.top) / cRect.height) * LOGICAL_H;
        minTop = Math.max(58, Math.min(125, Math.ceil(hudLogicalBottom + 6)));
      }
    }
    let result = minTop;
    if (this.toastEl && !toastHidden) {
      if (cRect && cRect.height > 0) {
        const tRect = this.toastEl.getBoundingClientRect();
        if (tRect.height > 0) {
          const toastLogicalBottom = ((tRect.bottom - cRect.top) / cRect.height) * LOGICAL_H;
          result = Math.max(minTop, Math.min(175, Math.ceil(toastLogicalBottom + 8)));
        } else {
          result = Math.max(minTop, 100);
        }
      } else {
        result = Math.max(minTop, 100);
      }
    }

    this.cachedTargetBannerY = result;
    this.lastBannerMeasureMs = this.lastWallMs;
    this.lastToastHidden = toastHidden;
    this.lastBannerCanvasW = this.canvas.width;
    this.lastBannerCanvasH = this.canvas.height;
    return result;
  }

  private getStageScenery(stage: StageConfig): StageScenery {
    const cached = this.sceneryCache.get(stage.id);
    if (cached) return cached;

    const roadPebbles: RoadPebble[] = [];
    const grassTufts: GrassTuft[] = [];
    const cobbleSlabs: CobbleSlab[] = [];
    const lanternPosts: RoadLanternPost[] = [];
    const theme = getRoadTheme(stage);
    const crossingCenter = findCrossingCenter(stage.sampledPaths, stage.id);
    const furnaceJunctions = findFurnaceJunctions(stage.sampledPaths, theme);
    const fiberEdgeStrips =
      theme === 'furnace' ? buildFiberEdgeStrips(stage.sampledPaths, stage.castlePos.x) : [];

    // Precompute deterministic road pebbles & stone flecks (exact Stage 1 meadow recipe preserved!)
    let seed = 1;
    for (let pIdx = 0; pIdx < stage.sampledPaths.length; pIdx++) {
      const path = stage.sampledPaths[pIdx];
      for (let i = 2; i < path.points.length - 1; i += 3) {
        const pt = path.points[i];
        const next = path.points[Math.min(path.points.length - 1, i + 1)];
        const ang = Math.atan2(next.y - pt.y, next.x - pt.x);
        const nx = -Math.sin(ang);
        const ny = Math.cos(ang);

        const off = (hash01(seed++) - 0.5) * 34;
        const px = pt.x + nx * off;
        const py = pt.y + ny * off;
        if (px < 0 || px > stage.castlePos.x - 55) continue;

        roadPebbles.push({
          x: px,
          y: py,
          rx: 2.6 + hash01(seed++) * 3.6,
          ry: 1.6 + hash01(seed++) * 2.1,
          rot: ang + (hash01(seed++) - 0.5) * 0.9,
          shade: hash01(seed++),
        });
      }
    }

    // Precompute deterministic grass / highland heather tufts flanking road shoulders
    let gSeed = 500;
    for (let pIdx = 0; pIdx < stage.sampledPaths.length; pIdx++) {
      const path = stage.sampledPaths[pIdx];
      for (let i = 4; i < path.points.length - 4; i += 4) {
        const pt = path.points[i];
        const next = path.points[Math.min(path.points.length - 1, i + 1)];
        const ang = Math.atan2(next.y - pt.y, next.x - pt.x);
        const nx = -Math.sin(ang);
        const ny = Math.cos(ang);

        for (const side of [-1, 1]) {
          if (hash01(gSeed++) < 0.34) continue;
          const distOut = 32 + hash01(gSeed++) * 10;
          const gx = pt.x + nx * side * distOut + (hash01(gSeed++) - 0.5) * 6;
          const gy = pt.y + ny * side * distOut + (hash01(gSeed++) - 0.5) * 6;

          if (gx < 26 || gx > stage.castlePos.x - 95 || gy < 62 || gy > LOGICAL_H - 48) continue;
          if (closestPointOnPaths(stage.sampledPaths, gx, gy).distToRoad < 29) continue;
          const nearPad = stage.pads.some((pad) => Math.hypot(pad.x - gx, pad.y - gy) < 46);
          if (nearPad) continue;

          grassTufts.push({
            x: gx,
            y: gy,
            scale: 0.78 + hash01(gSeed++) * 0.45,
            phase: hash01(gSeed++) * Math.PI * 2,
            flip: hash01(gSeed++) > 0.5 ? 1 : -1,
            tone: hash01(gSeed++),
          });
        }
      }
    }

    // Bespoke Stage 2 ('bridge' — EU Audit Canyon) weathered flagstones & roadside lantern posts
    if (stage.roadTheme === 'bridge') {
      let cSeed = 1200;
      for (let pIdx = 0; pIdx < stage.sampledPaths.length; pIdx++) {
        const path = stage.sampledPaths[pIdx];
        let nextSlabDist = 14;
        let rowToggle = 0;
        for (let i = 1; i < path.points.length - 1; i++) {
          const d = path.cumDist[i];
          if (d < nextSlabDist) continue;
          nextSlabDist = d + 20 + hash01(cSeed++) * 5;
          rowToggle++;

          const pt = path.points[i];
          if (pt.x < -12 || pt.x > stage.castlePos.x - 56) continue;
          if (
            crossingCenter &&
            Math.hypot(pt.x - crossingCenter.x, pt.y - crossingCenter.y) < 47
          ) {
            continue;
          }

          const prev = path.points[Math.max(0, i - 1)];
          const next = path.points[Math.min(path.points.length - 1, i + 1)];
          const ang = Math.atan2(next.y - prev.y, next.x - prev.x);
          const nx = -Math.sin(ang);
          const ny = Math.cos(ang);

          // 2 staggered courses of weathered EU cobblestone flagstones across road width
          const offsets = rowToggle % 2 === 0 ? [-11, 10.5] : [-12.5, 0, 12.5];
          for (const latOff of offsets) {
            const jitterT = (hash01(cSeed++) - 0.5) * 3.2;
            const sx = pt.x + nx * latOff + Math.cos(ang) * jitterT;
            const sy = pt.y + ny * latOff + Math.sin(ang) * jitterT;
            if (
              crossingCenter &&
              Math.hypot(sx - crossingCenter.x, sy - crossingCenter.y) < 44
            ) {
              continue;
            }
            cobbleSlabs.push({
              x: sx,
              y: sy,
              w: offsets.length === 2 ? 14.5 + hash01(cSeed++) * 4.5 : 11 + hash01(cSeed++) * 4,
              h: offsets.length === 2 ? 9.5 + hash01(cSeed++) * 3.5 : 8 + hash01(cSeed++) * 3,
              rot: ang + (hash01(cSeed++) - 0.5) * 0.14,
              tone: hash01(cSeed++),
              moss: Math.abs(latOff) >= 10 && hash01(cSeed++) < 0.22,
            });
          }
        }
      }

      // Place warm amber wrought-iron lantern posts cleanly along road bends & X-crossing shoulders
      let lSeed = 2400;
      const tryPlaceLantern = (lx: number, ly: number, side: number): boolean => {
        if (lx < 115 || lx > stage.castlePos.x - 125 || ly < 92 || ly > LOGICAL_H - 76) return false;
        if (closestPointOnPaths(stage.sampledPaths, lx, ly).distToRoad < 33) return false;
        if (stage.pads.some((pad) => Math.hypot(pad.x - lx, pad.y - ly) < 58)) return false;
        if (stage.entryMarkers.some((m) => Math.hypot(m.x - lx, m.y - ly) < 70)) return false;
        if (lanternPosts.some((p) => Math.hypot(p.x - lx, p.y - ly) < 150)) return false;
        lanternPosts.push({
          x: lx,
          y: ly,
          phase: hash01(lSeed++) * Math.PI * 2,
          side,
        });
        return true;
      };

      // Anchor 2 welcoming lantern posts flanking the central X-Crossing stone plaza if clear
      if (crossingCenter) {
        tryPlaceLantern(crossingCenter.x - 66, crossingCenter.y - 6, -1);
        tryPlaceLantern(crossingCenter.x + 68, crossingCenter.y - 4, 1);
      }

      for (let pIdx = 0; pIdx < stage.sampledPaths.length; pIdx++) {
        const path = stage.sampledPaths[pIdx];
        for (let i = 10; i < path.points.length - 10; i += 9) {
          if (lanternPosts.length >= 8) break;
          const pt = path.points[i];
          const prev = path.points[i - 4];
          const next = path.points[i + 4];
          const a1 = Math.atan2(pt.y - prev.y, pt.x - prev.x);
          const a2 = Math.atan2(next.y - pt.y, next.x - pt.x);
          let turn = Math.abs(a2 - a1);
          if (turn > Math.PI) turn = Math.PI * 2 - turn;
          // Prefer bends and evenly spaced stretches
          if (turn < 0.08 && i % 27 !== 10) continue;

          const ang = Math.atan2(next.y - prev.y, next.x - prev.x);
          const nx = -Math.sin(ang);
          const ny = Math.cos(ang);
          const prefSide = (pIdx + i) % 2 === 0 ? -1 : 1;
          for (const side of [prefSide, -prefSide]) {
            const distOut = 38;
            if (tryPlaceLantern(pt.x + nx * side * distOut, pt.y + ny * side * distOut, side)) {
              break;
            }
          }
        }
      }
    }

    // Bespoke Stage 3 ('furnace' — 4 AM Server Furnace) beveled obsidian circuit-stone slabs & fiber beacon pylons
    if (theme === 'furnace') {
      let fSeed = 3600;
      const gateMerge = furnaceJunctions?.gateMerge ?? { x: 1015, y: 348 };
      for (let pIdx = 0; pIdx < stage.sampledPaths.length; pIdx++) {
        const path = stage.sampledPaths[pIdx];
        let nextSlabDist = 16;
        let rowToggle = 0;
        for (let i = 1; i < path.points.length - 1; i++) {
          const d = path.cumDist[i];
          if (d < nextSlabDist) continue;
          nextSlabDist = d + 22 + hash01(fSeed++) * 4;
          rowToggle++;

          const pt = path.points[i];
          if (pt.x < -10 || pt.x > stage.castlePos.x - 54) continue;
          // Avoid duplicating slabs on Lane 1 once merged into the Castle Gate straightaway
          if (pIdx === 1 && pt.x > gateMerge.x - 14) continue;
          // Keep circular clearing crisp around octagonal Castle Gate merge server plate
          if (Math.hypot(pt.x - gateMerge.x, pt.y - gateMerge.y) < 35) continue;

          const prev = path.points[Math.max(0, i - 1)];
          const next = path.points[Math.min(path.points.length - 1, i + 1)];
          const ang = Math.atan2(next.y - prev.y, next.x - prev.x);
          const nx = -Math.sin(ang);
          const ny = Math.cos(ang);

          const offsets = rowToggle % 2 === 0 ? [-10.5, 10.5] : [-12, 0, 12];
          for (const latOff of offsets) {
            const jitterT = (hash01(fSeed++) - 0.5) * 2.2;
            const sx = pt.x + nx * latOff + Math.cos(ang) * jitterT;
            const sy = pt.y + ny * latOff + Math.sin(ang) * jitterT;
            if (Math.hypot(sx - gateMerge.x, sy - gateMerge.y) < 33) continue;
            cobbleSlabs.push({
              x: sx,
              y: sy,
              w: offsets.length === 2 ? 16 + hash01(fSeed++) * 3.5 : 12 + hash01(fSeed++) * 3,
              h: offsets.length === 2 ? 9.5 + hash01(fSeed++) * 2.5 : 8 + hash01(fSeed++) * 2.5,
              rot: ang + (hash01(fSeed++) - 0.5) * 0.06,
              tone: hash01(fSeed++),
              // Reuse moss flag to mark subtle inlaid cyan/violet micro-circuit slabs
              moss: hash01(fSeed++) < 0.24,
            });
          }
        }
      }

      // Place sleek obsidian fiber-optic beacon pylons along Stage 3 bends & central pinch shoulders
      let pSeed = 4800;
      const tryPlacePylon = (lx: number, ly: number, side: number): boolean => {
        if (lx < 110 || lx > stage.castlePos.x - 120 || ly < 88 || ly > LOGICAL_H - 72) return false;
        if (closestPointOnPaths(stage.sampledPaths, lx, ly).distToRoad < 34) return false;
        if (stage.pads.some((pad) => Math.hypot(pad.x - lx, pad.y - ly) < 58)) return false;
        if (stage.entryMarkers.some((m) => Math.hypot(m.x - lx, m.y - ly) < 72)) return false;
        if (lanternPosts.some((p) => Math.hypot(p.x - lx, p.y - ly) < 155)) return false;
        lanternPosts.push({
          x: lx,
          y: ly,
          phase: hash01(pSeed++) * Math.PI * 2,
          side,
        });
        return true;
      };

      if (furnaceJunctions) {
        tryPlacePylon(furnaceJunctions.pinchCenter.x - 76, furnaceJunctions.pinchCenter.y, -1);
        tryPlacePylon(furnaceJunctions.pinchCenter.x + 76, furnaceJunctions.pinchCenter.y, 1);
      }

      for (let pIdx = 0; pIdx < stage.sampledPaths.length; pIdx++) {
        const path = stage.sampledPaths[pIdx];
        for (let i = 10; i < path.points.length - 10; i += 10) {
          if (lanternPosts.length >= 8) break;
          const pt = path.points[i];
          const prev = path.points[i - 4];
          const next = path.points[i + 4];
          const ang = Math.atan2(next.y - prev.y, next.x - prev.x);
          const nx = -Math.sin(ang);
          const ny = Math.cos(ang);
          const prefSide = pIdx === 0 ? -1 : 1;
          for (const side of [prefSide, -prefSide]) {
            if (tryPlacePylon(pt.x + nx * side * 39, pt.y + ny * side * 39, side)) {
              break;
            }
          }
        }
      }
    }

    const scenery: StageScenery = {
      roadPebbles,
      grassTufts,
      cobbleSlabs,
      lanternPosts,
      crossingCenter,
      furnaceJunctions,
      fiberEdgeStrips,
      combinedRoadPath: buildCombinedRoadPath2D(stage.sampledPaths),
    };
    this.sceneryCache.set(stage.id, scenery);
    return scenery;
  }

  private syncRendererVfx(engine: GameEngine): void {
    // Continuous wall-clock step keeps hover range pulses & Victory/Defeat stage FX silky smooth even when paused/ended
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const wallDt =
      this.lastWallMs > 0 ? Math.max(0, Math.min(0.05, (nowMs - this.lastWallMs) / 1000)) : 0.016;
    this.lastWallMs = nowMs;
    this.uiAnimTime += wallDt;

    this.syncStageEndFx(engine, wallDt);

    // Detect engine reset
    if (engine.time < this.lastEngineTime) {
      this.prevEnemyFlash.clear();
      this.prevProjectiles.clear();
      this.bossHpTrails.clear();
      this.bossBannerY = this.getTargetBossBannerY(true);
      this.sparks = [];
      this.laserTracers = [];
      this.prevStepHalf.clear();
      this.lastEngineTime = engine.time;
      return;
    }

    const dt = Math.max(0, Math.min(0.05, engine.time - this.lastEngineTime));
    this.lastEngineTime = engine.time;

    // Track active bosses for dramatic delayed damage trails on Boss HP banner
    const activeBossIds = new Set<number>();
    for (const e of engine.enemies) {
      if (!e.isBoss) continue;
      activeBossIds.add(e.id);
      const ratio = Math.max(0, Math.min(1, e.hp / Math.max(1, e.maxHp)));
      const prevTrail = this.bossHpTrails.get(e.id);
      if (prevTrail === undefined || ratio > prevTrail) {
        this.bossHpTrails.set(e.id, ratio);
      } else if (dt > 0 && prevTrail > ratio) {
        this.bossHpTrails.set(e.id, Math.max(ratio, prevTrail - dt * 0.38));
      }
    }
    for (const id of this.bossHpTrails.keys()) {
      if (!activeBossIds.has(id)) this.bossHpTrails.delete(id);
    }

    // Smoothly avoid #banner-toast only when Boss HP bar or Wave Banner is active (zero DOM reflows otherwise!)
    if (activeBossIds.size > 0 || getWaveBanner(engine) !== null) {
      const targetBannerY = this.getTargetBossBannerY();
      if (dt === 0) {
        this.bossBannerY = targetBannerY;
      } else {
        this.bossBannerY += (targetBannerY - this.bossBannerY) * Math.min(1, dt * 14);
      }
    }

    // Detect fresh enemy hits -> emit crisp comic hit sparks
    const activeEnemyIds = new Set<number>();
    for (const e of engine.enemies) {
      activeEnemyIds.add(e.id);
      const prev = this.prevEnemyFlash.get(e.id) ?? 0;
      if (e.hitFlash > prev + 0.18) {
        const sparkColor = e.armor >= 0.5 ? '#fde047' : e.magicResist >= 0.5 ? '#e879f9' : '#ffffff';
        const count = e.isBoss ? 6 : 4;
        for (let i = 0; i < count; i++) {
          const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.7;
          const sp = 55 + Math.random() * 85;
          this.pushSpark({
            x: e.x + (Math.random() - 0.5) * 10,
            y: e.y - (e.isBoss ? 34 : 18) + (Math.random() - 0.5) * 10,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp - 16,
            size: 3 + Math.random() * 2.5,
            color: i % 2 === 0 ? sparkColor : '#fef08a',
            life: 0.18 + Math.random() * 0.1,
            maxLife: 0.28,
            kind: 'spark',
          });
        }
      }
      this.prevEnemyFlash.set(e.id, e.hitFlash);
    }
    for (const id of this.prevEnemyFlash.keys()) {
      if (!activeEnemyIds.has(id)) this.prevEnemyFlash.delete(id);
    }

    // Track projectiles to spawn crisp sniper laser afterimages & mortar burst puffs on completion
    const currentProjIds = new Set<number>();
    for (const p of engine.projectiles) {
      currentProjIds.add(p.id);
      if (p.progress >= 0) {
        this.prevProjectiles.set(p.id, {
          kind: p.kind,
          startX: p.startX,
          startY: p.startY,
          x: p.x,
          y: p.y,
          targetX: p.targetX,
          targetY: p.targetY,
          crit: p.crit,
        });
      }
    }
    for (const [id, prev] of this.prevProjectiles.entries()) {
      if (!currentProjIds.has(id)) {
        if (prev.kind === 'sniper') {
          this.laserTracers.push({
            x1: prev.startX,
            y1: prev.startY,
            x2: prev.targetX,
            y2: prev.targetY,
            life: prev.crit ? 0.32 : 0.22,
            maxLife: prev.crit ? 0.32 : 0.22,
            crit: Boolean(prev.crit),
          });
          for (let i = 0; i < (prev.crit ? 7 : 4); i++) {
            const ang = Math.random() * Math.PI * 2;
            const sp = 60 + Math.random() * 90;
            this.pushSpark({
              x: prev.targetX,
              y: prev.targetY,
              vx: Math.cos(ang) * sp,
              vy: Math.sin(ang) * sp,
              size: prev.crit ? 5 : 3.5,
              color: i % 2 === 0 ? '#fde047' : '#ffffff',
              life: 0.26,
              maxLife: 0.26,
              kind: 'star',
            });
          }
        } else if (prev.kind === 'mortar' || prev.kind === 'yolo') {
          for (let i = 0; i < 6; i++) {
            const ang = Math.random() * Math.PI * 2;
            const sp = 28 + Math.random() * 54;
            this.pushSpark({
              x: prev.targetX + (Math.random() - 0.5) * 14,
              y: prev.targetY + (Math.random() - 0.5) * 8,
              vx: Math.cos(ang) * sp,
              vy: -22 - Math.random() * 38,
              size: 7 + Math.random() * 6,
              color: prev.kind === 'yolo' ? '#fdba74' : '#cbd5e1',
              life: 0.36 + Math.random() * 0.16,
              maxLife: 0.52,
              kind: 'smoke',
            });
          }
        }
        this.prevProjectiles.delete(id);
      }
    }

    // Advance sparks & tracers
    if (dt > 0) {
      this.sparks = this.sparks.filter((s) => {
        s.life -= dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.kind === 'spark') {
          s.vx *= 0.9;
          s.vy *= 0.9;
        } else if (s.kind === 'smoke') {
          s.vx *= 0.94;
          s.vy -= 12 * dt;
        }
        return s.life > 0;
      });
      this.laserTracers = this.laserTracers.filter((tr) => {
        tr.life -= dt;
        return tr.life > 0;
      });
    }
  }

  private pushSpark(s: RendererSpark): void {
    if (this.sparks.length >= 140) {
      this.sparks.shift();
    }
    this.sparks.push(s);
  }

  public render(engine: GameEngine, ui: RenderUIState): void {
    // Guard cleanly against zero-size canvas (prevents InvalidStateError on offscreen drawImage)
    if (this.canvas.width <= 0 || this.canvas.height <= 0) {
      return;
    }

    const ctx = this.ctx;

    // HiDPI-safe logical 1280x720 transform (auto-adapts to Retina DPR backing buffer)
    const scaleX = this.canvas.width / LOGICAL_W;
    const scaleY = this.canvas.height / LOGICAL_H;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    this.syncRendererVfx(engine);

    const stage = engine.getStage();
    const roadTheme = getRoadTheme(stage);
    const bg = assets.get(stage.bgAsset as AssetKey);
    const bgLoaded = Boolean(bg && bg.complete && bg.naturalWidth > 0);
    const shaking = engine.screenShake > 0.2;

    // Stage-matched base fill only needed during screen shake to prevent edge slivers
    if (shaking) {
      ctx.fillStyle =
        roadTheme === 'furnace' ? '#162033' : roadTheme === 'bridge' ? '#4a4e16' : '#477f2f';
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    }

    ctx.save();

    // Screen shake
    if (shaking) {
      const sx = (Math.random() - 0.5) * engine.screenShake;
      const sy = (Math.random() - 0.5) * engine.screenShake;
      ctx.translate(sx, sy);
    }

    // Blit pre-baked HiDPI static terrain layer (backdrop + lighting vignette + spline roads + pebbles/slabs + static emblems/bases)
    const staticCanvas = this.ensureStaticStageCache(stage, bg, bgLoaded);
    if (staticCanvas) {
      ctx.drawImage(staticCanvas, 0, 0, LOGICAL_W, LOGICAL_H);
    } else {
      this.bakeStaticStageLayers(ctx, stage, bgLoaded ? bg : null);
    }

    // Draw only dynamic animated stage overlays on top of cached terrain
    this.drawDynamicBackdropOverlays(engine, stage);
    this.drawDynamicRoadOverlays(engine, stage);
    this.drawEntrySignposts(engine);
    this.drawGroundEffects(engine);
    this.drawTowerPads(engine, ui);
    this.drawTutorialBeacon(engine, ui);
    this.drawRangesAndTargeting(engine, ui);
    this.drawCastle(engine);

    // Depth-sorted entities (Towers, Hero, Guards, VIPs, Enemies)
    const drawables: Array<{ y: number; draw: () => void }> = [];

    for (const tw of engine.towers) {
      const isSelected = ui.selectedPadId === tw.padId;
      drawables.push({ y: tw.y + 10, draw: () => this.drawTower(tw, engine, isSelected) });
    }
    for (const g of engine.guards) {
      if (g.alive) drawables.push({ y: g.y, draw: () => this.drawGuard(g, engine) });
    }
    if (engine.hero.alive) {
      drawables.push({ y: engine.hero.y, draw: () => this.drawHero(engine) });
    }
    const selEntity = ui.selectedEntity ?? null;
    for (const v of engine.vips) {
      const isSelected = selEntity?.kind === 'vip' && selEntity.id === v.id;
      drawables.push({ y: v.y, draw: () => this.drawVip(v, engine, isSelected) });
    }
    for (const e of engine.enemies) {
      const isSelected = selEntity?.kind === 'enemy' && selEntity.id === e.id;
      drawables.push({ y: e.y, draw: () => this.drawEnemy(e, engine, isSelected) });
    }

    drawables.sort((a, b) => a.y - b.y);
    for (const item of drawables) item.draw();

    this.drawSuctionBeams(engine);
    this.drawSniperSightlines(engine);
    this.drawProjectiles(engine);
    this.drawLaserTracers();
    this.drawLightning(engine);
    this.drawFallingDeletes(engine);
    this.drawParticles(engine);
    this.drawRendererSparks();
    if (roadTheme === 'bridge') {
      this.drawTwilightFireflies(engine);
    } else if (roadTheme === 'furnace') {
      this.drawMidnightFurnaceSparks(engine);
    }
    this.drawFloatingTexts(engine);

    // Move ping
    if (engine.movePing) {
      const p = engine.movePing;
      const frac = 1 - p.timer / 0.7;
      ctx.save();
      ctx.strokeStyle = `rgba(250, 204, 21, ${1 - frac})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 12 + frac * 26, 6 + frac * 13, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Inner secondary ring
      ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - frac) * 0.7})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 6 + frac * 14, 3 + frac * 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Dedicated late top overlay pass: Fake Delete Rug GB/timer pills + Speech Bubbles ALWAYS above towers & units!
    this.drawTopWorldOverlays(engine);

    // Bouncing Kingdom Rush wave call icons at stage-configured lane entrances
    if (engine.canCallNextWave() && !engine.gameOver) {
      const nextDef = engine.getNextWaveDef();
      const nextWaveNum = engine.waveIndex + 1;
      for (let laneIdx = 0; laneIdx < stage.entryBadges.length; laneIdx++) {
        const badge = stage.entryBadges[laneIdx];
        const marker = stage.entryMarkers[laneIdx];
        const unlockWave = marker?.unlockWave ?? (laneIdx === 0 ? 1 : 3);
        const laneHasEvents = nextDef.events.some((ev) => ev.lane === laneIdx);
        if (laneIdx === 0 || nextWaveNum >= unlockWave || laneHasEvents) {
          const hasVip = nextDef.events.some((ev) => ev.entityType === 'vip' && ev.lane === laneIdx);
          this.drawEntryCallBadge(engine, badge.x, badge.y, hasVip);
        }
      }
    }

    // End world screen-shake transform before screen-anchored overlays
    ctx.restore();

    // Leak alarm crimson edge vignette pulse
    if (engine.leakFlashTimer > 0) {
      const a = Math.abs(Math.sin(engine.time * 12)) * 0.34 * Math.min(1, engine.leakFlashTimer);
      const vig = ctx.createRadialGradient(
        LOGICAL_W / 2,
        LOGICAL_H / 2,
        LOGICAL_H * 0.32,
        LOGICAL_W / 2,
        LOGICAL_H / 2,
        LOGICAL_W * 0.62
      );
      vig.addColorStop(0, 'rgba(239, 68, 68, 0)');
      vig.addColorStop(1, `rgba(220, 38, 38, ${a})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    } else if (engine.signFlipTimer > 0) {
      const a = Math.min(1, engine.signFlipTimer) * 0.18;
      const vig = ctx.createRadialGradient(
        stage.castleSignPos.x,
        stage.castleSignPos.y,
        30,
        LOGICAL_W / 2,
        LOGICAL_H / 2,
        LOGICAL_W * 0.72
      );
      vig.addColorStop(0, `rgba(192, 132, 252, ${a * 1.15})`);
      vig.addColorStop(1, `rgba(88, 28, 135, ${a * 0.55})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    }

    // Spinning golden flying coins arcing smoothly to the top gold HUD pill
    this.drawFlyingCoins(engine);

    // Epic royal-blue & gold EU GDPR Boss Health Bar Banner (screen-anchored, never collides with HUD/toast)
    this.drawBossHealthBanner(engine);

    // Sleek Kingdom Rush-style Wave Intro Banner Ribbon
    this.drawWaveBanner(engine);

    // Victory celebratory fireworks & Defeat ruined-fortress embers/smoke behind Result modals
    this.drawStageEndFx(engine);

    // Pause banner (suppress when Policy Draft modal is open so modals never clash)
    if (engine.paused && !engine.gameOver && !engine.pendingPolicies) {
      const cx = LOGICAL_W / 2;
      const cy = LOGICAL_H / 2;
      const pauseLabel = translate(engine.lang, 'canvas.paused');
      const pauseFont = '900 24px system-ui, -apple-system, sans-serif';
      const pauseIconSize = 22;
      const pauseGap = 10;
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
      ctx.font = pauseFont;
      const pauseBoxW = Math.max(
        232,
        Math.min(LOGICAL_W - 64, Math.ceil(ctx.measureText(pauseLabel).width + pauseIconSize + pauseGap) + 64)
      );
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cx - pauseBoxW / 2, cy - 34, pauseBoxW, 68, 16);
      ctx.fill();
      ctx.stroke();
      this.drawCenteredIconLabel('pause', pauseLabel, cx, cy, {
        iconSize: pauseIconSize,
        iconColor: '#fef08a',
        textColor: '#fef08a',
        font: pauseFont,
        gap: pauseGap,
        strokeWidth: 2.5,
        textOffsetY: 1,
        maxTextWidth: pauseBoxW - pauseIconSize - pauseGap - 36,
      });
      ctx.restore();
    }
  }

  private drawEntryCallBadge(engine: GameEngine, x: number, y: number, hasVip: boolean): void {
    const ctx = this.ctx;
    const bob = Math.sin(engine.time * 5.6) * 4;
    const pulse = 0.5 + 0.5 * Math.sin(engine.time * 5.6);

    ctx.save();
    ctx.translate(x, y + bob);

    // Outer pulsing call ring
    ctx.strokeStyle = `rgba(254, 240, 138, ${0.3 + pulse * 0.45})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 23 + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();

    // Metallic dark outer border
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.arc(0, 2, 21, 0, Math.PI * 2);
    ctx.fill();

    // Rich crimson button body
    const grad = ctx.createRadialGradient(-5, -6, 3, 0, 0, 20);
    grad.addColorStop(0, '#f87171');
    grad.addColorStop(0.55, '#dc2626');
    grad.addColorStop(1, '#991b1b');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Countdown progress arc when auto-counting between waves
    if (!engine.waveActive && engine.betweenWaveTimer > 0) {
      const frac = Math.max(0, Math.min(1, engine.betweenWaveTimer / 11));
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 25, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      ctx.stroke();
    }

    drawCanvasIcon(ctx, 'swords', 0, 0, 18, '#ffffff', 2.4);

    // Mini golden VIP pip if upcoming wave sends a VIP on this lane
    if (hasVip) {
      const vipLabel = translate(engine.lang, 'canvas.vip');
      const vipFont = '900 9px system-ui, -apple-system, sans-serif';
      const vipIconSize = 9.5;
      const vipGap = 3;
      ctx.font = vipFont;
      const pipW = Math.max(
        44,
        Math.min(86, Math.ceil(ctx.measureText(vipLabel).width + vipIconSize + vipGap) + 12)
      );
      ctx.fillStyle = '#854d0e';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-pipW / 2, -34, pipW, 15, 7.5);
      ctx.fill();
      ctx.stroke();
      this.drawCenteredIconLabel('briefcase', vipLabel, 0, -26.5, {
        iconSize: vipIconSize,
        iconColor: '#fde047',
        textColor: '#fef08a',
        font: vipFont,
        gap: vipGap,
        strokeWidth: 2.5,
        maxTextWidth: pipW - vipIconSize - vipGap - 8,
      });
    }
    ctx.restore();
  }

  private ensureStaticStageCache(
    stage: StageConfig,
    bg: HTMLImageElement | null,
    bgLoaded: boolean
  ): HTMLCanvasElement | null {
    const cacheW = this.canvas.width;
    const cacheH = this.canvas.height;
    if (cacheW <= 0 || cacheH <= 0 || typeof document === 'undefined') {
      return null;
    }

    const cacheKey = `${stage.id}|${cacheW}x${cacheH}|${bgLoaded ? 1 : 0}`;
    if (this.staticCache && this.staticCacheKey === cacheKey) {
      return this.staticCache;
    }

    if (!this.staticCache) {
      this.staticCache = document.createElement('canvas');
    }
    if (this.staticCache.width !== cacheW || this.staticCache.height !== cacheH) {
      this.staticCache.width = cacheW;
      this.staticCache.height = cacheH;
      this.staticCacheCtx = this.staticCache.getContext('2d');
    } else if (!this.staticCacheCtx) {
      this.staticCacheCtx = this.staticCache.getContext('2d');
    }

    const sctx = this.staticCacheCtx;
    if (!sctx) return null;

    const scaleX = cacheW / LOGICAL_W;
    const scaleY = cacheH / LOGICAL_H;
    sctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = 'high';

    this.bakeStaticStageLayers(sctx, stage, bgLoaded ? bg : null);
    this.staticCacheKey = cacheKey;
    return this.staticCache;
  }

  private bakeStaticStageLayers(
    sctx: CanvasRenderingContext2D,
    stage: StageConfig,
    bg: HTMLImageElement | null
  ): void {
    const theme = getRoadTheme(stage);
    const isBridge = theme === 'bridge';
    const isFurnace = theme === 'furnace';

    // Opaque stage-matched base fill
    sctx.fillStyle = isFurnace ? '#162033' : isBridge ? '#4a4e16' : '#477f2f';
    sctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    // 1. Hand-painted backdrop image (or crisp themed fallback gradient while loading)
    if (bg) {
      sctx.drawImage(bg, 0, 0, LOGICAL_W, LOGICAL_H);
    } else if (isFurnace) {
      const grad = sctx.createLinearGradient(0, 0, 0, LOGICAL_H);
      grad.addColorStop(0, '#182438');
      grad.addColorStop(0.45, '#1f3149');
      grad.addColorStop(0.82, '#1b2b42');
      grad.addColorStop(1, '#101829');
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

      const moonWash = sctx.createRadialGradient(240, 88, 36, 640, 360, 840);
      moonWash.addColorStop(0, 'rgba(125, 211, 252, 0.20)');
      moonWash.addColorStop(0.48, 'rgba(56, 189, 248, 0.06)');
      moonWash.addColorStop(1, 'rgba(76, 29, 149, 0.24)');
      sctx.fillStyle = moonWash;
      sctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    } else if (isBridge) {
      const grad = sctx.createLinearGradient(0, 0, 0, LOGICAL_H);
      grad.addColorStop(0, '#4f5425');
      grad.addColorStop(0.45, '#7e8324');
      grad.addColorStop(0.82, '#62681d');
      grad.addColorStop(1, '#31341f');
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

      const duskGlow = sctx.createRadialGradient(240, 90, 40, 640, 360, 820);
      duskGlow.addColorStop(0, 'rgba(251, 191, 36, 0.24)');
      duskGlow.addColorStop(0.5, 'rgba(180, 83, 9, 0.08)');
      duskGlow.addColorStop(1, 'rgba(30, 27, 75, 0.28)');
      sctx.fillStyle = duskGlow;
      sctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    } else {
      const grad = sctx.createLinearGradient(0, 0, 0, LOGICAL_H);
      grad.addColorStop(0, '#72b64e');
      grad.addColorStop(0.5, '#62a442');
      grad.addColorStop(1, '#4c8b34');
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    }

    // 2. Static atmospheric lighting sheen & vignette
    if (isFurnace) {
      const moonVignette = sctx.createRadialGradient(230, 72, 45, 640, 360, 880);
      moonVignette.addColorStop(0, 'rgba(186, 230, 253, 0.13)');
      moonVignette.addColorStop(0.38, 'rgba(56, 189, 248, 0.04)');
      moonVignette.addColorStop(0.74, 'rgba(109, 40, 217, 0.09)');
      moonVignette.addColorStop(1, 'rgba(8, 12, 28, 0.30)');
      sctx.fillStyle = moonVignette;
      sctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    } else if (isBridge) {
      const goldenHour = sctx.createRadialGradient(210, 95, 50, 640, 360, 860);
      goldenHour.addColorStop(0, 'rgba(255, 210, 128, 0.17)');
      goldenHour.addColorStop(0.45, 'rgba(245, 158, 11, 0.05)');
      goldenHour.addColorStop(0.78, 'rgba(49, 46, 129, 0.09)');
      goldenHour.addColorStop(1, 'rgba(15, 18, 42, 0.28)');
      sctx.fillStyle = goldenHour;
      sctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    } else {
      const sun = sctx.createRadialGradient(220, 110, 40, 640, 360, 840);
      sun.addColorStop(0, 'rgba(255, 250, 195, 0.14)');
      sun.addColorStop(0.55, 'rgba(255, 245, 190, 0.03)');
      sun.addColorStop(1, 'rgba(15, 23, 42, 0.17)');
      sctx.fillStyle = sun;
      sctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    }

    // 3. All static multi-pass roads, pebbles, flagstones, static plaza/junction plates & lantern/pylon bases
    this.bakeStaticRoads(sctx, stage);
  }

  private drawDynamicBackdropOverlays(engine: GameEngine, stage: StageConfig): void {
    const ctx = this.ctx;
    const theme = getRoadTheme(stage);
    const isBridge = theme === 'bridge';
    const isFurnace = theme === 'furnace';
    const animT = engine.time > 0 ? engine.time : this.uiAnimTime;

    if (isFurnace) {
      // Drifting midnight server haze shadows (pre-baked soft cloud sprite)
      const cloudSprite = this.getGlowSprite(
        'cloud-furnace',
        128,
        [
          [0, 'rgba(11, 17, 38, 0.8)'],
          [0.6, 'rgba(30, 27, 75, 0.42)'],
          [1, 'rgba(11, 17, 38, 0)'],
        ],
        0.08
      );
      if (cloudSprite) {
        ctx.save();
        for (const c of CLOUD_SHADOWS) {
          const span = LOGICAL_W + c.rx * 3;
          const cx = ((c.baseX + animT * c.speed * 0.72) % span) - c.rx * 1.4;
          const cy = c.baseY + Math.sin(animT * 0.18 + c.baseX) * 12;
          ctx.save();
          ctx.globalAlpha = c.alpha;
          ctx.translate(cx, cy);
          ctx.rotate(-0.14);
          ctx.drawImage(cloudSprite, -c.rx, -c.ry, c.rx * 2, c.ry * 2);
          ctx.restore();
        }
        ctx.restore();
      }

      // Gentle breathing neon-cyan / violet server-monolith & warm amber GPU-vent glows aligned to map-furnace.webp landmarks
      const pulseA = 0.78 + 0.22 * Math.sin(animT * 1.9);
      const pulseB = 0.78 + 0.22 * Math.sin(animT * 2.3 + 1.8);
      const cyanRack = this.getGlowSprite(
        'furnace-rack-cyan',
        128,
        [
          [0, 'rgba(34, 211, 238, 0.18)'],
          [0.55, 'rgba(56, 189, 248, 0.07)'],
          [1, 'rgba(15, 23, 42, 0)'],
        ],
        0.07
      );
      const violetRack = this.getGlowSprite(
        'furnace-rack-violet',
        128,
        [
          [0, 'rgba(217, 70, 239, 0.19)'],
          [0.55, 'rgba(168, 85, 247, 0.07)'],
          [1, 'rgba(15, 23, 42, 0)'],
        ],
        0.06
      );
      const amberVent = this.getGlowSprite(
        'furnace-vent-amber',
        128,
        [
          [0, 'rgba(251, 146, 60, 0.22)'],
          [0.5, 'rgba(245, 158, 11, 0.08)'],
          [1, 'rgba(15, 23, 42, 0)'],
        ],
        0.06
      );

      ctx.save();
      if (cyanRack) {
        ctx.globalAlpha = pulseB;
        ctx.drawImage(cyanRack, 164 - 145, 72 - 145, 290, 290);
      }
      if (violetRack) {
        ctx.globalAlpha = pulseA;
        ctx.drawImage(violetRack, 1132 - 165, 66 - 165, 330, 330);
      }
      if (amberVent) {
        ctx.globalAlpha = pulseB;
        ctx.drawImage(amberVent, 152 - 155, 672 - 155, 310, 310);
        ctx.globalAlpha = pulseA;
        ctx.drawImage(amberVent, 1124 - 160, 674 - 160, 320, 320);
      }
      ctx.restore();
      return;
    }

    if (!isBridge) {
      // Stage 1 (Meadow): Animated brook highlights + drifting cloud shadows + sunlit pollen motes
      this.drawBrookHighlights(engine);

      const cloudSprite = this.getGlowSprite(
        'cloud-meadow',
        128,
        [
          [0, 'rgba(18, 44, 28, 1)'],
          [0.6, 'rgba(18, 44, 28, 0.55)'],
          [1, 'rgba(18, 44, 28, 0)'],
        ],
        0.08
      );
      if (cloudSprite) {
        ctx.save();
        for (const c of CLOUD_SHADOWS) {
          const span = LOGICAL_W + c.rx * 3;
          const cx = ((c.baseX + engine.time * c.speed) % span) - c.rx * 1.4;
          const cy = c.baseY + Math.sin(engine.time * 0.22 + c.baseX) * 14;
          ctx.save();
          ctx.globalAlpha = c.alpha;
          ctx.translate(cx, cy);
          ctx.rotate(-0.14);
          ctx.drawImage(cloudSprite, -c.rx, -c.ry, c.rx * 2, c.ry * 2);
          ctx.restore();

          ctx.save();
          ctx.globalAlpha = c.alpha;
          ctx.translate(cx + c.rx * 0.34, cy - c.ry * 0.22);
          ctx.rotate(-0.1);
          ctx.drawImage(
            cloudSprite,
            -c.rx * 0.58,
            -c.ry * 0.65,
            c.rx * 1.16,
            c.ry * 1.3
          );
          ctx.restore();
        }
        ctx.restore();
      }

      // Soft sunlit pollen / dandelion motes drifting gently
      ctx.save();
      for (let i = 0; i < 16; i++) {
        const px = (i * 193 + engine.time * (10 + (i % 4) * 2.5)) % LOGICAL_W;
        const py = 75 + ((i * 97 + Math.sin(engine.time * 0.9 + i * 1.4) * 22) % 580);
        const twinkle = 0.22 + 0.32 * (0.5 + 0.5 * Math.sin(engine.time * 2.4 + i * 2.1));
        ctx.fillStyle = `rgba(255, 253, 210, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.8 + (i % 3) * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    // Stage 2 (EU Audit Canyon): Animated alpine waterfall glints + glowing painted canyon lanterns
    this.drawBridgeAlpineHighlights(animT);

    // Drifting twilight cloud shadows (cool slate-indigo dusk tones)
    const bridgeCloudSprite = this.getGlowSprite(
      'cloud-bridge',
      128,
      [
        [0, 'rgba(22, 24, 48, 0.92)'],
        [0.6, 'rgba(28, 25, 52, 0.48)'],
        [1, 'rgba(22, 24, 48, 0)'],
      ],
      0.08
    );
    if (bridgeCloudSprite) {
      ctx.save();
      for (const c of CLOUD_SHADOWS) {
        const span = LOGICAL_W + c.rx * 3;
        const cx = ((c.baseX + animT * c.speed * 0.85) % span) - c.rx * 1.4;
        const cy = c.baseY + Math.sin(animT * 0.2 + c.baseX) * 14;
        ctx.save();
        ctx.globalAlpha = c.alpha;
        ctx.translate(cx, cy);
        ctx.rotate(-0.14);
        ctx.drawImage(bridgeCloudSprite, -c.rx, -c.ry, c.rx * 2, c.ry * 2);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = c.alpha;
        ctx.translate(cx + c.rx * 0.34, cy - c.ry * 0.22);
        ctx.rotate(-0.1);
        ctx.drawImage(
          bridgeCloudSprite,
          -c.rx * 0.58,
          -c.ry * 0.65,
          c.rx * 1.16,
          c.ry * 1.3
        );
        ctx.restore();
      }
      ctx.restore();
    }

    // Subtle drifting autumn leaf flecks in the highland breeze
    ctx.save();
    for (let i = 0; i < 10; i++) {
      const lx = (i * 157 + animT * (14 + (i % 3) * 4)) % (LOGICAL_W + 40) - 20;
      const ly = 72 + ((i * 89 + animT * (6 + (i % 2) * 3) + Math.sin(animT * 1.4 + i) * 18) % 580);
      const rot = animT * (1.2 + (i % 3) * 0.4) + i;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(rot);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(234, 88, 12, 0.48)' : 'rgba(245, 158, 11, 0.46)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.2, 2.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private drawBridgeAlpineHighlights(t: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Animated whitewater ribbons & splash foam on top-right alpine waterfall of map-bridge.webp
    for (let idx = 0; idx < BRIDGE_WATERFALL_STREAMS.length; idx++) {
      const [p0, p1, p2] = BRIDGE_WATERFALL_STREAMS[idx];
      ctx.strokeStyle = 'rgba(224, 247, 255, 0.44)';
      ctx.lineWidth = 2.8;
      ctx.setLineDash([8, 13]);
      ctx.lineDashOffset = -t * 34 + idx * 9;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 17]);
      ctx.lineDashOffset = -t * 42 + idx * 13;
      ctx.beginPath();
      ctx.moveTo(p0.x - 4, p0.y + 3);
      ctx.quadraticCurveTo(p1.x - 3, p1.y + 3, p2.x - 2, p2.y + 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Bubbling mist at the top-right waterfall splash pool
    for (let b = 0; b < 5; b++) {
      const bp = (t * 2.2 + b * 0.47) % 1;
      const bx = 1158 + Math.sin(b * 2.1 + t * 2.4) * 16;
      const by = 122 - bp * 7;
      ctx.fillStyle = `rgba(240, 252, 255, ${(1 - bp) * 0.68})`;
      ctx.beginPath();
      ctx.arc(bx, by, 2 + (1 - bp) * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft warm flickering amber halo around the two painted wooden canyon lanterns on map-bridge.webp
    const paintedGlow = this.getGlowSprite(
      'bridge-painted-lantern',
      64,
      [
        [0, 'rgba(254, 240, 138, 0.42)'],
        [0.45, 'rgba(251, 191, 36, 0.22)'],
        [1, 'rgba(245, 158, 11, 0)'],
      ],
      0.08
    );
    if (paintedGlow) {
      for (let i = 0; i < BRIDGE_PAINTED_LANTERNS.length; i++) {
        const lp = BRIDGE_PAINTED_LANTERNS[i];
        const pulse = 0.78 + 0.22 * Math.sin(t * 4.4 + i * 2.1);
        ctx.globalAlpha = pulse;
        ctx.drawImage(paintedGlow, lp.x - 46, lp.y - 46, 92, 92);
      }
    }

    ctx.restore();
  }

  private drawTwilightFireflies(engine: GameEngine): void {
    const ctx = this.ctx;
    const t = engine.time > 0 ? engine.time : this.uiAnimTime;
    const warmHalo = this.getGlowSprite('firefly-warm', 64, [
      [0, 'rgba(254, 249, 195, 0.85)'],
      [0.35, 'rgba(250, 204, 21, 0.42)'],
      [1, 'rgba(245, 158, 11, 0)'],
    ]);
    const amberHalo = this.getGlowSprite('firefly-amber', 64, [
      [0, 'rgba(255, 247, 214, 0.82)'],
      [0.35, 'rgba(251, 191, 36, 0.38)'],
      [1, 'rgba(234, 88, 12, 0)'],
    ]);

    ctx.save();
    for (const f of TWILIGHT_FIREFLIES) {
      const x = f.baseX + Math.sin(t * f.speedX + f.phase) * f.ampX;
      const y = f.baseY + Math.cos(t * f.speedY + f.phase * 1.37) * f.ampY;
      const glowWave = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * f.pulseSpeed + f.phase));
      const haloR = f.radius * (4.4 + glowWave * 2.4);

      const haloSprite = f.warmth > 0.45 ? warmHalo : amberHalo;
      if (haloSprite) {
        ctx.globalAlpha = glowWave;
        ctx.drawImage(haloSprite, x - haloR, y - haloR, haloR * 2, haloR * 2);
      }

      // Bright pinprick firefly core
      ctx.globalAlpha = 0.55 + 0.45 * glowWave;
      ctx.fillStyle = '#ffffe8';
      ctx.beginPath();
      ctx.arc(x, y, f.radius * (0.65 + 0.35 * glowWave), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawMidnightFurnaceSparks(engine: GameEngine): void {
    const ctx = this.ctx;
    const t = engine.time > 0 ? engine.time : this.uiAnimTime;
    const cyanHalo = this.getGlowSprite('spark-cyan', 64, [
      [0, 'rgba(207, 250, 254, 0.84)'],
      [0.36, 'rgba(34, 211, 238, 0.42)'],
      [1, 'rgba(14, 165, 233, 0)'],
    ]);
    const amberHalo = this.getGlowSprite('spark-amber', 64, [
      [0, 'rgba(254, 249, 195, 0.86)'],
      [0.38, 'rgba(251, 146, 60, 0.44)'],
      [1, 'rgba(234, 88, 12, 0)'],
    ]);
    const violetHalo = this.getGlowSprite('spark-violet', 64, [
      [0, 'rgba(250, 232, 255, 0.78)'],
      [0.38, 'rgba(192, 132, 252, 0.38)'],
      [1, 'rgba(126, 34, 206, 0)'],
    ]);

    ctx.save();
    ctx.lineCap = 'round';
    const wrapW = LOGICAL_W + 64;
    const wrapH = LOGICAL_H - 72;

    for (const sp of FURNACE_SPARKS) {
      // Smooth continuous upward + rightward drift with gentle breeze sway
      const rawX = (sp.baseX + t * sp.driftX) % wrapW;
      const x = rawX - 32 + Math.sin(t * sp.swaySpeed + sp.phase) * sp.swayAmp;
      const rawY = (((sp.baseY - t * sp.riseSpeed) % wrapH) + wrapH) % wrapH;
      const y = 44 + rawY;

      const pulse = 0.28 + 0.72 * (0.5 + 0.5 * Math.sin(t * sp.pulseSpeed + sp.phase));
      const haloR = sp.radius * (4.2 + pulse * 2.2);

      // Subtle rising ember streak behind amber GPU sparks
      if (sp.palette === 'amber') {
        ctx.globalAlpha = 0.32 * pulse;
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = Math.max(1.1, sp.radius * 0.7);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - sp.driftX * 0.26, y + sp.riseSpeed * 0.36);
        ctx.stroke();
      }

      const haloSprite =
        sp.palette === 'cyan' ? cyanHalo : sp.palette === 'amber' ? amberHalo : violetHalo;
      if (haloSprite) {
        ctx.globalAlpha = pulse;
        ctx.drawImage(haloSprite, x - haloR, y - haloR, haloR * 2, haloR * 2);
      }

      // Bright crisp spark core
      ctx.globalAlpha =
        sp.palette === 'cyan'
          ? 0.62 + 0.38 * pulse
          : sp.palette === 'amber'
            ? 0.65 + 0.35 * pulse
            : 0.58 + 0.42 * pulse;
      ctx.fillStyle =
        sp.palette === 'cyan' ? '#e0f2fe' : sp.palette === 'amber' ? '#fef3c7' : '#f5d0fe';
      ctx.beginPath();
      ctx.arc(x, y, sp.radius * (0.62 + 0.36 * pulse), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawBrookHighlights(engine: GameEngine): void {
    const ctx = this.ctx;
    const t = engine.time;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawStreamRibbon = (pts: Vec2[], phaseShift: number) => {
      // Shimmering aqua flow line
      ctx.strokeStyle = 'rgba(224, 247, 255, 0.42)';
      ctx.lineWidth = 3.2;
      ctx.setLineDash([10, 14]);
      ctx.lineDashOffset = -t * 28 + phaseShift;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.quadraticCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
      ctx.stroke();

      // Secondary crisp sunlit highlight thread
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.58)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 19]);
      ctx.lineDashOffset = -t * 36 + phaseShift + 7;
      ctx.beginPath();
      ctx.moveTo(pts[0].x - 4, pts[0].y + 2);
      ctx.quadraticCurveTo(pts[1].x - 3, pts[1].y + 3, pts[2].x - 3, pts[2].y + 2);
      ctx.stroke();
    };

    drawStreamRibbon(BROOK_UPPER_PTS, 0);
    drawStreamRibbon(BROOK_MID_PTS, 11);
    drawStreamRibbon(BROOK_LOWER_PTS, 23);

    // Animated whitewater foam sparkles at both miniature waterfalls
    ctx.setLineDash([]);
    for (let f = 0; f < BROOK_FALLS.length; f++) {
      const wf = BROOK_FALLS[f];
      // Vertical rushing streaks
      for (let s = -1; s <= 1; s++) {
        const dropFrac = (t * 2.4 + f * 0.5 + (s + 1) * 0.31) % 1;
        const sx = wf.x + s * 5.5;
        const sy = wf.y - wf.h * 0.45 + dropFrac * wf.h * 0.7;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.65 * (1 - dropFrac * 0.5)})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 1, sy + 5);
        ctx.stroke();
      }
      // Bubbling white mist at the waterfall splash pool
      for (let b = 0; b < 4; b++) {
        const bp = (t * 2.1 + b * 0.65 + f) % 1;
        const bx = wf.x + Math.sin(b * 2.3 + t * 2) * (wf.w * 0.42);
        const by = wf.y + wf.h * 0.45 - bp * 5;
        const br = 2 + (1 - bp) * 2.4;
        ctx.fillStyle = `rgba(240, 252, 255, ${(1 - bp) * 0.72})`;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Twinkling water glints on the brook surface
    const glintCoords: Vec2[] = [
      { x: 210, y: 24 },
      { x: 174, y: 92 },
      { x: 147, y: 103 },
      { x: 96, y: 150 },
      { x: 64, y: 162 },
    ];
    for (let i = 0; i < glintCoords.length; i++) {
      const g = glintCoords[i];
      const pulse = Math.max(0, Math.sin(t * 4.2 + i * 1.9));
      if (pulse < 0.25) continue;
      const r = 2.5 + pulse * 3.5;
      this.drawFourPointStar(g.x, g.y, r, `rgba(255, 255, 255, ${pulse * 0.85})`);
    }
    ctx.restore();
  }

  private bakeStaticRoads(sctx: CanvasRenderingContext2D, stage: StageConfig): void {
    const scenery = this.getStageScenery(stage);
    const theme = getRoadTheme(stage);
    const isBridge = theme === 'bridge';
    const isFurnace = theme === 'furnace';

    const strokeStaticPaths = (
      width: number,
      color: string,
      dash?: number[],
      offsetY = 0
    ) => {
      sctx.save();
      sctx.lineCap = 'round';
      sctx.lineJoin = 'round';
      sctx.lineWidth = width;
      sctx.strokeStyle = color;
      if (dash) {
        sctx.setLineDash(dash);
      }
      if (scenery.combinedRoadPath && offsetY === 0) {
        sctx.stroke(scenery.combinedRoadPath);
      } else {
        for (const path of stage.sampledPaths) {
          sctx.beginPath();
          path.points.forEach((p, idx) => {
            if (idx === 0) sctx.moveTo(p.x, p.y + offsetY);
            else sctx.lineTo(p.x, p.y + offsetY);
          });
          sctx.stroke();
        }
      }
      sctx.restore();
    };

    const bakeTuftShadows = (fillStyle: string) => {
      sctx.save();
      sctx.fillStyle = fillStyle;
      sctx.beginPath();
      for (const g of scenery.grassTufts) {
        const sx = g.x;
        const sy = g.y + 2 * g.scale;
        const rx = 7.5 * g.scale;
        const ry = 2.8 * g.scale;
        sctx.moveTo(sx + rx, sy);
        sctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
      }
      sctx.fill();
      sctx.restore();
    };

    if (isFurnace) {
      // Stage 3 (4 AM Server Furnace): Static Dark-Obsidian Circuit-Stone Road & Beveled Slabs
      strokeStaticPaths(74, 'rgba(37, 99, 235, 0.22)', undefined, 1.5);
      strokeStaticPaths(68, 'rgba(15, 23, 42, 0.56)', undefined, 2.4);
      strokeStaticPaths(61, '#070b14', undefined, 1.4);
      strokeStaticPaths(54, '#1e293b', undefined, 0.4);
      strokeStaticPaths(49, '#0f172a', undefined, 0.2);
      strokeStaticPaths(44, '#24314a', undefined, -0.3);
      strokeStaticPaths(28, 'rgba(108, 148, 208, 0.24)', undefined, -0.7);

      // Individual beveled obsidian circuit-stone slabs (baked once!)
      sctx.save();
      for (const slab of scenery.cobbleSlabs) {
        sctx.save();
        sctx.translate(slab.x, slab.y);
        sctx.rotate(slab.rot);

        sctx.fillStyle = 'rgba(4, 8, 18, 0.68)';
        sctx.beginPath();
        sctx.roundRect(-slab.w / 2 + 0.7, -slab.h / 2 + 1.0, slab.w, slab.h, 2.5);
        sctx.fill();

        const fill =
          slab.tone < 0.3
            ? '#1b263b'
            : slab.tone < 0.65
              ? '#23314c'
              : slab.tone < 0.86
                ? '#2a3a58'
                : '#2e3d5e';
        sctx.fillStyle = fill;
        sctx.strokeStyle = 'rgba(71, 102, 148, 0.46)';
        sctx.lineWidth = 1.0;
        sctx.beginPath();
        sctx.roundRect(-slab.w / 2, -slab.h / 2, slab.w, slab.h, 2.2);
        sctx.fill();
        sctx.stroke();

        sctx.strokeStyle = 'rgba(147, 197, 253, 0.24)';
        sctx.lineWidth = 0.9;
        sctx.beginPath();
        sctx.moveTo(-slab.w / 2 + 2, -slab.h / 2 + 1.1);
        sctx.lineTo(slab.w / 2 - 2, -slab.h / 2 + 1.1);
        sctx.stroke();

        if (slab.moss) {
          const isViolet = slab.tone > 0.52;
          sctx.strokeStyle = isViolet
            ? 'rgba(192, 132, 252, 0.36)'
            : 'rgba(56, 189, 248, 0.38)';
          sctx.lineWidth = 1;
          sctx.beginPath();
          sctx.moveTo(-slab.w * 0.28, slab.h * 0.14);
          sctx.lineTo(slab.w * 0.08, slab.h * 0.14);
          sctx.lineTo(slab.w * 0.24, -slab.h * 0.12);
          sctx.stroke();

          sctx.fillStyle = isViolet
            ? 'rgba(216, 180, 254, 0.55)'
            : 'rgba(125, 211, 252, 0.58)';
          sctx.beginPath();
          sctx.arc(slab.w * 0.24, -slab.h * 0.12, 1.15, 0, Math.PI * 2);
          sctx.fill();
        }
        sctx.restore();
      }
      sctx.restore();

      // Static circuit base rails & Castle Gate octagonal obsidian server plate
      if (scenery.furnaceJunctions) {
        this.drawFurnaceServerJunctionsStatic(sctx, scenery.furnaceJunctions);
      }

      // Fine obsidian bevel flecks along road edges
      const gateMerge = scenery.furnaceJunctions?.gateMerge ?? { x: 1015, y: 348 };
      sctx.save();
      for (const pb of scenery.roadPebbles) {
        if (Math.hypot(pb.x - gateMerge.x, pb.y - gateMerge.y) < 38) continue;
        sctx.save();
        sctx.translate(pb.x, pb.y);
        sctx.rotate(pb.rot);
        sctx.fillStyle =
          pb.shade > 0.52 ? 'rgba(147, 197, 253, 0.20)' : 'rgba(7, 11, 22, 0.42)';
        sctx.beginPath();
        sctx.ellipse(0, 0, pb.rx * 0.68, pb.ry * 0.68, 0, 0, Math.PI * 2);
        sctx.fill();
        sctx.restore();
      }
      sctx.restore();

      bakeTuftShadows('rgba(6, 12, 24, 0.46)');
      this.drawFurnaceFiberPylonsStatic(sctx, scenery.lanternPosts);
      return;
    }

    if (!isBridge) {
      // Stage 1 (Meadow): Static sunlit Kingdom Rush dirt roads & deterministic pebbles
      strokeStaticPaths(68, 'rgba(34, 62, 18, 0.34)', undefined, 2);
      strokeStaticPaths(60, 'rgba(58, 39, 20, 0.72)', undefined, 1.5);
      strokeStaticPaths(54, '#9b6e3f', undefined, 0);
      strokeStaticPaths(47, '#c99e67', undefined, 0.8);
      strokeStaticPaths(42, '#ddb982', undefined, -0.5);
      strokeStaticPaths(28, '#ead09e', undefined, -1);
      strokeStaticPaths(14, 'rgba(176, 128, 72, 0.16)', [18, 16], 0);

      sctx.save();
      for (const pb of scenery.roadPebbles) {
        sctx.save();
        sctx.translate(pb.x, pb.y);
        sctx.rotate(pb.rot);
        sctx.fillStyle = 'rgba(72, 46, 22, 0.28)';
        sctx.beginPath();
        sctx.ellipse(0.8, 1.1, pb.rx, pb.ry, 0, 0, Math.PI * 2);
        sctx.fill();
        sctx.fillStyle = pb.shade > 0.55 ? 'rgba(247, 232, 198, 0.55)' : 'rgba(148, 104, 58, 0.36)';
        sctx.beginPath();
        sctx.ellipse(0, 0, pb.rx, pb.ry, 0, 0, Math.PI * 2);
        sctx.fill();
        sctx.restore();
      }
      sctx.restore();

      bakeTuftShadows('rgba(24, 52, 14, 0.36)');
      return;
    }

    // Stage 2 (EU Audit Canyon): Static weathered EU cobblestone flagstones, X-crossing granite plaza & lantern posts
    strokeStaticPaths(70, 'rgba(20, 22, 14, 0.42)', undefined, 2.6);
    strokeStaticPaths(61, '#1c222e', undefined, 1.4);
    strokeStaticPaths(54, '#4b5563', undefined, 0.4);
    strokeStaticPaths(48, '#85755a', undefined, 0.3);
    strokeStaticPaths(43, '#677283', undefined, -0.4);
    strokeStaticPaths(26, 'rgba(164, 176, 194, 0.36)', undefined, -0.8);
    strokeStaticPaths(1.8, 'rgba(204, 182, 142, 0.25)', [12, 16], 0);

    sctx.save();
    for (const slab of scenery.cobbleSlabs) {
      sctx.save();
      sctx.translate(slab.x, slab.y);
      sctx.rotate(slab.rot);

      sctx.fillStyle = 'rgba(30, 36, 48, 0.52)';
      sctx.beginPath();
      sctx.roundRect(-slab.w / 2 + 0.7, -slab.h / 2 + 1.0, slab.w, slab.h, 3);
      sctx.fill();

      const fill =
        slab.tone < 0.32
          ? '#646f80'
          : slab.tone < 0.66
            ? '#778394'
            : slab.tone < 0.86
              ? '#8994a5'
              : '#8a8275';
      sctx.fillStyle = fill;
      sctx.strokeStyle = 'rgba(188, 165, 124, 0.46)';
      sctx.lineWidth = 1.1;
      sctx.beginPath();
      sctx.roundRect(-slab.w / 2, -slab.h / 2, slab.w, slab.h, 2.8);
      sctx.fill();
      sctx.stroke();

      sctx.strokeStyle = 'rgba(235, 240, 248, 0.26)';
      sctx.lineWidth = 1;
      sctx.beginPath();
      sctx.moveTo(-slab.w / 2 + 2.2, -slab.h / 2 + 1.2);
      sctx.lineTo(slab.w / 2 - 2.2, -slab.h / 2 + 1.2);
      sctx.stroke();

      if (slab.moss) {
        sctx.fillStyle = 'rgba(116, 134, 42, 0.68)';
        sctx.beginPath();
        sctx.ellipse(-slab.w * 0.32, slab.h * 0.34, 2.6, 1.5, 0.2, 0, Math.PI * 2);
        sctx.fill();
      }
      sctx.restore();
    }
    sctx.restore();

    if (scenery.crossingCenter) {
      this.drawCrossingPlazaStatic(sctx, scenery.crossingCenter.x, scenery.crossingCenter.y);
    }

    sctx.save();
    for (const pb of scenery.roadPebbles) {
      if (
        scenery.crossingCenter &&
        Math.hypot(pb.x - scenery.crossingCenter.x, pb.y - scenery.crossingCenter.y) < 46
      ) {
        continue;
      }
      sctx.save();
      sctx.translate(pb.x, pb.y);
      sctx.rotate(pb.rot);
      sctx.fillStyle = pb.shade > 0.5 ? 'rgba(218, 224, 232, 0.32)' : 'rgba(30, 38, 52, 0.32)';
      sctx.beginPath();
      sctx.ellipse(0, 0, pb.rx * 0.72, pb.ry * 0.72, 0, 0, Math.PI * 2);
      sctx.fill();
      sctx.restore();
    }
    sctx.restore();

    bakeTuftShadows('rgba(26, 28, 12, 0.4)');
    this.drawRoadLanternPostsStatic(sctx, scenery.lanternPosts);
  }

  private drawDynamicRoadOverlays(engine: GameEngine, stage: StageConfig): void {
    const ctx = this.ctx;
    const scenery = this.getStageScenery(stage);
    const theme = getRoadTheme(stage);
    const isBridge = theme === 'bridge';
    const isFurnace = theme === 'furnace';
    const animT = engine.time > 0 ? engine.time : this.uiAnimTime;

    const strokeDynamicPaths = (
      width: number,
      color: string,
      dash: number[],
      dashOffset: number
    ) => {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.setLineDash(dash);
      ctx.lineDashOffset = dashOffset;
      if (scenery.combinedRoadPath) {
        ctx.stroke(scenery.combinedRoadPath);
      } else {
        for (const path of stage.sampledPaths) {
          ctx.beginPath();
          path.points.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    if (isFurnace) {
      // Subtle animated centerline data bus pulse
      strokeDynamicPaths(1.6, 'rgba(56, 189, 248, 0.20)', [12, 24], -animT * 20);

      // Glowing cyan & violet fiber-optic accent dashes hugging BOTH road curb edges
      this.drawFurnaceFiberEdgeTrim(scenery.fiberEdgeStrips, animT);

      // Softly pulsing server-junction chevrons & animated conduits at Central Pinch & Castle Gate Merge
      if (scenery.furnaceJunctions) {
        this.drawFurnaceServerJunctionsDynamic(scenery.furnaceJunctions, animT);
      }

      // Glowing cyan marching guide dashes during Wave 0 prep
      if (engine.waveIndex === 0) {
        strokeDynamicPaths(3, 'rgba(103, 232, 249, 0.48)', [10, 18], -animT * 36);
      }

      // Swaying midnight basalt moss & crystal-tipped fern tufts flanking obsidian curbs
      ctx.save();
      ctx.lineJoin = 'round';
      const swayBase = animT * 1.75;
      for (const g of scenery.grassTufts) {
        const sway = Math.sin(swayBase + g.phase) * 1.4;
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.scale(g.scale * g.flip, g.scale);

        ctx.strokeStyle = '#07101c';
        ctx.lineWidth = 1.3;
        ctx.fillStyle = g.tone > 0.52 ? '#163d4f' : '#133245';
        ctx.beginPath();
        ctx.moveTo(-6, 1);
        ctx.quadraticCurveTo(-8 + sway * 0.6, -5, -9 + sway, -9);
        ctx.quadraticCurveTo(-4 + sway * 0.5, -5, -2, 0);
        ctx.quadraticCurveTo(-1 + sway * 0.7, -8, 1 + sway, -11.5);
        ctx.quadraticCurveTo(3 + sway * 0.5, -6, 3, 0);
        ctx.quadraticCurveTo(6 + sway * 0.6, -6, 9 + sway * 0.8, -8);
        ctx.quadraticCurveTo(7 + sway * 0.4, -2, 5, 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = g.tone > 0.62 ? '#38bdf8' : '#2dd4bf';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(0.5 + sway * 0.6, -5.5, 1 + sway, -10);
        ctx.stroke();

        if (g.tone > 0.72) {
          ctx.fillStyle = g.tone > 0.86 ? 'rgba(192, 132, 252, 0.9)' : 'rgba(56, 189, 248, 0.92)';
          ctx.beginPath();
          ctx.arc(3 + sway * 0.5, -6.5, 1.85, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();

      // Dynamic pulsing floor glows & crystal beacon caps for Stage 3 obsidian pylons
      this.drawFurnaceFiberPylonsDynamic(scenery.lanternPosts, animT);
      return;
    }

    if (!isBridge) {
      // Stage 1 (Meadow): Wave 0 marching guide dashes + swaying road-edge grass tufts
      if (engine.waveIndex === 0) {
        strokeDynamicPaths(3, 'rgba(255, 250, 220, 0.38)', [10, 18], -engine.time * 32);
      }

      ctx.save();
      ctx.lineJoin = 'round';
      const swayBase = engine.time * 2.1;
      for (const g of scenery.grassTufts) {
        const sway = Math.sin(swayBase + g.phase) * 1.8;
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.scale(g.scale * g.flip, g.scale);

        ctx.strokeStyle = '#1e3a12';
        ctx.lineWidth = 1.3;
        ctx.fillStyle = g.tone > 0.5 ? '#356d22' : '#2f631d';
        ctx.beginPath();
        ctx.moveTo(-6, 1);
        ctx.quadraticCurveTo(-8 + sway * 0.6, -5, -9 + sway, -9);
        ctx.quadraticCurveTo(-4 + sway * 0.5, -5, -2, 0);
        ctx.quadraticCurveTo(-1 + sway * 0.7, -8, 1 + sway, -12);
        ctx.quadraticCurveTo(3 + sway * 0.5, -6, 3, 0);
        ctx.quadraticCurveTo(6 + sway * 0.6, -6, 9 + sway * 0.8, -8);
        ctx.quadraticCurveTo(7 + sway * 0.4, -2, 5, 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = g.tone > 0.5 ? '#7ac742' : '#6ab838';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(0.5 + sway * 0.6, -6, 1 + sway, -10.5);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    // Stage 2 (EU Audit Canyon): Shimmering X-crossing brass compass, Wave 0 dashes, swaying heather & flickering lantern lights
    if (scenery.crossingCenter) {
      this.drawCrossingPlazaShimmer(scenery.crossingCenter.x, scenery.crossingCenter.y, animT);
    }

    if (engine.waveIndex === 0) {
      strokeDynamicPaths(3, 'rgba(254, 240, 138, 0.44)', [10, 18], -animT * 32);
    }

    ctx.save();
    ctx.lineJoin = 'round';
    const swayBase = animT * 1.9;
    for (const g of scenery.grassTufts) {
      const sway = Math.sin(swayBase + g.phase) * 1.6;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.scale(g.scale * g.flip, g.scale);

      ctx.strokeStyle = '#211d11';
      ctx.lineWidth = 1.3;
      ctx.fillStyle = g.tone > 0.55 ? '#555d1c' : '#4a5219';
      ctx.beginPath();
      ctx.moveTo(-6, 1);
      ctx.quadraticCurveTo(-8 + sway * 0.6, -5, -9 + sway, -9);
      ctx.quadraticCurveTo(-4 + sway * 0.5, -5, -2, 0);
      ctx.quadraticCurveTo(-1 + sway * 0.7, -8, 1 + sway, -11.5);
      ctx.quadraticCurveTo(3 + sway * 0.5, -6, 3, 0);
      ctx.quadraticCurveTo(6 + sway * 0.6, -6, 9 + sway * 0.8, -8);
      ctx.quadraticCurveTo(7 + sway * 0.4, -2, 5, 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = g.tone > 0.65 ? '#c79b32' : '#969c34';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(0.5 + sway * 0.6, -5.5, 1 + sway, -10);
      ctx.stroke();

      if (g.tone > 0.76) {
        ctx.fillStyle = g.tone > 0.88 ? '#c084fc' : '#fbbf24';
        ctx.beginPath();
        ctx.arc(3 + sway * 0.5, -6.5, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();

    this.drawRoadLanternPostsDynamic(scenery.lanternPosts, animT);
  }

  private drawCrossingPlazaStatic(sctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    sctx.save();
    sctx.translate(cx, cy);

    // Subtle ground occlusion + bold dark-slate stone rim
    sctx.fillStyle = 'rgba(20, 22, 16, 0.35)';
    sctx.beginPath();
    sctx.arc(0, 3, 52, 0, Math.PI * 2);
    sctx.fill();

    sctx.fillStyle = '#1c222e';
    sctx.beginPath();
    sctx.arc(0, 1, 49, 0, Math.PI * 2);
    sctx.fill();

    // Outer carved stone curb ring
    sctx.fillStyle = '#535e6f';
    sctx.beginPath();
    sctx.arc(0, 0, 45.5, 0, Math.PI * 2);
    sctx.fill();

    // Warm mortar groove ring
    sctx.strokeStyle = '#927f60';
    sctx.lineWidth = 2.6;
    sctx.beginPath();
    sctx.arc(0, 0, 41.5, 0, Math.PI * 2);
    sctx.stroke();

    // Inner circular weathered granite plaza slab
    const slabGrad = sctx.createRadialGradient(-8, -10, 4, 0, 0, 41);
    slabGrad.addColorStop(0, '#909bad');
    slabGrad.addColorStop(0.55, '#748091');
    slabGrad.addColorStop(1, '#5d6778');
    sctx.fillStyle = slabGrad;
    sctx.beginPath();
    sctx.arc(0, 0, 40.5, 0, Math.PI * 2);
    sctx.fill();

    // 8 radial European plaza wedge stone joints
    sctx.strokeStyle = 'rgba(30, 36, 48, 0.42)';
    sctx.lineWidth = 1.4;
    sctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      sctx.moveTo(Math.cos(a) * 28, Math.sin(a) * 28);
      sctx.lineTo(Math.cos(a) * 40.5, Math.sin(a) * 40.5);
    }
    sctx.stroke();

    sctx.strokeStyle = 'rgba(30, 36, 48, 0.45)';
    sctx.lineWidth = 1.2;
    sctx.beginPath();
    sctx.arc(0, 0, 20, 0, Math.PI * 2);
    sctx.stroke();

    sctx.restore();
  }

  private drawCrossingPlazaShimmer(cx: number, cy: number, t: number): void {
    const ctx = this.ctx;
    const shimmer = 0.65 + 0.35 * Math.sin(t * 2.3);
    ctx.save();
    ctx.translate(cx, cy);

    // Subtle inlaid weathered brass EU Audit compass circle
    ctx.strokeStyle = `rgba(217, 169, 68, ${0.46 + 0.14 * shimmer})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 29, 0, Math.PI * 2);
    ctx.stroke();

    // 12 miniature inlaid brass stars batched into one path
    ctx.fillStyle = `rgba(250, 204, 21, ${0.42 + 0.2 * shimmer})`;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const sx = Math.cos(a) * 24.5;
      const sy = Math.sin(a) * 24.5;
      ctx.moveTo(sx + 1.85, sy);
      ctx.arc(sx, sy, 1.85, 0, Math.PI * 2);
    }
    ctx.fill();

    // Inlaid 4-point brass compass rose at dead center of X-crossing
    ctx.fillStyle = `rgba(217, 169, 68, ${0.42 + 0.14 * shimmer})`;
    ctx.strokeStyle = 'rgba(30, 36, 48, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 16 : 5.5;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center inlaid medallion rivet
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(0, 0, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private drawRoadLanternPostsStatic(sctx: CanvasRenderingContext2D, posts: RoadLanternPost[]): void {
    sctx.save();
    for (const post of posts) {
      const armDir = post.side > 0 ? -1 : 1;
      sctx.save();
      sctx.translate(post.x, post.y);

      // Base shadow & carved dark stone plinth
      sctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
      sctx.beginPath();
      sctx.ellipse(0, 3, 8.5, 3.8, 0, 0, Math.PI * 2);
      sctx.fill();

      sctx.fillStyle = '#475569';
      sctx.strokeStyle = '#141923';
      sctx.lineWidth = 1.6;
      sctx.beginPath();
      sctx.roundRect(-5, -3, 10, 6, 2);
      sctx.fill();
      sctx.stroke();

      // Slim wrought-iron lantern stem & curved bracket
      sctx.strokeStyle = '#1c222e';
      sctx.lineWidth = 3.2;
      sctx.lineCap = 'round';
      sctx.beginPath();
      sctx.moveTo(0, -2);
      sctx.lineTo(0, -22);
      sctx.quadraticCurveTo(0, -26, armDir * 8, -24);
      sctx.stroke();

      sctx.strokeStyle = '#64748b';
      sctx.lineWidth = 1.1;
      sctx.beginPath();
      sctx.moveTo(-0.5, -3);
      sctx.lineTo(-0.5, -21);
      sctx.stroke();

      sctx.restore();
    }
    sctx.restore();
  }

  private drawRoadLanternPostsDynamic(posts: RoadLanternPost[], t: number): void {
    const ctx = this.ctx;
    const poolSprite = this.getGlowSprite(
      'lantern-pool',
      64,
      [
        [0, 'rgba(251, 191, 36, 0.24)'],
        [0.55, 'rgba(245, 158, 11, 0.1)'],
        [1, 'rgba(245, 158, 11, 0)'],
      ],
      0.07
    );
    const haloSprite = this.getGlowSprite(
      'lantern-halo',
      64,
      [
        [0, 'rgba(254, 249, 195, 0.72)'],
        [0.45, 'rgba(251, 191, 36, 0.34)'],
        [1, 'rgba(245, 158, 11, 0)'],
      ],
      0.05
    );

    ctx.save();
    for (const post of posts) {
      const flicker = 0.8 + 0.2 * Math.sin(t * 4.1 + post.phase);
      const armDir = post.side > 0 ? -1 : 1;
      const lx = post.x + armDir * 8;
      const ly = post.y - 18;

      if (poolSprite) {
        ctx.globalAlpha = flicker;
        ctx.drawImage(poolSprite, post.x + armDir * 6 - 44, post.y - 30, 88, 60);
      }
      if (haloSprite) {
        ctx.globalAlpha = flicker;
        ctx.drawImage(haloSprite, lx - 20, ly - 20, 40, 40);
      }

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#1c222e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(lx - 3.2, ly - 4, 6.4, 7.5, 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1c222e';
      ctx.beginPath();
      ctx.moveTo(lx - 4.5, ly - 3.8);
      ctx.lineTo(lx, ly - 7);
      ctx.lineTo(lx + 4.5, ly - 3.8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawFurnaceFiberEdgeTrim(strips: FiberEdgeStrip[], t: number): void {
    const ctx = this.ctx;
    const pulse = 0.72 + 0.28 * Math.sin(t * 3.1);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const strokeStrip = (strip: FiberEdgeStrip) => {
      if (strip.path2d) {
        ctx.stroke(strip.path2d);
        return;
      }
      ctx.beginPath();
      strip.points.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    };

    for (const strip of strips) {
      const primaryCyan = strip.laneIdx === 0;

      // Soft outer fiber halo along curb channel
      ctx.lineWidth = 4.4;
      ctx.strokeStyle = primaryCyan
        ? `rgba(34, 211, 238, ${0.14 * pulse})`
        : `rgba(168, 85, 247, ${0.15 * pulse})`;
      ctx.setLineDash([16, 22]);
      ctx.lineDashOffset = -t * 28 + strip.side * 6;
      strokeStrip(strip);

      // Crisp primary cyan / violet fiber dashes flowing toward the castle
      ctx.lineWidth = 1.9;
      ctx.strokeStyle = primaryCyan
        ? `rgba(56, 189, 248, ${0.58 * pulse})`
        : `rgba(192, 132, 252, ${0.54 * pulse})`;
      ctx.setLineDash([12, 26]);
      ctx.lineDashOffset = -t * 28 + strip.side * 6;
      strokeStrip(strip);

      // Interleaved secondary complementary accent dashes (violet on North lane, cyan on South lane)
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = primaryCyan
        ? `rgba(192, 132, 252, ${0.46 * pulse})`
        : `rgba(56, 189, 248, ${0.50 * pulse})`;
      ctx.setLineDash([7, 31]);
      ctx.lineDashOffset = -t * 28 + 19 + strip.side * 6;
      strokeStrip(strip);
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  private drawServerChevron(
    x: number,
    y: number,
    ang: number,
    size: number,
    color: string,
    glowColor: string,
    alpha: number
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer neon bloom stroke
    ctx.globalAlpha = alpha * 0.45;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(-size * 0.62, -size);
    ctx.lineTo(size * 0.42, 0);
    ctx.lineTo(-size * 0.62, size);
    ctx.stroke();

    // Crisp bright chevron core
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.moveTo(-size * 0.62, -size);
    ctx.lineTo(size * 0.42, 0);
    ctx.lineTo(-size * 0.62, size);
    ctx.stroke();

    ctx.restore();
  }

  private drawFurnaceServerJunctionsStatic(
    sctx: CanvasRenderingContext2D,
    junc: FurnaceJunctions
  ): void {
    // 1. Static dark conduit channel linking North & South pinch apexes
    sctx.save();
    sctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    sctx.lineWidth = 10;
    sctx.lineCap = 'round';
    sctx.beginPath();
    sctx.moveTo(junc.pinchNorth.x, junc.pinchNorth.y);
    sctx.lineTo(junc.pinchSouth.x, junc.pinchSouth.y);
    sctx.stroke();
    sctx.restore();

    // 2. Static Castle Gate Merge octagonal dark-obsidian server plate + 8 radial etched bus traces
    sctx.save();
    const gm = junc.gateMerge;
    sctx.translate(gm.x, gm.y);

    const mergeGlow = sctx.createRadialGradient(0, 0, 10, 0, 0, 50);
    mergeGlow.addColorStop(0, 'rgba(56, 189, 248, 0.21)');
    mergeGlow.addColorStop(0.55, 'rgba(139, 92, 246, 0.13)');
    mergeGlow.addColorStop(1, 'rgba(30, 58, 138, 0)');
    sctx.fillStyle = mergeGlow;
    sctx.beginPath();
    sctx.arc(0, 0, 50, 0, Math.PI * 2);
    sctx.fill();

    const drawOctagon = (r: number) => {
      sctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const ox = Math.cos(a) * r;
        const oy = Math.sin(a) * r;
        if (i === 0) sctx.moveTo(ox, oy);
        else sctx.lineTo(ox, oy);
      }
      sctx.closePath();
    };

    sctx.fillStyle = '#070b14';
    drawOctagon(35);
    sctx.fill();

    const plateGrad = sctx.createRadialGradient(-6, -6, 3, 0, 0, 32);
    plateGrad.addColorStop(0, '#2a3b5c');
    plateGrad.addColorStop(0.6, '#1c2842');
    plateGrad.addColorStop(1, '#121b2e');
    sctx.fillStyle = plateGrad;
    drawOctagon(31.5);
    sctx.fill();

    // 8 radial etched server-bus traces around hub rim
    sctx.strokeStyle = 'rgba(125, 211, 252, 0.34)';
    sctx.lineWidth = 1.2;
    sctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      sctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 22);
      sctx.lineTo(Math.cos(a) * 29.5, Math.sin(a) * 29.5);
    }
    sctx.stroke();

    sctx.restore();
  }

  private drawFurnaceServerJunctionsDynamic(junc: FurnaceJunctions, t: number): void {
    const ctx = this.ctx;
    const breath = 0.68 + 0.32 * Math.sin(t * 2.6);

    // 1. CENTRAL PINCH JUNCTION — Animated conduit dashes, breathing hub halo & pulsing chevrons
    ctx.save();
    const pc = junc.pinchCenter;

    const conduitGrad = ctx.createLinearGradient(
      junc.pinchNorth.x,
      junc.pinchNorth.y,
      junc.pinchSouth.x,
      junc.pinchSouth.y
    );
    conduitGrad.addColorStop(0, `rgba(56, 189, 248, ${0.42 * breath})`);
    conduitGrad.addColorStop(0.5, `rgba(168, 85, 247, ${0.36 * breath})`);
    conduitGrad.addColorStop(1, `rgba(192, 132, 252, ${0.42 * breath})`);

    ctx.strokeStyle = conduitGrad;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.setLineDash([7, 7]);
    ctx.lineDashOffset = -t * 16;
    ctx.beginPath();
    ctx.moveTo(junc.pinchNorth.x, junc.pinchNorth.y);
    ctx.lineTo(junc.pinchSouth.x, junc.pinchSouth.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const hubHaloSprite = this.getGlowSprite(
      'furnace-hub-halo',
      64,
      [
        [0, 'rgba(56, 189, 248, 0.14)'],
        [0.55, 'rgba(139, 92, 246, 0.12)'],
        [1, 'rgba(30, 58, 138, 0)'],
      ],
      0.3
    );
    if (hubHaloSprite) {
      ctx.globalAlpha = breath;
      ctx.drawImage(hubHaloSprite, pc.x - 58, pc.y - 42, 116, 84);
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = `rgba(56, 189, 248, ${0.34 * breath})`;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = t * 14;
    ctx.beginPath();
    ctx.ellipse(pc.x, pc.y, 42, 26, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Compact obsidian relay node medallion at central pinch midpoint
    ctx.fillStyle = 'rgba(11, 18, 34, 0.78)';
    ctx.strokeStyle = `rgba(192, 132, 252, ${0.46 * breath})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(pc.x, pc.y, 17, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = `rgba(103, 232, 249, ${0.65 * breath})`;
    ctx.beginPath();
    ctx.moveTo(pc.x, pc.y - 5.5);
    ctx.lineTo(pc.x + 7, pc.y);
    ctx.lineTo(pc.x, pc.y + 5.5);
    ctx.lineTo(pc.x - 7, pc.y);
    ctx.closePath();
    ctx.fill();

    // Softly pulsing server-junction chevrons inlaid along BOTH pinched road curves
    const drawPinchChevrons = (anchor: FurnacePinchAnchor, isNorth: boolean) => {
      const cosA = Math.cos(anchor.ang);
      const sinA = Math.sin(anchor.ang);
      for (let i = -1; i <= 1; i++) {
        const wave = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 4.2 - i * 1.15));
        const cx = anchor.x + cosA * (i * 15);
        const cy = anchor.y + sinA * (i * 15);
        this.drawServerChevron(
          cx,
          cy,
          anchor.ang,
          7.6,
          isNorth ? '#7dd3fc' : '#e879f9',
          isNorth ? '#06b6d4' : '#9333ea',
          0.32 + 0.56 * wave
        );
      }
    };
    drawPinchChevrons(junc.pinchNorth, true);
    drawPinchChevrons(junc.pinchSouth, false);
    ctx.restore();

    // 2. CASTLE GATE MERGE JUNCTION — Pulsing cyan/violet rings + sequential flow chevrons
    ctx.save();
    const gm = junc.gateMerge;
    ctx.translate(gm.x, gm.y);

    ctx.strokeStyle = `rgba(56, 189, 248, ${0.52 + 0.22 * breath})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const ox = Math.cos(a) * 31.5;
      const oy = Math.sin(a) * 31.5;
      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = `rgba(192, 132, 252, ${0.46 + 0.2 * breath})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 21.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Upstream converging approach chevrons on North & South feeder arms into Gate Merge
    const leadPulseA = 0.4 + 0.5 * (0.5 + 0.5 * Math.sin(t * 4.4));
    const leadPulseB = 0.4 + 0.5 * (0.5 + 0.5 * Math.sin(t * 4.4 - 0.9));
    this.drawServerChevron(
      junc.mergeNorthLead.x,
      junc.mergeNorthLead.y,
      junc.mergeNorthLead.ang,
      7.2,
      '#7dd3fc',
      '#06b6d4',
      leadPulseA
    );
    this.drawServerChevron(
      junc.mergeSouthLead.x,
      junc.mergeSouthLead.y,
      junc.mergeSouthLead.ang,
      7.2,
      '#e879f9',
      '#9333ea',
      leadPulseB
    );

    // 3 sequentially pulsing eastward chevrons streaming through Castle Gate Merge toward Fortress
    for (let i = 0; i < 3; i++) {
      const wave = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 4.8 - i * 1.15));
      const cx = gm.x - 10 + i * 21;
      const cy = gm.y;
      this.drawServerChevron(
        cx,
        cy,
        0,
        8.4,
        i === 1 ? '#e0f2fe' : i === 0 ? '#38bdf8' : '#c084fc',
        i === 2 ? '#a855f7' : '#06b6d4',
        0.34 + 0.58 * wave
      );
    }
  }

  private drawFurnaceFiberPylonsStatic(
    sctx: CanvasRenderingContext2D,
    posts: RoadLanternPost[]
  ): void {
    sctx.save();
    for (let idx = 0; idx < posts.length; idx++) {
      const post = posts[idx];
      const isCyan = idx % 2 === 0;
      sctx.save();
      sctx.translate(post.x, post.y);

      sctx.fillStyle = 'rgba(4, 8, 18, 0.58)';
      sctx.beginPath();
      sctx.ellipse(0, 3, 8.5, 3.8, 0, 0, Math.PI * 2);
      sctx.fill();

      sctx.fillStyle = '#1e293b';
      sctx.strokeStyle = '#070b14';
      sctx.lineWidth = 1.6;
      sctx.beginPath();
      sctx.roundRect(-5.5, -4, 11, 7, 2);
      sctx.fill();
      sctx.stroke();

      sctx.fillStyle = '#0f172a';
      sctx.strokeStyle = '#334155';
      sctx.lineWidth = 1.2;
      sctx.beginPath();
      sctx.roundRect(-3.4, -22, 6.8, 19, 2);
      sctx.fill();
      sctx.stroke();

      sctx.fillStyle = isCyan ? '#67e8f9' : '#e879f9';
      sctx.fillRect(-1.1, -18, 2.2, 11);

      sctx.restore();
    }
    sctx.restore();
  }

  private drawFurnaceFiberPylonsDynamic(posts: RoadLanternPost[], t: number): void {
    const ctx = this.ctx;
    const poolCyan = this.getGlowSprite(
      'pylon-pool-cyan',
      64,
      [
        [0, 'rgba(56, 189, 248, 0.22)'],
        [0.55, 'rgba(37, 99, 235, 0.10)'],
        [1, 'rgba(30, 58, 138, 0)'],
      ],
      0.07
    );
    const poolViolet = this.getGlowSprite(
      'pylon-pool-violet',
      64,
      [
        [0, 'rgba(192, 132, 252, 0.22)'],
        [0.55, 'rgba(126, 34, 206, 0.10)'],
        [1, 'rgba(76, 29, 149, 0)'],
      ],
      0.07
    );
    const capCyan = this.getGlowSprite(
      'pylon-cap-cyan',
      64,
      [
        [0, 'rgba(165, 243, 252, 0.72)'],
        [0.5, 'rgba(34, 211, 238, 0.30)'],
        [1, 'rgba(15, 23, 42, 0)'],
      ],
      0.06
    );
    const capViolet = this.getGlowSprite(
      'pylon-cap-violet',
      64,
      [
        [0, 'rgba(245, 208, 254, 0.72)'],
        [0.5, 'rgba(192, 132, 252, 0.30)'],
        [1, 'rgba(15, 23, 42, 0)'],
      ],
      0.06
    );

    ctx.save();
    for (let idx = 0; idx < posts.length; idx++) {
      const post = posts[idx];
      const isCyan = idx % 2 === 0;
      const pulse = 0.76 + 0.24 * Math.sin(t * 3.6 + post.phase);
      const px = post.x;
      const py = post.y;

      const poolSprite = isCyan ? poolCyan : poolViolet;
      if (poolSprite) {
        ctx.globalAlpha = pulse;
        ctx.drawImage(poolSprite, px - 42, py - 26, 84, 52);
      }

      const capSprite = isCyan ? capCyan : capViolet;
      if (capSprite) {
        ctx.globalAlpha = pulse;
        ctx.drawImage(capSprite, px - 16, py - 22 - 16, 32, 32);
      }

      ctx.globalAlpha = 1;
      ctx.fillStyle = isCyan ? '#cffafe' : '#fae8ff';
      ctx.strokeStyle = '#070b14';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(px, py - 27);
      ctx.lineTo(px + 4, py - 22);
      ctx.lineTo(px, py - 18);
      ctx.lineTo(px - 4, py - 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawEntrySignposts(engine: GameEngine): void {
    const ctx = this.ctx;
    const stage = engine.getStage();
    const theme = getRoadTheme(stage);
    const isBridge = theme === 'bridge';
    const isFurnace = theme === 'furnace';
    const animT = engine.time > 0 ? engine.time : this.uiAnimTime;

    // Crisp entry gate stone/wood/obsidian-portal bollards flanking the left road entrances
    const drawGateMarkers = (y: number, active: boolean, vipOnLane: boolean, laneIdx: number) => {
      ctx.save();
      if (isFurnace) {
        const isCyan = laneIdx === 0;
        const pulse = 0.72 + 0.28 * Math.sin(animT * 4.0 + laneIdx * 1.9);

        // Subtle cyan/violet server-portal floor glow beacon at both Wave-1 active entrances
        if (active) {
          const portalGlow = ctx.createRadialGradient(16, y, 4, 24, y, 58);
          if (isCyan) {
            portalGlow.addColorStop(0, `rgba(34, 211, 238, ${0.34 * pulse})`);
            portalGlow.addColorStop(0.5, `rgba(56, 189, 248, ${0.15 * pulse})`);
            portalGlow.addColorStop(1, 'rgba(14, 165, 233, 0)');
          } else {
            portalGlow.addColorStop(0, `rgba(192, 132, 252, ${0.34 * pulse})`);
            portalGlow.addColorStop(0.5, `rgba(168, 85, 247, ${0.15 * pulse})`);
            portalGlow.addColorStop(1, 'rgba(126, 34, 206, 0)');
          }
          ctx.fillStyle = portalGlow;
          ctx.beginPath();
          ctx.ellipse(22, y, 56, 40, 0, 0, Math.PI * 2);
          ctx.fill();

          // Subtle glowing vertical threshold scan bar across road mouth
          ctx.strokeStyle = isCyan
            ? `rgba(103, 232, 249, ${0.46 * pulse})`
            : `rgba(232, 121, 249, ${0.46 * pulse})`;
          ctx.lineWidth = 2.2;
          ctx.setLineDash([5, 5]);
          ctx.lineDashOffset = -animT * 18;
          ctx.beginPath();
          ctx.moveTo(14, y - 24);
          ctx.lineTo(14, y + 24);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        for (const dy of [-32, 32]) {
          const bx = 14;
          const by = y + dy;
          ctx.fillStyle = 'rgba(4, 8, 18, 0.56)';
          ctx.beginPath();
          ctx.ellipse(bx, by + 5, 11, 4.8, 0, 0, Math.PI * 2);
          ctx.fill();

          if (active) {
            const halo = ctx.createRadialGradient(bx, by - 14, 2, bx, by - 14, 26);
            if (isCyan) {
              halo.addColorStop(0, `rgba(165, 243, 252, ${0.58 * pulse})`);
              halo.addColorStop(0.5, `rgba(34, 211, 238, ${0.24 * pulse})`);
              halo.addColorStop(1, 'rgba(14, 165, 233, 0)');
            } else {
              halo.addColorStop(0, `rgba(245, 208, 254, ${0.58 * pulse})`);
              halo.addColorStop(0.5, `rgba(192, 132, 252, ${0.24 * pulse})`);
              halo.addColorStop(1, 'rgba(126, 34, 206, 0)');
            }
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(bx, by - 14, 26, 0, Math.PI * 2);
            ctx.fill();
          }

          // Dark-obsidian server portal pylon with neon channel
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#070b14';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(bx - 7.5, by - 15, 15, 19, 3);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isCyan ? '#22d3ee' : '#c084fc';
          ctx.fillRect(bx - 1.5, by - 11, 3, 11);

          // Glowing portal beacon diamond cap (turns radiant gold when VIP enters lane!)
          ctx.fillStyle = vipOnLane ? '#fde047' : isCyan ? '#67e8f9' : '#e879f9';
          ctx.strokeStyle = '#070b14';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(bx, by - (vipOnLane ? 22 : 20));
          ctx.lineTo(bx + (vipOnLane ? 6 : 5), by - 14.5);
          ctx.lineTo(bx, by - 9.5);
          ctx.lineTo(bx - (vipOnLane ? 6 : 5), by - 14.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else {
        for (const dy of [-32, 32]) {
          const bx = 14;
          const by = y + dy;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
          ctx.beginPath();
          ctx.ellipse(bx, by + 5, 10, 4.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Warm twilight lantern halo on Stage 2 canyon gate bollards
          if (isBridge && active) {
            const lp = 0.75 + 0.25 * Math.sin(animT * 4.2 + dy);
            const halo = ctx.createRadialGradient(bx, by - 14, 2, bx, by - 14, 24);
            halo.addColorStop(0, `rgba(254, 240, 138, ${0.46 * lp})`);
            halo.addColorStop(1, 'rgba(245, 158, 11, 0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(bx, by - 14, 24, 0, Math.PI * 2);
            ctx.fill();
          }

          // Carved medieval gate pillar
          ctx.fillStyle = active ? (isBridge ? '#6b7280' : '#78716c') : '#64748b';
          ctx.strokeStyle = '#1c1917';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(bx - 7, by - 14, 14, 18, 3);
          ctx.fill();
          ctx.stroke();

          // Glowing golden lantern cap (extra radiant when VIP is on lane!)
          const capGlow = vipOnLane ? '#fde047' : active ? '#fbbf24' : '#94a3b8';
          ctx.fillStyle = capGlow;
          ctx.beginPath();
          ctx.arc(bx, by - 14, vipOnLane ? 5.5 : 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // Soft golden runway shimmer at the gate when a VIP is active on this lane
      if (vipOnLane) {
        const pulse = 0.55 + 0.45 * Math.sin(engine.time * 6.5);
        const glow = ctx.createRadialGradient(22, y, 4, 34, y, 52);
        glow.addColorStop(0, `rgba(254, 240, 138, ${0.46 * pulse})`);
        glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(28, y, 52, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawSign = (x: number, y: number, label: string, active: boolean, laneIdx: number) => {
      ctx.save();
      ctx.translate(x, y);

      if (isFurnace) {
        const isCyan = laneIdx === 0;
        const pulse = 0.78 + 0.22 * Math.sin(animT * 3.8 + laneIdx * 1.7);

        // Ground shadow
        ctx.fillStyle = 'rgba(4, 8, 18, 0.58)';
        ctx.beginPath();
        ctx.ellipse(2, 26, 14, 4.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Subtle ambient neon halo behind midnight server signpost
        const glow = ctx.createRadialGradient(2, -7, 8, 2, -7, 62);
        glow.addColorStop(
          0,
          isCyan ? `rgba(34, 211, 238, ${0.26 * pulse})` : `rgba(192, 132, 252, ${0.26 * pulse})`
        );
        glow.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(2, -7, 62, 24, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dark-obsidian steel post with glowing fiber spine
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#070b14';
        ctx.lineWidth = 2;
        ctx.fillRect(-4, -1, 8, 27);
        ctx.strokeRect(-4, -1, 8, 27);
        ctx.fillStyle = isCyan ? 'rgba(56, 189, 248, 0.75)' : 'rgba(192, 132, 252, 0.75)';
        ctx.fillRect(-1, 4, 2, 18);

        // Sleek midnight-styled beveled arrow signboard (auto-sized for all 18 languages)
        const signFont = '800 11px system-ui, -apple-system, sans-serif';
        ctx.font = signFont;
        const textW = ctx.measureText(label).width;
        const leftX = -48;
        const rightX = Math.max(44, Math.min(96, Math.ceil(leftX + 16 + textW + 12)));
        const tipX = rightX + 11;
        const plaqueGrad = ctx.createLinearGradient(0, -21, 0, 6);
        plaqueGrad.addColorStop(0, '#172540');
        plaqueGrad.addColorStop(1, '#0b1222');
        ctx.fillStyle = plaqueGrad;
        ctx.strokeStyle = active ? (isCyan ? '#22d3ee' : '#c084fc') : '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(leftX, -20);
        ctx.lineTo(rightX, -20);
        ctx.lineTo(tipX, -7.5);
        ctx.lineTo(rightX, 5);
        ctx.lineTo(leftX, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Crisp inner hairline bevel
        ctx.strokeStyle = isCyan
          ? 'rgba(165, 243, 252, 0.28)'
          : 'rgba(245, 208, 254, 0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftX + 3, -17.5);
        ctx.lineTo(rightX - 2, -17.5);
        ctx.lineTo(tipX - 4, -7.5);
        ctx.lineTo(rightX - 2, 2.5);
        ctx.lineTo(leftX + 3, 2.5);
        ctx.closePath();
        ctx.stroke();

        // Live pulsing server beacon LED dot on left side of sign
        ctx.fillStyle = isCyan ? '#67e8f9' : '#f0abfc';
        ctx.beginPath();
        ctx.arc(leftX + 7, -7.5, 2.4, 0, Math.PI * 2);
        ctx.fill();

        const textLeft = leftX + 14;
        const maxTextW = Math.max(60, rightX - textLeft - 2);
        const textCx = (textLeft + rightX) / 2;
        ctx.fillStyle = active ? (isCyan ? '#e0f2fe' : '#f5d0fe') : '#94a3b8';
        ctx.font = signFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, textCx, -7.5, maxTextW);
        ctx.restore();
        return;
      }

      // Post shadow
      ctx.fillStyle = 'rgba(20, 34, 12, 0.38)';
      ctx.beginPath();
      ctx.ellipse(2, 26, 12, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wooden post
      ctx.fillStyle = isBridge ? '#573b24' : '#6d4726';
      ctx.strokeStyle = '#26170b';
      ctx.lineWidth = 2;
      ctx.fillRect(-4, -2, 8, 28);
      ctx.strokeRect(-4, -2, 8, 28);

      // Arrow-tipped wooden signboard (auto-sized for all 18 languages)
      const signFont = '800 11px system-ui, -apple-system, sans-serif';
      ctx.font = signFont;
      const textW = ctx.measureText(label).width;
      const leftX = -43;
      const rightX = Math.max(36, Math.min(88, Math.ceil(leftX + 14 + textW + 10)));
      const tipX = rightX + 10;
      ctx.fillStyle = active ? (isBridge ? '#fde68a' : '#fef3c7') : '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(leftX, -19);
      ctx.lineTo(rightX, -19);
      ctx.lineTo(tipX, -7.5);
      ctx.lineTo(rightX, 4);
      ctx.lineTo(leftX, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Nail rivets
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(leftX + 7, -7.5, 1.8, 0, Math.PI * 2);
      ctx.fill();

      const textLeft = leftX + 12;
      const maxTextW = Math.max(58, rightX - textLeft - 2);
      const textCx = (textLeft + rightX) / 2;
      ctx.fillStyle = active ? '#1e293b' : '#475569';
      ctx.font = signFont;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, textCx, -7.5, maxTextW);
      ctx.restore();
    };

    for (let laneIdx = 0; laneIdx < stage.entryMarkers.length; laneIdx++) {
      const marker = stage.entryMarkers[laneIdx];
      const badge = stage.entryBadges[laneIdx];
      const gateY = stage.sampledPaths[laneIdx]?.points[0]?.y ?? badge.y;
      const unlocked = marker.unlockWave <= 1 || engine.waveIndex >= marker.unlockWave;
      const vipOnLane = engine.vips.some((v) => !v.fleeing && v.lane === laneIdx);

      drawGateMarkers(gateY, unlocked, vipOnLane, laneIdx);

      const label = unlocked
        ? translate(engine.lang, `stage.${stage.id}.entry${laneIdx}`)
        : translate(engine.lang, 'stage.unlockWave', { n: marker.unlockWave });
      drawSign(marker.x, marker.y, label, unlocked, laneIdx);

      // Bouncing golden "VIP" preview glow banner when a VIP is on this lane
      if (vipOnLane) {
        if (stage.id === 'meadow') {
          this.drawVipLanePreviewGlow(engine, laneIdx === 0 ? 108 : 168, laneIdx === 0 ? 264 : 438);
        } else {
          const vx = Math.min(LOGICAL_W - 76, badge.x + 56);
          const vy = Math.max(
            92,
            Math.min(LOGICAL_H - 104, badge.y + (laneIdx === 0 ? 54 : 48))
          );
          this.drawVipLanePreviewGlow(engine, vx, vy);
        }
      }
    }
  }

  private drawVipLanePreviewGlow(engine: GameEngine, x: number, y: number): void {
    const ctx = this.ctx;
    const bob = Math.sin(engine.time * 6.2) * 4.5;
    const pulse = 0.5 + 0.5 * Math.sin(engine.time * 7.5);

    ctx.save();
    ctx.translate(x, y + bob);

    // Warm radiant golden preview glow behind pill
    const halo = ctx.createRadialGradient(0, 0, 6, 0, 0, 44);
    halo.addColorStop(0, `rgba(254, 240, 138, ${0.52 + pulse * 0.25})`);
    halo.addColorStop(0.55, `rgba(250, 204, 21, ${0.22 + pulse * 0.14})`);
    halo.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.fill();

    // Rich golden plaque (auto-sized for all 18 languages)
    const vipText = translate(engine.lang, 'canvas.vip');
    const vipFont = '900 12px system-ui, -apple-system, sans-serif';
    const vipIconSize = 13.5;
    const vipGap = 5;
    ctx.font = vipFont;
    const plaqueW = Math.max(
      76,
      Math.min(132, Math.ceil(ctx.measureText(vipText).width + vipIconSize + vipGap) + 28)
    );
    const halfW = plaqueW / 2;

    const grad = ctx.createLinearGradient(0, -13, 0, 13);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.5, '#f59e0b');
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.roundRect(-halfW, -13, plaqueW, 26, 13);
    ctx.fill();
    ctx.stroke();

    // Inner bright gold rim
    ctx.strokeStyle = '#fef9c3';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-halfW + 2.5, -10.5, plaqueW - 5, 21, 10.5);
    ctx.stroke();

    this.drawCenteredIconLabel('briefcase', vipText, 0, 0, {
      iconSize: vipIconSize,
      iconColor: '#451a03',
      textColor: '#451a03',
      font: vipFont,
      gap: vipGap,
      strokeWidth: 2.3,
      maxTextWidth: plaqueW - vipIconSize - vipGap - 18,
    });

    // Orbiting mini sparkle glints
    this.drawFourPointStar(-halfW + 2, -10 + Math.sin(engine.time * 8) * 2, 5.5, '#ffffff');
    this.drawFourPointStar(halfW - 2, 8 + Math.cos(engine.time * 8) * 2, 4.5, '#fef08a');
    ctx.restore();
  }

  private drawGroundEffects(engine: GameEngine): void {
    const ctx = this.ctx;

    // Permanent ARCHIVED scorch craters from 4 AM Delete (with impact crack lines!)
    for (const c of engine.scorchCraters) {
      ctx.save();
      ctx.translate(c.x, c.y);

      const g = ctx.createRadialGradient(0, 0, 6, 0, 0, c.radius * 1.1);
      g.addColorStop(0, 'rgba(15, 23, 42, 0.92)');
      g.addColorStop(0.55, 'rgba(91, 20, 20, 0.72)');
      g.addColorStop(0.85, 'rgba(127, 29, 29, 0.35)');
      g.addColorStop(1, 'rgba(127, 29, 29, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, c.radius * 1.08, c.radius * 0.66, 0, 0, Math.PI * 2);
      ctx.fill();

      // Deterministic charred ground fissures radiating from crater center
      this.drawGroundCrackLines(c.id * 17, c.radius * 1.02, 0.55, 0.62);

      // Subtle glowing ember core
      const emberPulse = 0.45 + 0.35 * Math.sin(engine.time * 3.5 + c.id);
      ctx.strokeStyle = `rgba(248, 113, 113, ${emberPulse * 0.6})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, c.radius * 0.58, c.radius * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();

      const archivedLabel = translate(engine.lang, 'canvas.archived');
      this.drawCenteredIconLabel('flame', archivedLabel, 0, 1.5, {
        iconSize: 11,
        iconColor: '#fb923c',
        textColor: 'rgba(254, 202, 202, 0.92)',
        font: 'bold 10px system-ui, -apple-system, sans-serif',
        gap: 3.5,
        strokeWidth: 2.2,
        textStrokeColor: '#0f172a',
        textStrokeWidth: 2.5,
        textOffsetY: 0.5,
        maxTextWidth: c.radius * 1.6,
      });
      ctx.restore();
    }

    // Purple Leaked Telemetry puddles (bubbling toxic data slick!)
    for (const p of engine.leakPuddles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      const pulse = 1 + Math.sin(p.pulse) * 0.08;

      // Outer magenta warning shimmer
      ctx.strokeStyle = `rgba(232, 121, 249, ${0.35 + 0.25 * Math.sin(p.pulse * 1.5)})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.radius * (pulse + 0.14), p.radius * 0.58 * (pulse + 0.14), 0, 0, Math.PI * 2);
      ctx.stroke();

      // Glossy dark-purple puddle body
      const pg = ctx.createRadialGradient(-4, -3, 3, 0, 0, p.radius);
      pg.addColorStop(0, 'rgba(217, 70, 239, 0.68)');
      pg.addColorStop(0.65, 'rgba(126, 34, 206, 0.62)');
      pg.addColorStop(1, 'rgba(59, 7, 100, 0.48)');
      ctx.fillStyle = pg;
      ctx.strokeStyle = 'rgba(240, 171, 252, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.radius * pulse, p.radius * 0.55 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Animated rising purple bubbles
      for (let b = 0; b < 3; b++) {
        const bf = (engine.time * 1.3 + b * 0.37 + p.id) % 1;
        const bx = Math.cos(b * 2.1 + p.id) * p.radius * 0.48;
        const by = Math.sin(b * 2.1 + p.id) * p.radius * 0.22 - bf * 12;
        ctx.fillStyle = `rgba(245, 208, 254, ${(1 - bf) * 0.85})`;
        ctx.beginPath();
        ctx.arc(bx, by, 2.2 + (1 - bf) * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      const ipLogLabel = translate(engine.lang, 'canvas.ipLog');
      ctx.fillStyle = '#fae8ff';
      ctx.strokeStyle = '#3b0764';
      ctx.lineWidth = 2.4;
      ctx.font = 'bold 9.5px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      const maxLogW = p.radius * 1.85;
      ctx.strokeText(ipLogLabel, 0, 3, maxLogW);
      ctx.fillText(ipLogLabel, 0, 3, maxLogW);
      ctx.restore();
    }

    // Bulging Fake Delete Rugs (2.4 GB -> 41.6 GB with animated dust puffs & stress cracks!)
    for (const rug of engine.fakeRugs) {
      const frac = Math.min(1, rug.elapsed / rug.duration);
      const quakeAmp = frac > 0.8 ? 6.5 : frac > 0.55 ? 2.2 : 0;
      const shakeX = quakeAmp > 0 ? Math.sin(engine.time * 48 + rug.id) * quakeAmp : 0;
      const shakeY = quakeAmp > 0 ? Math.cos(engine.time * 42 + rug.id) * (quakeAmp * 0.45) : 0;
      const bulge = 1 + frac * 0.44;
      const rx = rug.radius * (0.95 + frac * 0.22);
      const ry = rug.radius * (0.52 + frac * 0.3);
      const domeY = -frac * 25;

      ctx.save();
      ctx.translate(rug.x + shakeX, rug.y + shakeY);

      // Animated dust puffs escaping under straining rug edges
      const dustCount = frac > 0.7 ? 7 : 4;
      for (let d = 0; d < dustCount; d++) {
        const df = (engine.time * (0.9 + frac * 1.8) + d / dustCount + rug.id * 0.3) % 1;
        const ang = d * ((Math.PI * 2) / dustCount) + rug.id;
        const dx = Math.cos(ang) * (rx * (0.88 + df * 0.42));
        const dy = 6 + Math.sin(ang) * (ry * 0.65) - df * (8 + frac * 14);
        const dr = 3.5 + df * (5 + frac * 5);
        ctx.fillStyle =
          frac > 0.78
            ? `rgba(254, 202, 202, ${(1 - df) * 0.55})`
            : `rgba(232, 213, 179, ${(1 - df) * 0.48})`;
        ctx.beginPath();
        ctx.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Deep ground shadow under bulging carpet
      ctx.fillStyle = 'rgba(15, 23, 42, 0.44)';
      ctx.beginPath();
      ctx.ellipse(0, 11, rx * 1.08, ry * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden woven fringe tassels sticking out of carpet rim
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      for (let f = 0; f < 10; f++) {
        const a = (f / 10) * Math.PI * 2;
        const x1 = Math.cos(a) * (rx - 2);
        const y1 = domeY * 0.38 + Math.sin(a) * (ry - 1);
        const x2 = Math.cos(a) * (rx + 6);
        const y2 = domeY * 0.38 + Math.sin(a) * (ry + 4);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Ornate Persian carpet body physically doming upward
      const grad = ctx.createRadialGradient(-8, domeY - 8, 5, 0, 0, rug.radius * bulge);
      grad.addColorStop(0, frac > 0.8 ? '#f87171' : frac > 0.5 ? '#ea580c' : '#d97706');
      grad.addColorStop(0.58, '#991b1b');
      grad.addColorStop(1, '#450a0a');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, domeY * 0.4, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner gold woven diamond border
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.7)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, domeY * 0.4, rx * 0.7, ry * 0.65, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Squirming trapped-enemy bump shadows when enemies are swept under
      if (rug.trapped.length > 0) {
        const lumps = Math.min(3, rug.trapped.length);
        ctx.fillStyle = 'rgba(255, 237, 213, 0.16)';
        for (let l = 0; l < lumps; l++) {
          const lx = Math.sin(engine.time * (3.2 + l) + l * 2.1) * rx * 0.35;
          const ly = domeY * 0.42 + Math.cos(engine.time * (2.8 + l) + l * 1.7) * ry * 0.25;
          ctx.beginPath();
          ctx.ellipse(lx, ly, 10 + frac * 4, 6 + frac * 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Progressive animated stress cracks tearing across the carpet dome!
      if (frac > 0.22) {
        const crackIntensity = Math.min(1, (frac - 0.22) / 0.78);
        const crackCount = frac > 0.72 ? 6 : frac > 0.48 ? 4 : 3;
        const glowPulse = 0.65 + 0.35 * Math.sin(engine.time * 12);

        for (let k = 0; k < crackCount; k++) {
          const baseAng = (k / crackCount) * Math.PI * 2 + 0.4;
          const cLen = (0.35 + crackIntensity * 0.55) * Math.min(rx, ry * 1.55);
          const x0 = Math.cos(baseAng) * 5;
          const y0 = domeY * 0.4 + Math.sin(baseAng) * 3;
          const xm = Math.cos(baseAng + 0.18) * (cLen * 0.54);
          const ym = domeY * 0.4 + Math.sin(baseAng + 0.18) * (cLen * 0.36);
          const xe = Math.cos(baseAng - 0.12) * cLen;
          const ye = domeY * 0.4 + Math.sin(baseAng - 0.12) * (cLen * 0.62);

          // Dark tear line
          ctx.strokeStyle = '#1c0a0a';
          ctx.lineWidth = 2.4 + crackIntensity * 1.4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(xm, ym);
          ctx.lineTo(xe, ye);
          ctx.stroke();

          // Glowing orange-gold seam bursting through the fabric
          ctx.strokeStyle =
            frac > 0.75
              ? `rgba(254, 240, 138, ${0.85 * glowPulse})`
              : `rgba(251, 146, 60, ${0.65 * crackIntensity})`;
          ctx.lineWidth = 1.1 + crackIntensity * 0.8;
          ctx.stroke();
        }
      }

      // Note: Live GB & countdown pressure pill is rendered in drawTopWorldOverlays()
      // AFTER towers & units so tower badges never obscure the rug timer!
      ctx.restore();
    }
  }

  private drawGroundCrackLines(seedBase: number, maxRadius: number, yScale: number, glowAlpha: number): void {
    const ctx = this.ctx;
    const branches = 7;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < branches; i++) {
      const ang = (i / branches) * Math.PI * 2 + (hash01(seedBase + i) - 0.5) * 0.42;
      const len = maxRadius * (0.62 + hash01(seedBase + i + 31) * 0.38);
      const p1x = Math.cos(ang) * (len * 0.35);
      const p1y = Math.sin(ang) * (len * 0.35) * yScale;
      const p2x = Math.cos(ang + 0.16) * (len * 0.68);
      const p2y = Math.sin(ang + 0.16) * (len * 0.68) * yScale;
      const p3x = Math.cos(ang - 0.08) * len;
      const p3y = Math.sin(ang - 0.08) * len * yScale;

      ctx.strokeStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
      ctx.stroke();

      if (glowAlpha > 0.04) {
        ctx.strokeStyle = `rgba(248, 113, 113, ${glowAlpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Secondary fork crack
      const forkAng = ang + (i % 2 === 0 ? 0.45 : -0.45);
      const fx = p2x + Math.cos(forkAng) * (len * 0.28);
      const fy = p2y + Math.sin(forkAng) * (len * 0.28) * yScale;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(p2x, p2y);
      ctx.lineTo(fx, fy);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawTowerPads(engine: GameEngine, ui: RenderUIState): void {
    const ctx = this.ctx;
    const stage = engine.getStage();
    const theme = getRoadTheme(stage);
    const isBridge = theme === 'bridge';
    const isFurnace = theme === 'furnace';
    const pulse = 0.5 + 0.5 * Math.sin((engine.time > 0 ? engine.time : this.uiAnimTime) * 4.2);

    for (const pad of stage.pads) {
      const hasTower = engine.getTowerAtPad(pad.id);
      if (hasTower) continue;

      const isSelected = ui.selectedPadId === pad.id;
      const isHover = ui.hoveredPadId === pad.id;

      ctx.save();
      ctx.translate(pad.x, pad.y);

      // Stage 3: Subtle dark-blue / cyan outer rim light around obsidian build pedestal
      if (isFurnace) {
        const padRim = this.getGlowSprite(
          'pad-rim-furnace',
          64,
          [
            [0, 'rgba(56, 189, 248, 0.26)'],
            [0.65, 'rgba(37, 99, 235, 0.17)'],
            [1, 'rgba(15, 23, 42, 0)'],
          ],
          0.35
        );
        if (padRim) {
          ctx.globalAlpha = 0.7 + pulse * 0.3;
          ctx.drawImage(padRim, -46, -24, 92, 52);
          ctx.globalAlpha = 1;
        }
      }

      // Soft ground shadow under stone foundation
      ctx.fillStyle = isFurnace
        ? 'rgba(4, 8, 18, 0.62)'
        : isBridge
          ? 'rgba(20, 22, 14, 0.48)'
          : 'rgba(18, 32, 12, 0.42)';
      ctx.beginPath();
      ctx.ellipse(0, 7, 37, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden selection/hover aura
      if (isSelected || isHover) {
        ctx.strokeStyle = isSelected
          ? `rgba(250, 204, 21, ${0.7 + pulse * 0.3})`
          : isFurnace
            ? 'rgba(103, 232, 249, 0.85)'
            : 'rgba(254, 240, 138, 0.65)';
        ctx.lineWidth = isSelected ? 3.5 : 2.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 39, 21, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Beveled stone / obsidian pad rim
      ctx.fillStyle = isFurnace ? '#1e293b' : isBridge ? '#576071' : '#64748b';
      ctx.strokeStyle = isFurnace ? '#070b14' : '#1e293b';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 3, 35, 18.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Sunlit / midnight-steel top surface
      const grad = ctx.createLinearGradient(0, -18, 0, 18);
      if (isSelected) {
        grad.addColorStop(0, '#fef9c3');
        grad.addColorStop(1, '#facc15');
      } else if (isHover) {
        if (isFurnace) {
          grad.addColorStop(0, '#7dd3fc');
          grad.addColorStop(1, '#3b82f6');
        } else {
          grad.addColorStop(0, '#f8fafc');
          grad.addColorStop(1, '#cbd5e1');
        }
      } else if (isFurnace) {
        grad.addColorStop(0, '#4b6182');
        grad.addColorStop(1, '#2a3954');
      } else if (isBridge) {
        grad.addColorStop(0, '#ddd6c5');
        grad.addColorStop(1, '#9ca3af');
      } else {
        grad.addColorStop(0, '#e2e8f0');
        grad.addColorStop(1, '#94a3b8');
      }
      ctx.fillStyle = grad;
      ctx.strokeStyle = isSelected
        ? '#a16207'
        : isFurnace
          ? isHover
            ? '#e0f2fe'
            : 'rgba(56, 189, 248, 0.65)'
          : '#334155';
      ctx.lineWidth = isSelected ? 2.8 : 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 34, 17.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Carved stone segment notches around edge
      ctx.strokeStyle = isFurnace ? 'rgba(125, 211, 252, 0.34)' : 'rgba(51, 65, 85, 0.35)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 24, Math.sin(a) * 12);
        ctx.lineTo(Math.cos(a) * 33, Math.sin(a) * 16.8);
        ctx.stroke();
      }

      // Inner carved ring
      ctx.strokeStyle = isSelected
        ? 'rgba(133, 77, 14, 0.55)'
        : isFurnace
          ? 'rgba(192, 132, 252, 0.48)'
          : 'rgba(71, 85, 105, 0.48)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 23, 11.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Crisp plus icon
      ctx.fillStyle = isSelected
        ? '#713f12'
        : isFurnace
          ? isHover
            ? '#ffffff'
            : '#67e8f9'
          : isHover
            ? '#0f172a'
            : '#475569';
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', 0, 1);

      ctx.restore();
    }
  }

  private drawRangesAndTargeting(engine: GameEngine, ui: RenderUIState): void {
    const ctx = this.ctx;
    const stage = engine.getStage();

    // Range preview for selected tower
    const preview = ui.previewRange ?? null;
    if (ui.selectedPadId) {
      const tw = engine.getTowerAtPad(ui.selectedPadId);
      if (tw) {
        const stat = getTowerStat(tw.type, tw.level, tw.branch);
        const dimmingForUpgrade =
          preview !== null && Math.hypot(preview.x - tw.x, preview.y - tw.y) < 8;
        ctx.save();
        const isArtillery = tw.type === 'artillery';
        ctx.strokeStyle = isArtillery
          ? dimmingForUpgrade
            ? 'rgba(249, 115, 22, 0.36)'
            : 'rgba(249, 115, 22, 0.82)'
          : dimmingForUpgrade
            ? 'rgba(56, 189, 248, 0.36)'
            : 'rgba(56, 189, 248, 0.8)';
        ctx.fillStyle = isArtillery ? 'rgba(249, 115, 22, 0.11)' : 'rgba(56, 189, 248, 0.10)';
        ctx.lineWidth = dimmingForUpgrade ? 1.6 : 2.2;
        ctx.beginPath();
        ctx.arc(tw.x, tw.y, stat.range, 0, Math.PI * 2);
        if (!dimmingForUpgrade) ctx.fill();
        ctx.stroke();

        // @bot Scrapers Lv.3B speed-aura buff radius preview (185px)
        if (tw.type === 'barracks' && tw.level === 3 && tw.branch === 'b') {
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.65)';
          ctx.lineWidth = 2;
          ctx.setLineDash([7, 7]);
          ctx.lineDashOffset = -engine.time * 24;
          ctx.beginPath();
          ctx.arc(tw.x, tw.y, 185, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Rally flag for barracks
        if (tw.type === 'barracks') {
          this.drawRallyFlag(tw.rallyPoint.x, tw.rallyPoint.y, engine.time);
        }
        ctx.restore();
      }
    }

    // Live radial-menu hover range preview (build OR upgrade preview BEFORE spending gold!)
    if (preview && preview.range > 0) {
      this.drawPreviewRange(preview, stage, engine.lang);
    }

    // Active skill targeting reticle
    if (ui.targetingMode === 'rug' || ui.targetingMode === 'delete') {
      const isRug = ui.targetingMode === 'rug';
      const r = isRug ? 92 : 108;
      let tx = ui.mouseX;
      let ty = ui.mouseY;
      if (isRug) {
        const snapped = closestPointOnPaths(stage.sampledPaths, ui.mouseX, ui.mouseY);
        if (snapped.distToRoad < 95) {
          tx = snapped.x;
          ty = snapped.y;
        }
      }
      const color = isRug ? '#facc15' : '#ef4444';
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = isRug ? 'rgba(250, 204, 21, 0.16)' : 'rgba(239, 68, 68, 0.18)';
      ctx.lineWidth = 3;
      ctx.setLineDash([9, 6]);
      ctx.lineDashOffset = -engine.time * 34;
      ctx.beginPath();
      ctx.arc(tx, ty, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner crosshair
      ctx.setLineDash([]);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(tx - 12, ty);
      ctx.lineTo(tx + 12, ty);
      ctx.moveTo(tx, ty - 12);
      ctx.lineTo(tx, ty + 12);
      ctx.stroke();

      // Extra high-contrast warning if a VIP is inside 4 AM Delete blast (edge-clamped!)
      if (!isRug) {
        const vipRisk = engine.vips.some(
          (v) => !v.fleeing && Math.hypot(v.x - tx, v.y - ty) <= r + 12
        );
        if (vipRisk) {
          const warnText = translate(engine.lang, 'canvas.vipInBlast');
          const warnFont = '900 12px system-ui, -apple-system, sans-serif';
          const warnIconSize = 13.5;
          const warnGap = 5;
          ctx.font = warnFont;
          const warnW = Math.max(
            144,
            Math.min(
              LOGICAL_W - 24,
              Math.ceil(ctx.measureText(warnText).width + warnIconSize + warnGap) + 20
            )
          );
          const warnH = 24;
          const wx = Math.max(10, Math.min(LOGICAL_W - 10 - warnW, tx - warnW / 2));
          const wy = Math.max(58, Math.min(LOGICAL_H - 12 - warnH, ty - r - 30));
          ctx.fillStyle = '#7f1d1d';
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(wx, wy, warnW, warnH, 8);
          ctx.fill();
          ctx.stroke();
          this.drawCenteredIconLabel('alertTriangle', warnText, wx + warnW / 2, wy + warnH / 2, {
            iconSize: warnIconSize,
            iconColor: '#fde047',
            textColor: '#fef08a',
            font: warnFont,
            gap: warnGap,
            strokeWidth: 2.3,
            maxTextWidth: warnW - warnIconSize - warnGap - 16,
          });
        }
      }
      ctx.restore();
    } else if (ui.targetingMode === 'rally' && ui.rallyTowerId !== null) {
      const tw = engine.towers.find((t0) => t0.id === ui.rallyTowerId);
      if (tw) {
        const stat = getTowerStat(tw.type, tw.level, tw.branch);
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tw.x, tw.y, stat.range, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        this.drawRallyFlag(ui.mouseX, ui.mouseY, engine.time);
        ctx.restore();
      }
    }
  }

  private drawRallyFlag(x: number, y: number, time: number): void {
    const ctx = this.ctx;
    const wave = Math.sin(time * 7) * 2.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 10, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -30);
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.quadraticCurveTo(10, -28 + wave, 22, -23 + wave * 0.7);
    ctx.lineTo(0, -15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, -31, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawCastle(engine: GameEngine): void {
    const ctx = this.ctx;
    const stage = engine.getStage();
    const theme = getRoadTheme(stage);
    const isBridge = theme === 'bridge';
    const isFurnace = theme === 'furnace';
    const animT = engine.time > 0 ? engine.time : this.uiAnimTime;
    const img = assets.get('castle-t3');
    const maxLives = Math.max(1, engine.maxLives);
    const hpRatio = engine.lives / maxLives;
    const isDamaged = engine.lives < maxLives && (engine.lives <= 13 || hpRatio <= 0.65);
    const isCritical = engine.lives < maxLives && (engine.lives <= 6 || hpRatio <= 0.3);

    ctx.save();
    ctx.translate(stage.castlePos.x, stage.castlePos.y);

    // Stage 3 (4 AM Server Furnace): Extra cool cyan/violet server-glow reflection halo on the ground beneath the castle!
    if (isFurnace) {
      const pulse = 0.8 + 0.2 * Math.sin(animT * 2.5);
      // Wide outer neon-violet floor reflection
      const outerHalo = ctx.createRadialGradient(2, 54, 24, 2, 54, 146);
      outerHalo.addColorStop(0, `rgba(34, 211, 238, ${0.34 * pulse})`);
      outerHalo.addColorStop(0.45, `rgba(139, 92, 246, ${0.26 * pulse})`);
      outerHalo.addColorStop(0.78, `rgba(59, 130, 246, ${0.12 * pulse})`);
      outerHalo.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = outerHalo;
      ctx.beginPath();
      ctx.ellipse(2, 54, 146, 58, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner electric-cyan server-glow reflection ring hugging the castle base
      const innerHalo = ctx.createRadialGradient(4, 54, 10, 4, 54, 110);
      innerHalo.addColorStop(0, `rgba(103, 232, 249, ${0.40 * pulse})`);
      innerHalo.addColorStop(0.58, `rgba(56, 189, 248, ${0.20 * pulse})`);
      innerHalo.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = innerHalo;
      ctx.beginPath();
      ctx.ellipse(4, 54, 112, 43, 0, 0, Math.PI * 2);
      ctx.fill();

      // Subtle orbiting holographic circuit rim on the fortress foundation
      ctx.save();
      ctx.strokeStyle = `rgba(103, 232, 249, ${0.42 * pulse})`;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([12, 10]);
      ctx.lineDashOffset = -animT * 18;
      ctx.beginPath();
      ctx.ellipse(4, 55, 114, 42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Ground shadow
    ctx.fillStyle = isFurnace
      ? 'rgba(4, 8, 20, 0.62)'
      : isBridge
        ? 'rgba(12, 16, 28, 0.48)'
        : 'rgba(15, 23, 42, 0.38)';
    ctx.beginPath();
    ctx.ellipse(6, 56, 102, 37, 0, 0, Math.PI * 2);
    ctx.fill();

    if (img) {
      const w = 225;
      const h = (img.height / img.width) * w;
      ctx.drawImage(img, -w / 2, 58 - h, w, h);
    } else {
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4;
      ctx.fillRect(-70, -90, 140, 145);
      ctx.strokeRect(-70, -90, 140, 145);
    }

    // Stage 2 (EU Audit Canyon): Warm amber twilight glow emanating from Silicon Valley Fortress server windows!
    if (isBridge) {
      this.drawCastleTwilightWindowGlow(engine, isCritical);
    } else if (isFurnace) {
      // Stage 3 (4 AM Server Furnace): Electric cyan & neon-violet midnight server-rack glow!
      this.drawCastleMidnightServerGlow(engine, isCritical);
    }

    // Dynamic Castle Damage States: wall cracks, server window flicker, smoke puffs & electrical sparks
    if (isDamaged) {
      this.drawCastleDamageOverlay(engine, isCritical);
    }

    // Subtle animated cyan pulse waves radiating from the castle satellite dish (top-right)
    const dishX = 48;
    const dishY = -148;
    const dishSputter = isCritical && hash01(Math.floor(engine.time * 12) + 77) < 0.45;
    if (!dishSputter) {
      for (let i = 0; i < 2; i++) {
        const wf = (animT * 0.85 + i * 0.5) % 1;
        ctx.strokeStyle =
          engine.signFlipTimer > 0
            ? `rgba(232, 121, 249, ${(1 - wf) * 0.85})`
            : isCritical
              ? `rgba(251, 146, 60, ${(1 - wf) * 0.68})`
              : isFurnace
                ? i % 2 === 0
                  ? `rgba(34, 211, 238, ${(1 - wf) * 0.72})`
                  : `rgba(192, 132, 252, ${(1 - wf) * 0.68})`
                : `rgba(56, 189, 248, ${(1 - wf) * 0.45})`;
        ctx.lineWidth = isFurnace ? 2.4 : 2;
        ctx.beginPath();
        ctx.arc(dishX + 8, dishY - 6, 8 + wf * 24, -Math.PI * 0.68, Math.PI * 0.08);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Dynamic Rooftop "No Telemetry. Full Stop.™" Trapdoor with Mechanical Gears & Purple Glow!
    ctx.save();
    ctx.translate(stage.castleSignPos.x, stage.castleSignPos.y);

    const flipAmt = Math.min(1, engine.signFlipTimer * 1.4);
    if (flipAmt > 0.03) {
      const glowPulse = 0.72 + 0.28 * Math.sin(engine.time * 14);

      // Ambient purple energy radiance spilling out of the open rooftop vault
      const aura = ctx.createRadialGradient(0, -4, 8, 0, -6, 92 * flipAmt);
      aura.addColorStop(0, `rgba(232, 121, 249, ${0.58 * flipAmt * glowPulse})`);
      aura.addColorStop(0.55, `rgba(147, 51, 234, ${0.32 * flipAmt})`);
      aura.addColorStop(1, 'rgba(88, 28, 135, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.ellipse(0, -4, 92 * flipAmt, 52 * flipAmt, 0, 0, Math.PI * 2);
      ctx.fill();

      // Recessed dark steel trapdoor vault housing
      ctx.save();
      ctx.fillStyle = '#1e0538';
      ctx.strokeStyle = '#e879f9';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.roundRect(-72, -22, 144, 38, 7);
      ctx.fill();
      ctx.stroke();

      // Clip inside trapdoor bay so spinning gears stay crisply seated inside
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-70, -20, 140, 34, 6);
      ctx.clip();

      // Inner neon violet core glow
      const coreGrad = ctx.createLinearGradient(0, -20, 0, 14);
      coreGrad.addColorStop(0, `rgba(192, 132, 252, ${0.42 * glowPulse})`);
      coreGrad.addColorStop(0.5, 'rgba(88, 28, 135, 0.92)');
      coreGrad.addColorStop(1, 'rgba(30, 5, 56, 0.98)');
      ctx.fillStyle = coreGrad;
      ctx.fillRect(-70, -20, 140, 34);

      // 3 interlocking rotating mechanical gears!
      this.drawGear(-44, -2, 15, 10, 8, engine.time * 3.8, '#94a3b8', '#c084fc');
      this.drawGear(-20, 3, 11, 7, 7, -engine.time * 5.2 + 0.3, '#cbd5e1', '#f0abfc');
      this.drawGear(44, -2, 15, 10, 8, -engine.time * 3.8, '#94a3b8', '#c084fc');
      this.drawGear(21, -5, 10, 6.5, 6, engine.time * 5.6, '#fde047', '#a855f7');

      // Rising purple telemetry data sparks inside the vault
      for (let s = 0; s < 5; s++) {
        const sf = (engine.time * 2.2 + s * 0.21) % 1;
        const sx = -48 + s * 24 + Math.sin(engine.time * 7 + s) * 4;
        const sy = 12 - sf * 32;
        ctx.fillStyle = `rgba(245, 208, 254, ${(1 - sf) * 0.9})`;
        ctx.fillRect(sx - 1.5, sy - 3, 3, 6);
      }
      ctx.restore();

      // Riveted steel corner bolts + status banner
      const ingestLabel = translate(engine.lang, 'canvas.ingestActive');
      this.drawCenteredIconLabel('zap', ingestLabel, 2, -3, {
        iconSize: 11,
        iconColor: '#fde047',
        textColor: '#f5d0fe',
        font: 'bold 9.5px system-ui, -apple-system, monospace',
        gap: 4,
        strokeWidth: 2.3,
        textStrokeColor: '#2e1065',
        textStrokeWidth: 2.6,
        textOffsetY: 0,
        maxTextWidth: 112,
      });

      // Blinking recording indicator LED
      if (Math.sin(engine.time * 18) > 0) {
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(-62, -13, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Visible brass mechanical hinges connecting vault to the flipping billboard
      ctx.fillStyle = '#ca8a04';
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1.6;
      for (const hx of [-54, 54]) {
        ctx.beginPath();
        ctx.roundRect(hx - 4, -24 - flipAmt * 14, 8, 10 + flipAmt * 14, 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Broken right-side mounting wire & sparking bracket when critical (lives <= 6)
    const t = engine.time;
    const glitchStep = Math.floor(t * 16);
    const glitchRoll = hash01(glitchStep * 13.7 + 4.1);
    const signFlickerDim = isCritical && glitchRoll < 0.22;
    const signShortAmber = isCritical && glitchRoll >= 0.22 && glitchRoll < 0.42;
    const noWordOut = isCritical && hash01(Math.floor(t * 7) * 19.3) < 0.36;

    if (isCritical && flipAmt < 0.1) {
      // Snapped dangling wire hanging from the right mount
      ctx.save();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(56, -24);
      ctx.quadraticCurveTo(66, -12, 61 + Math.sin(t * 9) * 3, 2);
      ctx.stroke();
      // Snapping orange electrical sparks at broken mount
      const spPhase = (t * 3.1) % 1;
      if (spPhase < 0.55) {
        for (let k = 0; k < 4; k++) {
          const ang = -0.3 + k * 0.72 + hash01(glitchStep + k) * 0.35;
          const dist = 5 + spPhase * 28;
          const sx = 58 + Math.cos(ang) * dist;
          const sy = -14 + Math.sin(ang) * dist + spPhase * spPhase * 18;
          ctx.strokeStyle = k % 2 === 0 ? '#fb923c' : '#fef08a';
          ctx.lineWidth = 2 * (1 - spPhase);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - Math.cos(ang) * 5, sy - Math.sin(ang) * 5);
          ctx.stroke();
        }
        this.drawFourPointStar(58, -14, 6.5 * (1 - spPhase * 0.7), '#fde047');
      }
      ctx.restore();
    }

    // Hinged signboard lifts & tilts back when stealing, OR droops glitchily tilted when critical!
    const brokenTilt = isCritical
      ? 0.135 + (glitchRoll < 0.14 ? 0.045 : Math.sin(t * 5.2) * 0.015)
      : 0;
    const brokenDropY = isCritical ? 6 : 0;
    const glitchShiftX = isCritical && glitchRoll < 0.12 ? (glitchStep % 2 === 0 ? 2.6 : -2.6) : 0;

    ctx.translate(glitchShiftX, -flipAmt * 36 + brokenDropY);
    ctx.rotate(flipAmt * 0.22 + brokenTilt);

    // Underside metal thickness edge when lifted
    if (flipAmt > 0.05) {
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-78, -18, 156, 36, 7);
      ctx.fill();
      ctx.stroke();
    }

    // Neon glow halo behind healthy or glitching billboard
    if (isCritical) {
      ctx.fillStyle = signShortAmber
        ? 'rgba(249, 115, 22, 0.24)'
        : signFlickerDim
          ? 'rgba(15, 23, 42, 0.1)'
          : 'rgba(52, 211, 153, 0.22)';
      ctx.beginPath();
      ctx.roundRect(-82, -26, 164, 44, 10);
      ctx.fill();
    }

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle =
      flipAmt > 0.1
        ? '#a855f7'
        : isCritical
          ? signFlickerDim
            ? '#065f46'
            : signShortAmber
              ? '#fb923c'
              : '#34d399'
          : '#34d399';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-78, -22, 156, 36, 7);
    ctx.fill();
    ctx.stroke();

    // Subtle glass crack across broken billboard face
    if (isCritical) {
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.42)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(26, -21);
      ctx.lineTo(18, -7);
      ctx.lineTo(31, 4);
      ctx.lineTo(24, 13);
      ctx.moveTo(18, -7);
      ctx.lineTo(8, -1);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    if (isCritical) {
      // Satirical glitchy flickering neon: occasionally "No" shorts out leaving "Telemetry." lit!
      ctx.font = 'bold 11px monospace';
      if (glitchRoll < 0.18) {
        // Chromatic RGB glitch ghost
        ctx.fillStyle = 'rgba(244, 63, 94, 0.55)';
        ctx.fillText('No Telemetry.', -2.2, -7);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.fillText('No Telemetry.', 2.2, -7);
      }
      if (noWordOut) {
        // Draw dimmed "No " + blazing neon "Telemetry." seamlessly aligned
        const fullW = ctx.measureText('No Telemetry.').width;
        const noW = ctx.measureText('No ').width;
        const startX = -fullW / 2;
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(52, 211, 153, 0.22)';
        ctx.fillText('No ', startX, -7);
        ctx.fillStyle = signShortAmber ? '#fde047' : '#34d399';
        ctx.fillText('Telemetry.', startX + noW, -7);
        ctx.textAlign = 'center';
      } else {
        ctx.fillStyle = signFlickerDim ? '#065f46' : signShortAmber ? '#fde047' : '#34d399';
        ctx.fillText('No Telemetry.', 0, -7);
      }

      ctx.fillStyle = signFlickerDim ? '#475569' : '#e2e8f0';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(signShortAmber ? 'Fu1l St0p.™' : 'Full Stop.™', 0, 7);

      // Brief horizontal scanline tear on severe glitch beat
      if (glitchRoll < 0.14) {
        ctx.fillStyle = 'rgba(251, 146, 60, 0.45)';
        ctx.fillRect(-74, -4, 148, 2.2);
      }
    } else {
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('No Telemetry.', 0, -7);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('Full Stop.™', 0, 7);
    }
    ctx.restore();
  }

  private drawCastleTwilightWindowGlow(engine: GameEngine, isCritical: boolean): void {
    const ctx = this.ctx;
    const t = engine.time > 0 ? engine.time : this.uiAnimTime;
    const breath = (0.86 + 0.14 * Math.sin(t * 2.4)) * (isCritical ? 0.65 : 1);

    ctx.save();

    // Warm golden-amber twilight glow emanating from Silicon Valley Fortress server & office windows
    const serverWindows: Array<{ x: number; y: number; w: number; h: number; glowR: number }> = [
      { x: -24, y: -82, w: 17, h: 41, glowR: 40 }, // Left upper server rack
      { x: 38, y: -79, w: 17, h: 40, glowR: 40 },  // Right upper server rack
      { x: -3, y: -9, w: 65, h: 40, glowR: 72 },   // Big lower startup office glass window
      { x: 73, y: -5, w: 15, h: 30, glowR: 34 },   // Far-right lower server rack
    ];

    for (const win of serverWindows) {
      const cx = win.x + win.w * 0.5;
      const cy = win.y + win.h * 0.5;

      // Soft warm amber light bloom radiating onto surrounding twilight stone masonry
      const halo = ctx.createRadialGradient(cx, cy, 4, cx, cy, win.glowR);
      halo.addColorStop(0, `rgba(253, 224, 71, ${0.32 * breath})`);
      halo.addColorStop(0.45, `rgba(251, 191, 36, ${0.18 * breath})`);
      halo.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, win.glowR, 0, Math.PI * 2);
      ctx.fill();

      // Warm golden-amber interior tint inside the glass window panes
      const pane = ctx.createLinearGradient(win.x, win.y, win.x, win.y + win.h);
      pane.addColorStop(0, `rgba(254, 240, 138, ${0.3 * breath})`);
      pane.addColorStop(0.6, `rgba(251, 191, 36, ${0.22 * breath})`);
      pane.addColorStop(1, `rgba(245, 158, 11, ${0.14 * breath})`);
      ctx.fillStyle = pane;
      ctx.beginPath();
      ctx.roundRect(win.x, win.y, win.w, win.h, 3);
      ctx.fill();
    }

    // Small glowing amber turret lancet windows flanking left & right battlements
    const lancets: Vec2[] = [
      { x: -67, y: -55 },
      { x: -53, y: -55 },
      { x: 69, y: -47 },
      { x: 89, y: -47 },
    ];
    for (const lc of lancets) {
      const lg = ctx.createRadialGradient(lc.x, lc.y, 1, lc.x, lc.y, 16);
      lg.addColorStop(0, `rgba(254, 240, 138, ${0.42 * breath})`);
      lg.addColorStop(0.5, `rgba(251, 191, 36, ${0.18 * breath})`);
      lg.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(lc.x, lc.y, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    // Warm light spill pooling on the stone courtyard right in front of the office window
    const spill = ctx.createRadialGradient(28, 42, 6, 28, 46, 78);
    spill.addColorStop(0, `rgba(251, 191, 36, ${0.22 * breath})`);
    spill.addColorStop(0.6, `rgba(245, 158, 11, ${0.08 * breath})`);
    spill.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = spill;
    ctx.beginPath();
    ctx.ellipse(28, 46, 78, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawCastleMidnightServerGlow(engine: GameEngine, isCritical: boolean): void {
    const ctx = this.ctx;
    const t = engine.time > 0 ? engine.time : this.uiAnimTime;
    const breath = (0.84 + 0.16 * Math.sin(t * 2.8)) * (isCritical ? 0.68 : 1);

    ctx.save();

    // Cool cyan & neon-violet server-rack windows glowing at 4:00 AM
    const serverWindows: Array<{
      x: number;
      y: number;
      w: number;
      h: number;
      glowR: number;
      violet: boolean;
    }> = [
      { x: -24, y: -82, w: 17, h: 41, glowR: 42, violet: false },
      { x: 38, y: -79, w: 17, h: 40, glowR: 42, violet: true },
      { x: -3, y: -9, w: 65, h: 40, glowR: 78, violet: false },
      { x: 73, y: -5, w: 15, h: 30, glowR: 36, violet: true },
    ];

    for (let idx = 0; idx < serverWindows.length; idx++) {
      const win = serverWindows[idx];
      const cx = win.x + win.w * 0.5;
      const cy = win.y + win.h * 0.5;

      const halo = ctx.createRadialGradient(cx, cy, 4, cx, cy, win.glowR);
      if (win.violet) {
        halo.addColorStop(0, `rgba(232, 121, 249, ${0.34 * breath})`);
        halo.addColorStop(0.45, `rgba(168, 85, 247, ${0.20 * breath})`);
        halo.addColorStop(1, 'rgba(109, 40, 217, 0)');
      } else {
        halo.addColorStop(0, `rgba(103, 232, 249, ${0.36 * breath})`);
        halo.addColorStop(0.45, `rgba(34, 211, 238, ${0.20 * breath})`);
        halo.addColorStop(1, 'rgba(14, 165, 233, 0)');
      }
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, win.glowR, 0, Math.PI * 2);
      ctx.fill();

      const pane = ctx.createLinearGradient(win.x, win.y, win.x, win.y + win.h);
      if (win.violet) {
        pane.addColorStop(0, `rgba(245, 208, 254, ${0.28 * breath})`);
        pane.addColorStop(0.6, `rgba(192, 132, 252, ${0.22 * breath})`);
        pane.addColorStop(1, `rgba(139, 92, 246, ${0.14 * breath})`);
      } else {
        pane.addColorStop(0, `rgba(207, 250, 254, ${0.30 * breath})`);
        pane.addColorStop(0.6, `rgba(56, 189, 248, ${0.22 * breath})`);
        pane.addColorStop(1, `rgba(14, 165, 233, ${0.14 * breath})`);
      }
      ctx.fillStyle = pane;
      ctx.beginPath();
      ctx.roundRect(win.x, win.y, win.w, win.h, 3);
      ctx.fill();

      // Tiny blinking 4:00 AM server-rack activity LEDs inside vertical racks
      if (win.w < 24) {
        for (let row = 0; row < 4; row++) {
          const on = Math.sin(t * (5.5 + idx) + row * 2.1) > -0.2;
          if (!on) continue;
          ctx.fillStyle = row % 2 === 0 ? '#67e8f9' : '#f0abfc';
          ctx.beginPath();
          ctx.arc(win.x + 5 + (row % 2) * 5, win.y + 7 + row * 7.5, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Cool cyan/violet lancet glows flanking castle turrets
    const lancets: Array<{ x: number; y: number; violet: boolean }> = [
      { x: -67, y: -55, violet: false },
      { x: -53, y: -55, violet: true },
      { x: 69, y: -47, violet: false },
      { x: 89, y: -47, violet: true },
    ];
    for (const lc of lancets) {
      const lg = ctx.createRadialGradient(lc.x, lc.y, 1, lc.x, lc.y, 18);
      lg.addColorStop(
        0,
        lc.violet ? `rgba(245, 208, 254, ${0.45 * breath})` : `rgba(165, 243, 252, ${0.46 * breath})`
      );
      lg.addColorStop(
        0.5,
        lc.violet ? `rgba(168, 85, 247, ${0.2 * breath})` : `rgba(34, 211, 238, ${0.2 * breath})`
      );
      lg.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(lc.x, lc.y, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cool cyan/violet light reflection pooling in front of the obsidian courtyard doorway
    const spill = ctx.createRadialGradient(18, 46, 8, 18, 50, 88);
    spill.addColorStop(0, `rgba(56, 189, 248, ${0.30 * breath})`);
    spill.addColorStop(0.55, `rgba(168, 85, 247, ${0.15 * breath})`);
    spill.addColorStop(1, 'rgba(30, 58, 138, 0)');
    ctx.fillStyle = spill;
    ctx.beginPath();
    ctx.ellipse(18, 50, 88, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawCastleDamageOverlay(engine: GameEngine, isCritical: boolean): void {
    const ctx = this.ctx;
    const t = engine.time;
    ctx.save();

    // 1. Hand-drawn dark structural wall cracks (mapped precisely to castle-t3.webp masonry)
    const drawCrackPath = (pts: Array<[number, number]>, width: number, highlight = true) => {
      if (pts.length < 2) return;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (highlight) {
        ctx.strokeStyle = 'rgba(254, 243, 199, 0.34)';
        ctx.lineWidth = width + 1.4;
        ctx.beginPath();
        pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px + 1, py + 0.8) : ctx.lineTo(px + 1, py + 0.8)));
        ctx.stroke();
      }
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = width;
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
      ctx.stroke();
    };

    // Core cracks visible at lives <= 13
    drawCrackPath([[-36, -6], [-28, 6], [-35, 18], [-27, 32]], 2.6);
    drawCrackPath([[-28, 6], [-19, 12], [-14, 19]], 1.7);
    drawCrackPath([[-18, -98], [-8, -90], [2, -94], [14, -84]], 2.3);
    drawCrackPath([[-8, -90], [-12, -80]], 1.5);
    drawCrackPath([[26, -34], [35, -24], [31, -14], [43, -6]], 2.4);
    drawCrackPath([[66, -20], [76, -10], [72, 2], [82, 10]], 2.1);

    // Extra deep fissures + soot charring + cracked glass office window at lives <= 6
    if (isCritical) {
      // Dark soot scorch smudges behind breach points
      const breaches: Array<[number, number, number]> = [
        [-31, 8, 22],
        [44, -60, 20],
        [10, -90, 18],
      ];
      for (const [bx, by, br] of breaches) {
        const soot = ctx.createRadialGradient(bx, by, 2, bx, by, br);
        soot.addColorStop(0, 'rgba(15, 23, 42, 0.56)');
        soot.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = soot;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }

      // Additional masonry fissures
      drawCrackPath([[-86, 4], [-78, 16], [-84, 28]], 2.2);
      drawCrackPath([[6, 38], [22, 43], [38, 37], [52, 45]], 2.2);

      // Shattered glass spiderweb on lower-right cyan office window
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.85)';
      ctx.lineWidth = 1.4;
      const gx = 26;
      const gy = 11;
      for (const [dx, dy] of [
        [-22, -12],
        [18, -14],
        [26, 8],
        [-14, 17],
        [8, 18],
      ]) {
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + dx * 0.52, gy + dy * 0.44);
        ctx.lineTo(gx + dx, gy + dy);
        ctx.stroke();
      }
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(gx, gy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Cyan server window flicker (lives <= 13 occasional outage; lives <= 6 erratic red/black glitches)
    const serverWindows: Array<{ x: number; y: number; w: number; h: number; seed: number }> = [
      { x: -24, y: -82, w: 17, h: 41, seed: 11 }, // Left upper server rack
      { x: 38, y: -79, w: 17, h: 40, seed: 29 },  // Right upper server rack
      { x: -3, y: -9, w: 65, h: 40, seed: 47 },   // Big lower office glass window
      { x: 73, y: -5, w: 15, h: 30, seed: 63 },   // Far-right lower server rack
    ];
    const flickerTick = Math.floor(t * (isCritical ? 14 : 9));
    for (const win of serverWindows) {
      const r = hash01(flickerTick * 17.3 + win.seed);
      const outageChance = isCritical ? 0.34 : 0.17;
      if (r < outageChance) {
        // Window power dip / blackout
        ctx.fillStyle = isCritical ? 'rgba(9, 13, 24, 0.78)' : 'rgba(9, 13, 24, 0.62)';
        ctx.beginPath();
        ctx.roundRect(win.x, win.y, win.w, win.h, 3);
        ctx.fill();

        // Cyan or crimson error LED surge bar inside flickering window
        const barY = win.y + 4 + hash01(flickerTick + win.seed * 3) * (win.h - 10);
        ctx.fillStyle = isCritical && r < 0.16 ? 'rgba(248, 113, 113, 0.85)' : 'rgba(103, 232, 249, 0.82)';
        ctx.fillRect(win.x + 2, barY, win.w - 4, 2.5);
      } else if (r > 0.88) {
        // Brief bright cyan electrical surge flash
        ctx.fillStyle = 'rgba(186, 230, 253, 0.32)';
        ctx.beginPath();
        ctx.roundRect(win.x, win.y, win.w, win.h, 3);
        ctx.fill();
      }
    }

    // 3. Critical state (lives <= 6): rising dark smoke puffs + snapping orange electrical sparks!
    if (isCritical) {
      const smokeVents: Array<{ x: number; y: number; scale: number; phase: number }> = [
        { x: -32, y: -6, scale: 1.0, phase: 0.0 },
        { x: 46, y: -68, scale: 0.92, phase: 0.37 },
        { x: 12, y: -92, scale: 0.85, phase: 0.71 },
      ];
      for (const vent of smokeVents) {
        for (let i = 0; i < 5; i++) {
          const pf = (t * 0.48 + vent.phase + i * 0.2) % 1;
          const sx = vent.x + pf * 24 + Math.sin(t * 2.2 + i * 2.1 + vent.phase * 9) * 6;
          const sy = vent.y - pf * 74;
          const sr = (5.5 + pf * 13.5) * vent.scale;
          const alpha = Math.sin(pf * Math.PI) * 0.68;

          ctx.fillStyle = `rgba(30, 41, 59, ${alpha})`;
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fill();

          // Darker smoky core
          ctx.fillStyle = `rgba(15, 23, 42, ${alpha * 0.75})`;
          ctx.beginPath();
          ctx.arc(sx - sr * 0.18, sy + sr * 0.12, sr * 0.62, 0, Math.PI * 2);
          ctx.fill();

          // Warm ember under-glow near vent base
          if (pf < 0.28) {
            ctx.fillStyle = `rgba(249, 115, 22, ${(1 - pf / 0.28) * 0.55})`;
            ctx.beginPath();
            ctx.arc(vent.x, vent.y - pf * 12, 4.5 * vent.scale, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Snapping orange electrical sparks arcing from cracked server racks & turret
      const sparkEmitters: Array<{ x: number; y: number; phase: number }> = [
        { x: 46, y: -58, phase: 0.1 },
        { x: -28, y: 6, phase: 0.48 },
        { x: 80, y: -64, phase: 0.78 },
      ];
      for (let eIdx = 0; eIdx < sparkEmitters.length; eIdx++) {
        const em = sparkEmitters[eIdx];
        const cycle = (t * 2.15 + em.phase) % 1;
        if (cycle < 0.52) {
          const burst = cycle / 0.52;
          const inv = 1 - burst;
          const seedBase = Math.floor(t * 2.15 + em.phase) * 31 + eIdx * 17;

          // Bright spark flash core at burst start
          if (burst < 0.35) {
            this.drawFourPointStar(em.x, em.y, 7.5 * (1 - burst / 0.35), '#fef08a');
          }

          // Flying orange-gold spark streaks with gravity droop
          for (let s = 0; s < 5; s++) {
            const ang = -Math.PI * 0.95 + hash01(seedBase + s) * Math.PI * 1.4;
            const speed = 20 + hash01(seedBase + s + 13) * 26;
            const sx = em.x + Math.cos(ang) * speed * burst;
            const sy = em.y + Math.sin(ang) * speed * burst + 26 * burst * burst;
            const prevB = Math.max(0, burst - 0.14);
            const px = em.x + Math.cos(ang) * speed * prevB;
            const py = em.y + Math.sin(ang) * speed * prevB + 26 * prevB * prevB;

            ctx.strokeStyle = s % 2 === 0 ? `rgba(251, 146, 60, ${inv})` : `rgba(254, 240, 138, ${inv})`;
            ctx.lineWidth = 2.2 * inv + 0.6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(sx, sy);
            ctx.stroke();
          }
        }
      }
    }

    ctx.restore();
  }

  private drawGear(
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    teeth: number,
    angle: number,
    fill: string,
    hubColor: string
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    ctx.fillStyle = fill;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const steps = teeth * 2;
    for (let i = 0; i < steps; i++) {
      const a0 = (i / steps) * Math.PI * 2;
      const a1 = ((i + 0.5) / steps) * Math.PI * 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const x = Math.cos(a0) * r;
      const y = Math.sin(a0) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner hub
    ctx.fillStyle = hubColor;
    ctx.beginPath();
    ctx.arc(0, 0, innerR * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private getTowerSpriteSize(tw: Tower, img: HTMLImageElement | null): { w: number; h: number } {
    // Normalize height by natural 280px sprite-sheet proportions so all 4 towers fit stone pads cleanly
    const baseH = tw.type === 'barracks' ? 98 : tw.type === 'artillery' ? 100 : 108;
    if (img && img.width > 0 && img.height > 0) {
      const w = (img.width / img.height) * baseH;
      return { w, h: baseH };
    }
    return { w: 72, h: baseH };
  }

  private drawFurnaceUnitRim(
    rx: number,
    ry: number,
    liftY: number,
    accent: 'blue' | 'gold' = 'blue'
  ): void {
    const ctx = this.ctx;
    const isGold = accent === 'gold';
    const rimSprite = isGold
      ? this.getGlowSprite(
          'unit-rim-gold',
          64,
          [
            [0, 'rgba(254, 240, 138, 0.30)'],
            [0.52, 'rgba(245, 158, 11, 0.16)'],
            [1, 'rgba(245, 158, 11, 0)'],
          ],
          0.1
        )
      : this.getGlowSprite(
          'unit-rim-blue',
          64,
          [
            [0, 'rgba(96, 165, 250, 0.28)'],
            [0.52, 'rgba(37, 99, 235, 0.16)'],
            [1, 'rgba(30, 58, 138, 0)'],
          ],
          0.1
        );
    const baseSprite = isGold
      ? this.getGlowSprite(
          'unit-base-gold',
          64,
          [
            [0, 'rgba(250, 204, 21, 0.26)'],
            [1, 'rgba(250, 204, 21, 0)'],
          ],
          0.2
        )
      : this.getGlowSprite(
          'unit-base-blue',
          64,
          [
            [0, 'rgba(56, 189, 248, 0.22)'],
            [0.65, 'rgba(37, 99, 235, 0.11)'],
            [1, 'rgba(30, 58, 138, 0)'],
          ],
          0.2
        );

    if (rimSprite) {
      const rw = rx * 1.42;
      const rh = ry * 1.42;
      ctx.drawImage(rimSprite, -rw, liftY - rh, rw * 2, rh * 2);
    }
    if (baseSprite) {
      const bw = rx * 1.28;
      const bh = rx * 0.62;
      ctx.drawImage(baseSprite, -bw, 4 - bh, bw * 2, bh * 2);
    }
  }

  private drawTower(tw: Tower, engine: GameEngine, isSelected = false): void {
    const ctx = this.ctx;
    const isFurnace = getRoadTheme(engine.getStage()) === 'furnace';
    const key = `tower-${tw.type}` as AssetKey;
    const img = assets.get(key);
    const { w, h } = this.getTowerSpriteSize(tw, img);
    const sizeScale = tw.level === 1 ? 0.92 : tw.level === 2 ? 1.0 : 1.08;
    const scaleX = (1 + tw.recoil * 0.1) * sizeScale;
    const scaleY = (1 - tw.recoil * 0.08) * sizeScale;

    ctx.save();
    ctx.translate(tw.x, tw.y);

    // Stage 3: Subtle dark-blue rim light behind tower silhouette & base
    if (isFurnace) {
      this.drawFurnaceUnitRim(36 * sizeScale, 40 * sizeScale, -22 * sizeScale, 'blue');
    }

    // 1. Ground shadow
    ctx.fillStyle = isFurnace ? 'rgba(4, 8, 20, 0.56)' : 'rgba(15, 23, 42, 0.38)';
    ctx.beginPath();
    ctx.ellipse(0, 11, 39 * sizeScale, 19 * sizeScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Lv.2+ Ornate Stone Foundation Ring & Golden Trim Banners
    if (tw.level >= 2) {
      this.drawTowerLv2Foundation(tw, engine, sizeScale);
    }

    // 3. Lv.3 Branch Ground Aura & Back-Half 2.5D Orbiting Effects (drawn BEHIND tower sprite!)
    if (tw.level === 3) {
      this.drawTowerLv3GroundAura(tw, engine, sizeScale);
    }

    // Tower body transform (squash-and-stretch recoil + level scale)
    ctx.save();
    ctx.scale(scaleX, scaleY);

    if (tw.level === 3) {
      this.drawTowerLv3BackOverlay(tw, engine, w, h);
    }

    if (img) {
      ctx.drawImage(img, -w / 2, 16 - h, w, h);
    } else {
      ctx.fillStyle = tw.type === 'mage' ? '#7c3aed' : tw.type === 'artillery' ? '#b91c1c' : '#334155';
      ctx.fillRect(-24, -48, 48, 56);
    }

    // Lv.2+ fluttering golden trim banners flanking base
    if (tw.level >= 2) {
      this.drawTowerLv2Banners(tw, engine, w);
    }

    // 4. Lv.3 Distinct Branch Front Overlays (on top of tower sprite!)
    if (tw.level === 3) {
      this.drawTowerLv3FrontOverlay(tw, engine, w, h);
    }

    ctx.restore();

    // 5. Level Stars below base
    const starCount = Math.max(1, Math.min(3, tw.level));
    const starR = tw.level === 3 ? 5.2 : 4.7;
    const starSpacing = tw.level === 3 ? 12 : 11;
    const starStartX = -((starCount - 1) * starSpacing) / 2;
    const starFill = tw.level === 3 ? '#facc15' : '#fef08a';
    for (let i = 0; i < starCount; i++) {
      drawCanvasStar(ctx, starStartX + i * starSpacing, 19.5, starR, starFill, '#0f172a');
    }

    // 5b. Target Priority Micro-Indicator on selected non-barracks towers (when set to Strong / Weak)
    if (
      isSelected &&
      tw.type !== 'barracks' &&
      tw.targetPriority &&
      tw.targetPriority !== 'first'
    ) {
      const isStrong = tw.targetPriority === 'strong';
      const prioIcon: IconName = isStrong ? 'dumbbell' : 'droplet';
      const label = isStrong
        ? translate(engine.lang, 'canvas.prio.strong')
        : translate(engine.lang, 'canvas.prio.weak');
      const prioFont = '900 9.5px system-ui, -apple-system, sans-serif';
      const prioIconSize = 10.5;
      const prioGap = 3.5;
      ctx.font = prioFont;
      const pillW = Math.max(
        54,
        Math.min(136, Math.ceil(ctx.measureText(label).width + prioIconSize + prioGap) + 14)
      );
      const pillH = 17;
      // Centered cleanly right above the stars inside the radial ring (zero collision with radial buttons!)
      const pillY = -6;

      ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
      ctx.beginPath();
      ctx.roundRect(-pillW / 2 + 1, pillY + 1.5, pillW, pillH, 8.5);
      ctx.fill();

      const pillGrad = ctx.createLinearGradient(0, pillY, 0, pillY + pillH);
      if (isStrong) {
        pillGrad.addColorStop(0, '#9a3412');
        pillGrad.addColorStop(1, '#7c2d12');
      } else {
        pillGrad.addColorStop(0, '#9f1239');
        pillGrad.addColorStop(1, '#881337');
      }
      ctx.fillStyle = pillGrad;
      ctx.strokeStyle = isStrong ? '#fde047' : '#fda4af';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-pillW / 2, pillY, pillW, pillH, 8.5);
      ctx.fill();
      ctx.stroke();

      this.drawCenteredIconLabel(prioIcon, label, 0, pillY + pillH / 2, {
        iconSize: prioIconSize,
        iconColor: isStrong ? '#fde047' : '#fda4af',
        textColor: isStrong ? '#fef9c3' : '#fff1f2',
        font: prioFont,
        gap: prioGap,
        strokeWidth: 2.5,
        maxTextWidth: pillW - prioIconSize - prioGap - 10,
      });
    }

    // 6. Lv.3 Specialization Emblem Plaque positioned cleanly above sprite top (clamped inside viewport)
    if (tw.level === 3) {
      const badgeMap: Record<string, { icon: IconName; tag: string; bg: string; rim: string }> = {
        'barracks:a': { icon: 'shieldBan', tag: 'VOUCH', bg: '#7f1d1d', rim: '#f87171' },
        'barracks:b': { icon: 'bot', tag: '@bot', bg: '#0e7490', rim: '#67e8f9' },
        'archer:a': { icon: 'flame', tag: '4.0x', bg: '#991b1b', rim: '#fb923c' },
        'archer:b': { icon: 'scale', tag: 'SNIPE', bg: '#713f12', rim: '#fde047' },
        'mage:a': { icon: 'star', tag: '30s', bg: '#78350f', rim: '#fde047' },
        'mage:b': { icon: 'zap', tag: 'ARC', bg: '#4c1d95', rim: '#e879f9' },
        'artillery:a': { icon: 'bomb', tag: 'YOLO', bg: '#9a3412', rim: '#fb923c' },
        'artillery:b': { icon: 'wind', tag: 'SHOCK', bg: '#854d0e', rim: '#fef08a' },
      };
      const meta = badgeMap[`${tw.type}:${tw.branch}`] ?? {
        icon: 'star' as IconName,
        tag: 'MAX',
        bg: '#581c87',
        rim: '#fde047',
      };
      const bob = Math.sin(engine.time * 4 + tw.id) * 2;
      const topLocalY = (16 - h) * sizeScale;
      const badgeY = Math.max(-tw.y + 14, topLocalY - 22) + bob;
      const badgeFont = 'bold 9.5px monospace';
      const badgeIconSize = 10.5;
      const badgeGap = 3.5;
      ctx.font = badgeFont;
      const badgeW = Math.max(
        56,
        Math.ceil(ctx.measureText(meta.tag).width + badgeIconSize + badgeGap) + 12
      );

      ctx.fillStyle = meta.bg;
      ctx.strokeStyle = meta.rim;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(-badgeW / 2, badgeY, badgeW, 17, 6);
      ctx.fill();
      ctx.stroke();

      this.drawCenteredIconLabel(meta.icon, meta.tag, 0, badgeY + 8.5, {
        iconSize: badgeIconSize,
        iconColor: meta.rim,
        textColor: '#ffffff',
        font: badgeFont,
        gap: badgeGap,
        strokeWidth: 2.5,
        iconFill: meta.icon === 'star' ? meta.rim : undefined,
      });
    }

    ctx.restore();
  }

  private drawTowerLv2Foundation(tw: Tower, engine: GameEngine, sizeScale: number): void {
    const ctx = this.ctx;
    const rx = 38 * sizeScale;
    const ry = 19 * sizeScale;

    // Ornate carved stone curb
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 7, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner stone bevel ring with ashlar joints
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = tw.level === 3 ? '#facc15' : '#eab308';
    ctx.lineWidth = tw.level === 3 ? 2.2 : 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 4.5, rx - 3, ry - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Radial stone block seams
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.55)';
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (rx - 10), 4.5 + Math.sin(a) * (ry - 5));
      ctx.lineTo(Math.cos(a) * (rx - 2), 4.5 + Math.sin(a) * (ry - 1.5));
      ctx.stroke();
    }

    // 4 gleaming golden studs at cardinal points
    const glint = 0.75 + 0.25 * Math.sin(engine.time * 4 + tw.id);
    for (const a of [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5]) {
      ctx.fillStyle = `rgba(254, 240, 138, ${glint})`;
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * (rx - 3.5), 4.5 + Math.sin(a) * (ry - 2.2), 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  private drawTowerLv2Banners(tw: Tower, engine: GameEngine, w: number): void {
    const ctx = this.ctx;
    const flutter = Math.sin(engine.time * 4.8 + tw.id) * 2;
    const bannerFill =
      tw.level === 3
        ? tw.branch === 'a'
          ? '#b91c1c'
          : tw.type === 'barracks'
            ? '#0891b2'
            : tw.type === 'archer' || tw.type === 'artillery'
              ? '#ca8a04'
              : '#7e22ce'
        : '#d97706';

    const offsetX = Math.max(26, w * 0.41);
    for (const side of [-1, 1]) {
      const bx = side * offsetX;
      const by = -4;
      ctx.save();
      ctx.translate(bx, by);
      // Small brass banner pole
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.lineTo(0, -14);
      ctx.stroke();
      // Golden finial ball
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, -15, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Fluttering gold-trimmed swallowtail pennant
      ctx.fillStyle = bannerFill;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(side * 12, -10 + flutter * 0.4);
      ctx.lineTo(side * 9, -5 + flutter * 0.7);
      ctx.lineTo(side * 12, 0 + flutter);
      ctx.lineTo(0, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawTowerLv3GroundAura(tw: Tower, engine: GameEngine, sizeScale: number): void {
    const ctx = this.ctx;
    const t = engine.time;
    const rx = 43 * sizeScale;
    const ry = 21.5 * sizeScale;

    if (tw.type === 'barracks' && tw.branch === 'b') {
      // @bot Scrapers: animated cyan speed-aura ring + expanding buff ripple!
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.9)';
      ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 6, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rotating dashed speed-aura tech ring
      ctx.save();
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 7]);
      ctx.lineDashOffset = -t * 28;
      ctx.beginPath();
      ctx.ellipse(0, 6, rx + 5, ry + 2.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Gentle expanding cyan haste pulse ripple
      const rf = (t * 0.72 + tw.id * 0.23) % 1;
      ctx.strokeStyle = `rgba(34, 211, 238, ${(1 - rf) * 0.42})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 6, rx + rf * 34, ry + rf * 17, 0, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    if (tw.type === 'artillery' && tw.branch === 'a') {
      // YOLO Bomber: orange-amber caution hazard ring
      ctx.fillStyle = 'rgba(249, 115, 22, 0.22)';
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 6, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = t * 18;
      ctx.beginPath();
      ctx.ellipse(0, 6, rx + 4, ry + 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (tw.type === 'artillery' && tw.branch === 'b') {
      // Spin Shockwave: expanding golden acoustic shockwave ground ring
      const sf = (t * 0.85 + tw.id * 0.4) % 1;
      ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 6, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = `rgba(254, 240, 138, ${(1 - sf) * 0.6})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 6, rx + sf * 24, ry + sf * 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }

    // Default signature branch aura rings
    const palette: Record<string, { fill: string; stroke: string }> = {
      'barracks:a': { fill: 'rgba(220, 38, 38, 0.24)', stroke: '#f87171' },
      'archer:a': {
        fill: `rgba(239, 68, 68, ${0.22 + tw.rampStacks * 0.035})`,
        stroke: tw.rampStacks >= 3 ? '#fef08a' : '#f97316',
      },
      'archer:b': { fill: 'rgba(234, 179, 8, 0.22)', stroke: '#fde047' },
      'mage:a': { fill: 'rgba(250, 204, 21, 0.24)', stroke: '#fde047' },
      'mage:b': { fill: 'rgba(168, 85, 247, 0.28)', stroke: '#e879f9' },
    };
    const p = palette[`${tw.type}:${tw.branch}`] ?? {
      fill: 'rgba(168, 85, 247, 0.26)',
      stroke: '#fde047',
    };

    ctx.fillStyle = p.fill;
    ctx.strokeStyle = p.stroke;
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.ellipse(0, 6, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private drawTowerLv3BackOverlay(tw: Tower, engine: GameEngine, _w: number, h: number): void {
    const t = engine.time;
    const topY = 16 - h;

    // Back-half of orbiting cyan @bot drone (barracks B)
    if (tw.type === 'barracks' && tw.branch === 'b') {
      const ang = t * 2.5 + tw.id;
      if (Math.sin(ang) < 0) {
        this.drawBotDrone(Math.cos(ang) * 34, topY + 22 + Math.sin(ang) * 11, t, 0.86);
      }
    }

    // Back-half of orbiting golden stars (mage A)
    if (tw.type === 'mage' && tw.branch === 'a') {
      const orbY = topY + h * 0.16;
      for (let i = 0; i < 3; i++) {
        const ang = t * 2.4 + (i * Math.PI * 2) / 3 + tw.id;
        if (Math.sin(ang) < 0) {
          const sx = Math.cos(ang) * 24;
          const sy = orbY + Math.sin(ang) * 8 + Math.cos(ang * 2) * 2;
          this.drawFivePointStar(sx, sy, 5.2, '#f59e0b', '#78350f');
        }
      }
    }
  }

  private drawTowerLv3FrontOverlay(tw: Tower, engine: GameEngine, w: number, h: number): void {
    const ctx = this.ctx;
    const t = engine.time;
    const topY = 16 - h;

    // 1. BARRACKS A (VOUCHED Knights): crimson ban-shield crest & forged iron trim
    if (tw.type === 'barracks' && tw.branch === 'a') {
      // Forged dark-iron spiked parapet shoulder trim
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.6;
      for (const sx of [-w * 0.38, w * 0.38]) {
        ctx.beginPath();
        ctx.moveTo(sx - 5, topY + h * 0.56);
        ctx.lineTo(sx, topY + h * 0.45);
        ctx.lineTo(sx + 5, topY + h * 0.56);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      // Iron trim bar across battlements
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(-w * 0.42, topY + h * 0.54, w * 0.84, 5, 2);
      ctx.fill();
      ctx.stroke();

      // Prominent crimson VOUCHED ban-shield crest mounted on the front keep!
      const cy = topY + h * 0.65;
      ctx.save();
      ctx.translate(0, cy);
      // Kite shield backing
      ctx.fillStyle = '#991b1b';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-12, -11);
      ctx.lineTo(12, -11);
      ctx.lineTo(11, 3);
      ctx.lineTo(0, 13);
      ctx.lineTo(-11, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Steel rim
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Crisp white prohibition circle + slash
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.arc(0, -1, 6.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4.3, -5.3);
      ctx.lineTo(4.3, 3.3);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // 2. BARRACKS B (@bot Scrapers): glowing cyan bot drone orbiting the roof + antenna beacon
    if (tw.type === 'barracks' && tw.branch === 'b') {
      // Glowing cyan rooftop beacon crystal
      const pulse = 0.65 + 0.35 * Math.sin(t * 7 + tw.id);
      ctx.fillStyle = `rgba(34, 211, 238, ${0.42 * pulse})`;
      ctx.beginPath();
      ctx.arc(0, topY + 6, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#67e8f9';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, topY + 6, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Orbiting track faint ellipse
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, topY + 22, 34, 11, 0, 0, Math.PI);
      ctx.stroke();

      // Front-half of orbiting cyan bot drone
      const ang = t * 2.5 + tw.id;
      if (Math.sin(ang) >= 0) {
        this.drawBotDrone(Math.cos(ang) * 34, topY + 22 + Math.sin(ang) * 11, t, 1.05);
      }
      return;
    }

    // 3. ARCHER A (4.0x Gatling): heated red glow & rapid muzzle flash sparks
    if (tw.type === 'archer' && tw.branch === 'a') {
      const mx = w * 0.34;
      const my = topY + h * 0.19;
      const heat = 0.45 + (tw.rampStacks / 6) * 0.55;
      const heatPulse = 0.78 + 0.22 * Math.sin(t * 14 + tw.id);

      // Glowing red-hot barrel heat aura
      const glow = ctx.createRadialGradient(mx, my, 2, mx, my, 18 + tw.rampStacks * 1.4);
      glow.addColorStop(0, `rgba(254, 202, 202, ${0.72 * heat * heatPulse})`);
      glow.addColorStop(0.45, `rgba(239, 68, 68, ${0.58 * heat})`);
      glow.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(mx, my, 18 + tw.rampStacks * 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Heated red rotary barrel vent stripes
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(mx - 10, my - 4);
      ctx.lineTo(mx + 2, my - 4);
      ctx.moveTo(mx - 10, my + 2);
      ctx.lineTo(mx + 2, my + 2);
      ctx.stroke();

      // Rising subtle heat shimmer sparks
      for (let i = 0; i < 2; i++) {
        const sf = (t * 2.8 + i * 0.5 + tw.id) % 1;
        const sx = mx - 2 + Math.sin(t * 9 + i * 3) * 5;
        const sy = my - 6 - sf * 18;
        ctx.fillStyle = `rgba(251, 146, 60, ${(1 - sf) * 0.85})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.2 * (1 - sf * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      // Rapid comic starburst muzzle flash sparks whenever firing!
      if (tw.recoil > 0.15) {
        const flashR = 8 + tw.recoil * 11;
        ctx.save();
        ctx.translate(mx + 7, my - 1);
        ctx.rotate(tw.shotsFired * 1.1);
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const r = i % 2 === 0 ? flashR : flashR * 0.42;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, flashR * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      return;
    }

    // 4. ARCHER B (Trademark Sniper): golden crosshair scope glint & brass scope
    if (tw.type === 'archer' && tw.branch === 'b') {
      const sx = w * 0.25;
      const sy = topY + h * 0.15;
      const glint = 0.55 + 0.45 * Math.sin(t * 5.2 + tw.id);

      // Mounted golden sniper scope housing
      ctx.fillStyle = '#ca8a04';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(sx - 12, sy - 4, 22, 8, 3);
      ctx.fill();
      ctx.stroke();

      // Golden crosshair scope ring
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(sx + 10, sy, 7.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + 10, sy - 10);
      ctx.lineTo(sx + 10, sy + 10);
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 20, sy);
      ctx.stroke();

      // Gleaming 4-point golden lens glint
      this.drawFourPointStar(sx + 10, sy, 5 + glint * 6.5, '#fef08a');
      this.drawFourPointStar(sx + 10, sy, 2.5 + glint * 3, '#ffffff');
      return;
    }

    // 5. MAGE A (30s Star Funnel): orbiting golden stars around the crystal!
    if (tw.type === 'mage' && tw.branch === 'a') {
      const orbY = topY + h * 0.16;
      const readyStun = tw.shotsFired % 3 === 2;

      // Subtle golden funnel halo ring above orb
      ctx.strokeStyle = readyStun ? '#fef08a' : 'rgba(250, 204, 21, 0.72)';
      ctx.lineWidth = readyStun ? 2.4 : 1.6;
      ctx.beginPath();
      ctx.ellipse(0, orbY - 13, 14, 4.2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Front-half of 3 orbiting golden GitHub stars
      for (let i = 0; i < 3; i++) {
        const ang = t * 2.4 + (i * Math.PI * 2) / 3 + tw.id;
        if (Math.sin(ang) >= 0) {
          const sx = Math.cos(ang) * 24;
          const sy = orbY + Math.sin(ang) * 8 + Math.cos(ang * 2) * 2;
          const r = readyStun ? 7.2 : 6.2;
          this.drawFivePointStar(sx, sy, r, '#fde047', '#78350f');
          // Tiny trailing stardust dot
          const ta = ang - 0.35;
          ctx.fillStyle = 'rgba(254, 240, 138, 0.75)';
          ctx.beginPath();
          ctx.arc(Math.cos(ta) * 24, orbY + Math.sin(ta) * 8, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return;
    }

    // 6. MAGE B (Plaintext Arc): crackling violet Tesla arcs around the spire!
    if (tw.type === 'mage' && tw.branch === 'b') {
      const orbY = topY + h * 0.16;
      const hornY = topY + h * 0.24;
      const hornX = w * 0.34;

      // Twin glowing violet Tesla horn caps
      for (const side of [-1, 1]) {
        ctx.fillStyle = '#e879f9';
        ctx.strokeStyle = '#3b0764';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(side * hornX, hornY, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Quantized ~15fps deterministic crackling Tesla arcs between horns & crystal orb
      const step = Math.floor(t * 15) + tw.id * 13;
      const drawMiniArc = (x1: number, y1: number, x2: number, y2: number, seed: number) => {
        const mx1 = x1 + (x2 - x1) * 0.35 + (hash01(seed) - 0.5) * 11;
        const my1 = y1 + (y2 - y1) * 0.35 + (hash01(seed + 1) - 0.5) * 11;
        const mx2 = x1 + (x2 - x1) * 0.68 + (hash01(seed + 2) - 0.5) * 11;
        const my2 = y1 + (y2 - y1) * 0.68 + (hash01(seed + 3) - 0.5) * 11;

        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 3.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(mx1, my1);
        ctx.lineTo(mx2, my2);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.3;
        ctx.stroke();
      };

      drawMiniArc(-hornX, hornY, 0, orbY, step * 7);
      drawMiniArc(hornX, hornY, 0, orbY, step * 7 + 4);
      if (step % 3 !== 0) {
        drawMiniArc(-hornX, hornY, hornX, hornY - 12, step * 7 + 9);
      }
      return;
    }

    // 7. ARTILLERY A (YOLO Bomber): glowing orange warning embers & triple smoke puffs!
    if (tw.type === 'artillery' && tw.branch === 'a') {
      const mx = w * 0.16;
      const my = topY + h * 0.16;
      const glowPulse = 0.65 + 0.35 * Math.sin(t * 10 + tw.id);

      // Fiery orange barrel mouth glow
      const mg = ctx.createRadialGradient(mx, my, 2, mx, my, 17);
      mg.addColorStop(0, `rgba(254, 215, 170, ${0.85 * glowPulse})`);
      mg.addColorStop(0.5, `rgba(249, 115, 22, ${0.62 * glowPulse})`);
      mg.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(mx, my, 17, 0, Math.PI * 2);
      ctx.fill();

      // Triple staggered smoke puffs rising out of the YOLO mortar!
      for (let p = 0; p < 3; p++) {
        const pf = (t * 1.35 + p * 0.33 + tw.id * 0.2) % 1;
        const px = mx + 4 + pf * 14 + Math.sin(t * 4 + p * 2.1) * 4;
        const py = my - 4 - pf * 26;
        const pr = (4 + pf * 7.5) * (1 + tw.recoil * 0.35);
        ctx.fillStyle = `rgba(71, 85, 105, ${(1 - pf) * 0.62})`;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(251, 146, 60, ${(1 - pf) * 0.35})`;
        ctx.beginPath();
        ctx.arc(px - 1, py + 1, pr * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glowing orange warning embers drifting upward
      for (let e = 0; e < 4; e++) {
        const ef = (t * 1.9 + e * 0.25 + tw.id * 0.17) % 1;
        const ex = mx - 6 + ((e * 7) % 16) + Math.sin(t * 7 + e * 2.4) * 5;
        const ey = my - ef * 32;
        ctx.fillStyle = e % 2 === 0 ? `rgba(251, 146, 60, ${1 - ef})` : `rgba(254, 240, 138, ${1 - ef})`;
        ctx.beginPath();
        ctx.arc(ex, ey, 2.2 * (1 - ef * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    // 8. ARTILLERY B (Spin Shockwave): heavy golden shockwave barrel ring!
    if (tw.type === 'artillery' && tw.branch === 'b') {
      const mx = w * 0.16;
      const my = topY + h * 0.17;
      const pulse = 0.5 + 0.5 * Math.sin(t * 5.8 + tw.id);

      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(-0.68); // aligned perpendicular to the angled mortar mouth

      // Heavy forged gold shockwave collar around muzzle
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 6.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 7.2, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 7.2, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#fef9c3';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, -0.8, 15.5, 6.4, 0, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Expanding golden sonic wave ring lifting off the muzzle
      const wf = (t * 1.45 + tw.id * 0.3) % 1;
      ctx.strokeStyle = `rgba(254, 240, 138, ${(1 - wf) * 0.85})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, -4 - wf * 14, 13 + wf * 9, 5 + wf * 3.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Golden glint on collar rim
      this.drawFourPointStar(-14, 0, 3.5 + pulse * 3, '#fef9c3');
      ctx.restore();
    }
  }

  private drawBotDrone(x: number, y: number, time: number, scale: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y + Math.sin(time * 9) * 1.8);
    ctx.scale(scale, scale);

    // Thruster glow beneath drone
    ctx.fillStyle = 'rgba(34, 211, 238, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 7, 5, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rounded mechanical drone body
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-7.5, -5.5, 15, 11, 4.5);
    ctx.fill();
    ctx.stroke();

    // Glowing cyan visor eyes
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(-4.5, -2, 3.2, 3.2);
    ctx.fillRect(1.3, -2, 3.2, 3.2);

    // Tiny antenna with blinking tip
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, -5.5);
    ctx.lineTo(0, -10);
    ctx.stroke();
    ctx.fillStyle = Math.sin(time * 12) > 0 ? '#fef08a' : '#22d3ee';
    ctx.beginPath();
    ctx.arc(0, -10.5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private computeMeleeLunge(
    lungeTimer: number,
    engaged: boolean,
    attackTimer: number,
    attackCooldown: number
  ): number {
    if (lungeTimer > 0) {
      const p = Math.min(1, lungeTimer / 0.2);
      return Math.sin(p * Math.PI * 0.5);
    }
    if (engaged && attackCooldown > 0 && attackTimer > 0) {
      const sinceStrike = attackCooldown - attackTimer;
      if (sinceStrike >= 0 && sinceStrike < 0.2) {
        const frac = 1 - sinceStrike / 0.2;
        return Math.sin(frac * Math.PI * 0.5);
      }
    }
    return 0;
  }

  private drawMeleeSlashArc(dir: number, radius: number, centerY: number, intensity: number, color: string): void {
    if (intensity < 0.35) return;
    const ctx = this.ctx;
    const alpha = Math.min(1, (intensity - 0.35) / 0.65);
    const sweepScale = 0.92 + (1 - alpha) * 0.22;
    const rOut = radius * sweepScale;
    const rIn = rOut * 0.68;

    ctx.save();
    ctx.globalAlpha = alpha * 0.92;
    ctx.translate(dir * (radius * 0.5), centerY);
    if (dir < 0) ctx.scale(-1, 1);

    // Tapered comic crescent slash silhouette
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, rOut, -Math.PI * 0.42, Math.PI * 0.36);
    ctx.arc(-rOut * 0.24, 0, rIn, Math.PI * 0.32, -Math.PI * 0.38, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hot white inner specular slash edge
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8 * alpha + 0.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(1.2, 0, rOut - 2.2, -Math.PI * 0.32, Math.PI * 0.26);
    ctx.stroke();
    ctx.restore();
  }

  private drawHeroSonicSlash(dir: number, lungeTimer: number, fallbackIntensity: number): void {
    const ctx = this.ctx;
    // Progress 0 at instant of megaphone strike -> 1 as sonic shockwave expands out
    const activeByTimer = lungeTimer > 0.08;
    const progress = activeByTimer
      ? Math.max(0, Math.min(1, 1 - (lungeTimer - 0.08) / 0.16))
      : Math.max(0, Math.min(1, 1 - fallbackIntensity));
    const alpha = activeByTimer ? Math.max(0.25, 1 - progress * 0.72) : Math.min(1, fallbackIntensity);
    const baseR = 26 + progress * 14;

    ctx.save();
    ctx.translate(dir * (18 + progress * 8), -26);
    if (dir < 0) ctx.scale(-1, 1);

    // 1. Punchy tapered comic crescent swipe (crimson -> blazing gold core)
    ctx.save();
    ctx.globalAlpha = alpha * 0.92;
    const cresGrad = ctx.createLinearGradient(0, -baseR, baseR, baseR);
    cresGrad.addColorStop(0, '#fde047');
    cresGrad.addColorStop(0.5, '#f97316');
    cresGrad.addColorStop(1, '#ef4444');
    ctx.fillStyle = cresGrad;
    ctx.strokeStyle = 'rgba(69, 10, 10, 0.75)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, baseR, -Math.PI * 0.44, Math.PI * 0.38);
    ctx.arc(-baseR * 0.28, 0, baseR * 0.72, Math.PI * 0.33, -Math.PI * 0.39, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hot white razor highlight along crescent front
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.4 * alpha;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(1.5, 0, baseR - 2.5, -Math.PI * 0.34, Math.PI * 0.28);
    ctx.stroke();
    ctx.restore();

    // 2. Twin megaphone sonic shockwave arcs radiating outward ("(((")
    for (let w = 0; w < 2; w++) {
      const wr = baseR + 7 + w * 11 + progress * (8 + w * 6);
      const wa = Math.max(0, alpha * (w === 0 ? 0.9 : 0.65));
      ctx.save();
      ctx.globalAlpha = wa;
      ctx.strokeStyle = w === 0 ? '#fef08a' : '#fca5a5';
      ctx.lineWidth = (w === 0 ? 3.2 : 2.1) * alpha + 0.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(2, 0, wr, -Math.PI * 0.31, Math.PI * 0.27);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Comic kinetic burst ticks + impact sparkle star
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    for (const ang of [-0.46, 0.02, 0.42]) {
      const r0 = baseR + 4;
      const r1 = baseR + 13 + progress * 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
      ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
      ctx.stroke();
    }
    this.drawFourPointStar(baseR * 0.92, -baseR * 0.28, 6.5 * alpha, '#ffffff');
    ctx.restore();

    ctx.restore();
  }

  private drawGuardCrescentSlash(
    dir: number,
    radius: number,
    centerY: number,
    lungeTimer: number,
    fallbackIntensity: number,
    variant: Guard['variant']
  ): void {
    const ctx = this.ctx;
    const activeByTimer = lungeTimer > 0.08;
    const progress = activeByTimer
      ? Math.max(0, Math.min(1, 1 - (lungeTimer - 0.08) / 0.14))
      : Math.max(0, Math.min(1, 1 - fallbackIntensity));
    const alpha = activeByTimer ? Math.max(0.28, 1 - progress * 0.68) : Math.min(1, fallbackIntensity);
    const rOut = radius * (0.98 + progress * 0.34);
    const rIn = rOut * 0.62;

    const palette =
      variant === 'vouched'
        ? { outer: '#ef4444', mid: '#fca5a5', spark: '#fef08a' }
        : variant === 'bot'
          ? { outer: '#06b6d4', mid: '#67e8f9', spark: '#ecfeff' }
          : { outer: '#f59e0b', mid: '#fef08a', spark: '#ffffff' };

    ctx.save();
    ctx.translate(dir * (10 + progress * 5), centerY);
    if (dir < 0) ctx.scale(-1, 1);

    // Outer glow arc
    ctx.save();
    ctx.globalAlpha = alpha * 0.45;
    ctx.strokeStyle = palette.outer;
    ctx.lineWidth = 6 * alpha;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, rOut, -Math.PI * 0.42, Math.PI * 0.36);
    ctx.stroke();
    ctx.restore();

    // Snappy filled comic crescent blade arc
    ctx.save();
    ctx.globalAlpha = alpha * 0.95;
    const grad = ctx.createLinearGradient(0, -rOut, rOut, rOut);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.45, palette.mid);
    grad.addColorStop(1, palette.outer);
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(0, 0, rOut, -Math.PI * 0.46, Math.PI * 0.4);
    ctx.arc(-rOut * 0.28, 0, rIn, Math.PI * 0.34, -Math.PI * 0.41, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // White-hot leading razor edge
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.9 * alpha;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(1, 0, rOut - 1.8, -Math.PI * 0.34, Math.PI * 0.28);
    ctx.stroke();

    // Tiny impact glint star + comic speed ticks
    ctx.strokeStyle = palette.spark;
    ctx.lineWidth = 1.4;
    for (const ang of [-0.35, 0.28]) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * (rOut + 2), Math.sin(ang) * (rOut + 2));
      ctx.lineTo(Math.cos(ang) * (rOut + 8), Math.sin(ang) * (rOut + 8));
      ctx.stroke();
    }
    this.drawFourPointStar(rOut * 0.88, -rOut * 0.2, 4.8 * alpha, palette.spark);
    ctx.restore();

    ctx.restore();
  }

  private drawSelectionHalo(radius: number, time: number, isVip: boolean): void {
    const ctx = this.ctx;
    const pulse = 1 + Math.sin(time * 6.5) * 0.05;
    const rx = Math.max(22, radius * 1.44);
    const ry = rx * 0.5;
    const primary = isVip ? '#fef08a' : '#38bdf8';
    const accent = isVip ? '#f59e0b' : '#fde047';
    const fill = isVip ? 'rgba(250, 204, 21, 0.26)' : 'rgba(56, 189, 248, 0.22)';

    ctx.save();
    ctx.translate(0, 4);

    // Soft glowing ground fill
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * pulse, ry * pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rotating dashed outer tactical lock ring
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2.6;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -time * 36;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * pulse, ry * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Crisp inner focus rim
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.84, ry * 0.84, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 4 orbiting diamond reticle markers around perimeter
    for (let i = 0; i < 4; i++) {
      const a = time * 1.8 + (i * Math.PI) / 2;
      const px = Math.cos(a) * rx * pulse;
      const py = Math.sin(a) * ry * pulse;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(px, py - 4);
      ctx.lineTo(px + 3.5, py);
      ctx.lineTo(px, py + 4);
      ctx.lineTo(px - 3.5, py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawSelectionCaret(y: number, time: number, isVip: boolean): void {
    const ctx = this.ctx;
    const bob = Math.sin(time * 8) * 3;
    ctx.save();
    ctx.translate(0, y + bob);
    ctx.fillStyle = isVip ? '#fef08a' : '#38bdf8';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-6, -7);
    ctx.lineTo(6, -7);
    ctx.lineTo(0, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawHero(engine: GameEngine): void {
    const h = engine.hero;
    const ctx = this.ctx;
    const img = assets.get(h.stance === 'vip' ? 'hero-vip' : 'hero-rage');

    ctx.save();
    ctx.translate(h.x, h.y);

    // Escorting VIP sparkle tether + floating hearts & stars when bowing beside a Golden VIP!
    if (h.stance === 'vip' && h.escortingVipId !== null) {
      const vip = engine.vips.find((v) => v.id === h.escortingVipId && !v.fleeing);
      if (vip) {
        const dx = vip.x - h.x;
        const dy = vip.y - h.y;
        ctx.save();
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.5)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -engine.time * 24;
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(dx, dy - 16);
        ctx.stroke();
        ctx.restore();

        // Rising heart & golden star particles floating right between Theo & the Golden VIP
        for (let i = 0; i < 4; i++) {
          const pf = (engine.time * 0.95 + i * 0.25) % 1;
          const px = dx * (0.25 + (i % 3) * 0.25) + Math.sin(engine.time * 4 + i * 2) * 8;
          const py = dy * 0.45 - 24 - pf * 36;
          ctx.save();
          ctx.globalAlpha = Math.sin(pf * Math.PI);
          if (i % 2 === 0) {
            this.drawMiniHeart(px, py, 5.2, '#fb7185');
          } else {
            this.drawFivePointStar(px, py, 5.2, '#fde047', '#854d0e');
          }
          ctx.restore();
        }
      }
    }

    // Ring-light apology halo (authentic studio LED ring-light!)
    if (h.apologyAuraTimer > 0) {
      const r = 34 + Math.sin(engine.time * 10) * 3.5;
      const fade = Math.min(1, h.apologyAuraTimer / 0.8);
      ctx.save();
      ctx.globalAlpha = fade;
      // Soft studio glow behind ring
      const rg = ctx.createRadialGradient(0, -34, r * 0.55, 0, -34, r + 14);
      rg.addColorStop(0, 'rgba(254, 249, 195, 0)');
      rg.addColorStop(0.7, 'rgba(254, 240, 138, 0.45)');
      rg.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(0, -34, r + 14, 0, Math.PI * 2);
      ctx.fill();

      // Double bright LED ring
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.arc(0, -34, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, -34, r, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating studio star glints on ring
      for (let i = 0; i < 4; i++) {
        const a = engine.time * 2.2 + (i * Math.PI) / 2;
        this.drawFourPointStar(Math.cos(a) * r, -34 + Math.sin(a) * r, 6.5, '#ffffff');
      }
      ctx.restore();
    }

    // Stance floor ring (Gold when escorting VIP, Red when raging, Cyan idle)
    if (getRoadTheme(engine.getStage()) === 'furnace') {
      this.drawFurnaceUnitRim(24, 28, -22, h.stance === 'vip' ? 'gold' : 'blue');
    }
    const ringPulse = 1 + Math.sin(engine.time * 5.5) * 0.05;
    ctx.strokeStyle =
      h.stance === 'vip' ? '#facc15' : h.stance === 'rage' ? '#ef4444' : '#38bdf8';
    ctx.fillStyle =
      h.stance === 'vip'
        ? 'rgba(250, 204, 21, 0.28)'
        : h.stance === 'rage'
          ? 'rgba(239, 68, 68, 0.22)'
          : 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(0, 4, 25 * ringPulse, 11.5 * ringPulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const isMoving =
      Math.hypot(h.targetX - h.x, h.targetY - h.y) > 4 ||
      (h.stance === 'vip' && h.escortingVipId !== null);
    const heroLungeTimer = getLungeTimer(h);
    const lunge = this.computeMeleeLunge(heroLungeTimer, h.stance === 'rage', h.attackTimer, 0.76);
    const roadTheme = getRoadTheme(engine.getStage());
    if (isMoving && !engine.paused) {
      this.emitFootDust('hero', h.x, h.y, h.walkPhase, h.facing, roadTheme, false);
    }

    const heroKey: AssetKey = h.stance === 'vip' ? 'hero-vip' : 'hero-rage';
    const heroWalkKey: AssetKey = h.stance === 'vip' ? 'hero-vip-walk' : 'hero-rage-walk';
    const walkFrame = isMoving && lunge < 0.25 ? this.getWalkStripFrame(heroWalkKey, h.walkPhase) : null;
    const stridePulse = isMoving ? Math.abs(Math.sin(h.walkPhase)) : 0;
    const idleBreath = isMoving ? 0 : Math.sin(engine.time * 3.4) * 0.02;
    const walkLean = isMoving ? h.facing * (0.045 + Math.sin(h.walkPhase) * 0.03) : 0;
    const hop = isMoving ? stridePulse * (walkFrame ? 3.2 : 5.5) : 0;
    const runSquashX = isMoving ? 1.03 - stridePulse * 0.055 : 1 - idleBreath * 0.6;
    const runSquashY = isMoving ? 0.97 + stridePulse * 0.06 : 1 + idleBreath;

    ctx.save();
    ctx.translate(h.facing * lunge * 11, -hop - lunge * 2.5);
    ctx.rotate(walkLean + h.facing * lunge * 0.14);
    ctx.scale(runSquashX * (1 + lunge * 0.08), runSquashY * (1 - lunge * 0.04));
    // Flip direction cleanly (hero-rage faces left by default, hero-vip faces right by default)
    const naturalDir = h.stance === 'vip' ? 1 : -1;
    if (h.facing !== naturalDir) ctx.scale(-1, 1);

    if (walkFrame) {
      const refHt = img && img.width > 0 ? (img.height / img.width) * 64 : 76;
      const cellDraw = Math.round(refHt * (256 / 212));
      const footPad = Math.round(cellDraw * (10 / 256));
      const dx = -cellDraw / 2;
      const dy = 8 + footPad - cellDraw;
      ctx.drawImage(
        walkFrame.img,
        walkFrame.sx,
        walkFrame.sy,
        walkFrame.sw,
        walkFrame.sh,
        dx,
        dy,
        cellDraw,
        cellDraw
      );
      if (h.hitFlash > 0.2) {
        this.drawHitFlashOverlay(heroWalkKey, walkFrame.img, dx, dy, cellDraw, cellDraw, h.hitFlash, 0.2, {
          sx: walkFrame.sx,
          sy: walkFrame.sy,
          sw: walkFrame.sw,
          sh: walkFrame.sh,
        });
      }
    } else if (img) {
      const w = 64;
      const ht = (img.height / img.width) * w;
      ctx.drawImage(img, -w / 2, 8 - ht, w, ht);
      if (h.hitFlash > 0.2) {
        this.drawHitFlashOverlay(heroKey, img, -w / 2, 8 - ht, w, ht, h.hitFlash, 0.2);
      }
    } else {
      ctx.fillStyle = h.hitFlash > 0.2 ? '#f8fafc' : '#111827';
      ctx.beginPath();
      ctx.arc(0, -22, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (heroLungeTimer > 0.08 || (lunge > 0.35 && h.stance === 'rage')) {
      this.drawHeroSonicSlash(h.facing, heroLungeTimer, lunge);
    }

    // Hero HP bar + mini XP bar & Lv pill
    this.drawHealthBar(0, -70, 46, h.hp / h.maxHp, '#22c55e');
    const xpRatio = h.level >= 5 ? 1 : Math.min(1, h.xp / Math.max(1, h.nextXp));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(-23, -63, 46, 3);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-23, -63, 46 * xpRatio, 3);

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = h.stance === 'vip' ? '#facc15' : '#475569';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(-27, 11, 54, 15, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = h.stance === 'vip' ? '#fde047' : '#e2e8f0';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`THEO Lv${h.level}`, 0, 18.5);

    ctx.restore();
  }

  private drawGuard(g: Guard, engine: GameEngine): void {
    const ctx = this.ctx;
    const img = assets.get('guard-fan');
    ctx.save();
    ctx.translate(g.x, g.y);

    // Ground shadow
    if (getRoadTheme(engine.getStage()) === 'furnace') {
      this.drawFurnaceUnitRim(15, 18, -14, 'blue');
    }
    ctx.fillStyle = 'rgba(15, 23, 42, 0.36)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 14, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle specialization variant aura ring under Lv.3 / Fan guards
    if (g.variant === 'vouched') {
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.85)';
      ctx.fillStyle = 'rgba(220, 38, 38, 0.2)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 3, 16, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (g.variant === 'bot') {
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.88)';
      ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 3, 15, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (g.variant === 'fan') {
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 3, 14, 6.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const engagedTarget =
      g.engagedEnemyId !== null ? engine.enemies.find((e) => e.id === g.engagedEnemyId) : null;
    const isMoving = engagedTarget
      ? Math.hypot(engagedTarget.x + 16 - g.x, engagedTarget.y - g.y) > 10
      : Math.hypot(g.homeX - g.x, g.homeY - g.y) > 3;
    const inMelee = g.engagedEnemyId !== null && !g.salutingVip && !isMoving;
    const guardLungeTimer = getLungeTimer(g);
    const lunge = this.computeMeleeLunge(guardLungeTimer, inMelee, g.attackTimer, g.attackCooldown);
    const guardMoving = isMoving && !g.salutingVip && lunge < 0.25;
    if (guardMoving && !engine.paused) {
      this.emitFootDust(`g-${g.id}`, g.x, g.y, g.walkPhase, g.facing, getRoadTheme(engine.getStage()), false);
    }
    const walkFrame = guardMoving ? this.getWalkStripFrame('guard-fan-walk', g.walkPhase) : null;
    const stridePulse = guardMoving ? Math.abs(Math.sin(g.walkPhase)) : 0;
    const idleBreath = guardMoving ? 0 : Math.sin(engine.time * 3.8 + g.id) * 0.022;
    const walkLean = guardMoving ? g.facing * (0.04 + Math.sin(g.walkPhase) * 0.03) : 0;
    const hop = guardMoving ? stridePulse * (walkFrame ? 2.4 : 3.8) : 0;
    const runSquashX = guardMoving ? 1.03 - stridePulse * 0.05 : 1 - idleBreath * 0.5;
    const runSquashY = guardMoving ? 0.97 + stridePulse * 0.055 : 1 + idleBreath;

    ctx.save();
    ctx.translate(g.facing * lunge * 9.5, -hop - lunge * 2);
    ctx.rotate(walkLean + g.facing * lunge * 0.15);
    ctx.scale(runSquashX * (1 + lunge * 0.07), runSquashY * (1 - lunge * 0.04));
    if (g.facing > 0) ctx.scale(-1, 1);
    if (g.salutingVip) ctx.rotate(-0.18);

    const w = g.variant === 'vouched' ? 43 : 36;
    if (walkFrame) {
      const refHt = img && img.width > 0 ? (img.height / img.width) * w : w;
      const cellDraw = Math.round(refHt * (256 / 212));
      const footPad = Math.round(cellDraw * (10 / 256));
      const dx = -cellDraw / 2;
      const dy = 5 + footPad - cellDraw;
      ctx.drawImage(
        walkFrame.img,
        walkFrame.sx,
        walkFrame.sy,
        walkFrame.sw,
        walkFrame.sh,
        dx,
        dy,
        cellDraw,
        cellDraw
      );
      if (g.hitFlash > 0.25) {
        this.drawHitFlashOverlay('guard-fan-walk', walkFrame.img, dx, dy, cellDraw, cellDraw, g.hitFlash, 0.25, {
          sx: walkFrame.sx,
          sy: walkFrame.sy,
          sw: walkFrame.sw,
          sh: walkFrame.sh,
        });
      }
    } else if (img) {
      const h = (img.height / img.width) * w;
      ctx.drawImage(img, -w / 2, 5 - h, w, h);
      if (g.hitFlash > 0.25) {
        this.drawHitFlashOverlay('guard-fan', img, -w / 2, 5 - h, w, h, g.hitFlash, 0.25);
      }
    } else {
      ctx.fillStyle = g.hitFlash > 0.25 ? '#f8fafc' : '#4c1d95';
      ctx.beginPath();
      ctx.arc(0, -12, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (guardLungeTimer > 0.08 || lunge > 0.42) {
      this.drawGuardCrescentSlash(g.facing, 17, -16, guardLungeTimer, lunge, g.variant);
    }

    // Tiny bot visor glint above @bot Scraper guards
    if (g.variant === 'bot' && !g.salutingVip) {
      this.drawFourPointStar(0, -37 + Math.sin(engine.time * 7 + g.id) * 1.5, 4, '#67e8f9');
    }

    if (g.salutingVip) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-12, -54.5, 24, 21, 7.5);
      ctx.fill();
      ctx.stroke();
      drawCanvasIcon(ctx, 'userCheck', 0, -44, 15, '#fde047', 2.4);
    } else if (g.hp < g.maxHp) {
      this.drawHealthBar(0, -41, 26, g.hp / g.maxHp, g.variant === 'vouched' ? '#f87171' : '#38bdf8');
    }

    ctx.restore();
  }

  private drawVip(v: VipUnit, engine: GameEngine, isSelected: boolean): void {
    const ctx = this.ctx;
    const img = assets.get('vip-exec');
    const t = engine.time;

    ctx.save();
    ctx.translate(v.x, v.y);

    const isFurnace = getRoadTheme(engine.getStage()) === 'furnace';

    // Stage 3: Warm golden midnight rim bounce so Golden VIP & red carpet pop vividly on dark obsidian
    if (isFurnace && !v.fleeing) {
      this.drawFurnaceUnitRim(24, 28, -22, 'gold');
    }

    // Animated selection halo when player taps VIP to inspect
    if (isSelected) {
      this.drawSelectionHalo(22, t, true);
    }

    // Radiant golden spotlight cone descending onto active Golden VIP
    if (!v.fleeing) {
      const cone = ctx.createLinearGradient(0, -120, 0, 12);
      cone.addColorStop(0, 'rgba(254, 240, 138, 0)');
      cone.addColorStop(0.55, v.escortedByHero ? 'rgba(254, 240, 138, 0.22)' : 'rgba(250, 204, 21, 0.13)');
      cone.addColorStop(1, v.escortedByHero ? 'rgba(250, 204, 21, 0.3)' : 'rgba(250, 204, 21, 0.18)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(-14, -115);
      ctx.lineTo(14, -115);
      ctx.lineTo(32, 10);
      ctx.lineTo(-32, 10);
      ctx.closePath();
      ctx.fill();
    }

    // Plush Sparkling Red Carpet + Gold Fringe + Heart/Star Particles when Lord Theo escorts!
    if (v.escortedByHero && !v.fleeing) {
      ctx.save();
      if (isFurnace) {
        const carpetGlow = ctx.createRadialGradient(0, 5, 10, 0, 5, 68);
        carpetGlow.addColorStop(0, 'rgba(250, 204, 21, 0.32)');
        carpetGlow.addColorStop(0.55, 'rgba(239, 68, 68, 0.24)');
        carpetGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = carpetGlow;
        ctx.beginPath();
        ctx.ellipse(0, 5, 68, 28, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Carpet drop shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.beginPath();
      ctx.roundRect(-48, -3, 96, 22, 5);
      ctx.fill();

      // Golden fringe tassels on left & right ends
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      for (let f = -4; f <= 12; f += 4) {
        ctx.beginPath();
        ctx.moveTo(-53, f);
        ctx.lineTo(-47, f);
        ctx.moveTo(47, f);
        ctx.lineTo(53, f);
        ctx.stroke();
      }

      // Plush crimson velvet runner
      const rGrad = ctx.createLinearGradient(0, -6, 0, 15);
      rGrad.addColorStop(0, '#ef4444');
      rGrad.addColorStop(0.5, '#b91c1c');
      rGrad.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = rGrad;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(-47, -6, 94, 21, 4);
      ctx.fill();
      ctx.stroke();

      // Inner gilded edge stripes
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.78)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-43, -2);
      ctx.lineTo(43, -2);
      ctx.moveTo(-43, 11);
      ctx.lineTo(43, 11);
      ctx.stroke();

      // Animated travelling gold shimmer sweep across the carpet
      const sweepX = -42 + ((t * 68 + v.id * 23) % 84);
      ctx.fillStyle = 'rgba(254, 249, 195, 0.35)';
      ctx.beginPath();
      ctx.moveTo(sweepX - 6, -5);
      ctx.lineTo(sweepX + 4, -5);
      ctx.lineTo(sweepX - 2, 14);
      ctx.lineTo(sweepX - 12, 14);
      ctx.closePath();
      ctx.fill();

      // Twinkling carpet sparkles
      for (let s = 0; s < 4; s++) {
        const sp = Math.max(0, Math.sin(t * 7 + s * 1.8));
        if (sp < 0.25) continue;
        const sx = -34 + s * 22;
        const sy = s % 2 === 0 ? -4 : 12;
        this.drawFourPointStar(sx, sy, 3.2 + sp * 3.5, '#fef9c3');
      }
      ctx.restore();
    }

    // Golden VIP spotlight floor ring!
    const ringPulse = 1 + Math.sin(t * 6 + v.id) * 0.06;
    ctx.strokeStyle = v.fleeing ? '#ef4444' : '#facc15';
    ctx.fillStyle = v.fleeing ? 'rgba(239, 68, 68, 0.22)' : 'rgba(250, 204, 21, 0.28)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 4, 23 * ringPulse, 10.5 * ringPulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const vipDir = v.fleeing ? -1 : (v.facing ?? 1);
    if (!engine.paused) {
      this.emitFootDust(`v-${v.id}`, v.x, v.y, v.walkPhase, vipDir, getRoadTheme(engine.getStage()), v.fleeing);
    }
    const walkFrame = this.getWalkStripFrame('vip-exec-walk', v.walkPhase);
    const stridePulse = Math.abs(Math.sin(v.walkPhase));
    const hop = stridePulse * (walkFrame ? (v.fleeing ? 4.2 : 2.5) : 4.2);
    const vipLean = vipDir * (v.fleeing ? 0.075 : 0.025) + Math.sin(v.walkPhase) * (v.fleeing ? 0.045 : 0.025);
    const runSquashX = 1.028 - stridePulse * 0.05;
    const runSquashY = 0.972 + stridePulse * 0.055;
    ctx.save();
    ctx.translate(0, -hop);
    ctx.rotate(vipLean);
    ctx.scale(runSquashX, runSquashY);
    if (vipDir < 0) ctx.scale(-1, 1);
    if (walkFrame) {
      const refHt = img && img.width > 0 ? (img.height / img.width) * 54 : 68;
      const cellDraw = Math.round(refHt * (256 / 212));
      const footPad = Math.round(cellDraw * (10 / 256));
      ctx.drawImage(
        walkFrame.img,
        walkFrame.sx,
        walkFrame.sy,
        walkFrame.sw,
        walkFrame.sh,
        -cellDraw / 2,
        6 + footPad - cellDraw,
        cellDraw,
        cellDraw
      );
    } else if (img) {
      const w = 54;
      const h = (img.height / img.width) * w;
      ctx.drawImage(img, -w / 2, 6 - h, w, h);
    } else {
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(0, -18, 15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Floating heart & golden star particles shimmering around escorted VIP
    if (v.escortedByHero && !v.fleeing) {
      for (let i = 0; i < 3; i++) {
        const pf = (t * 0.85 + i * 0.33 + v.id) % 1;
        const px = Math.cos(i * 2.1 + t * 2.5) * 26;
        const py = -16 - pf * 42;
        ctx.save();
        ctx.globalAlpha = Math.sin(pf * Math.PI);
        if (i === 1) {
          this.drawMiniHeart(px, py, 5, '#fb7185');
        } else {
          this.drawFivePointStar(px, py, 5, '#fde047', '#854d0e');
        }
        ctx.restore();
      }
    }

    // VIP payout tag (auto-sized for all 18 languages)
    const vipTagText = v.fleeing
      ? translate(engine.lang, 'canvas.run')
      : v.escortedByHero
        ? translate(engine.lang, 'canvas.vip2x')
        : translate(engine.lang, 'canvas.vip');
    const vipTagIcon: IconName = v.fleeing
      ? 'alertTriangle'
      : v.escortedByHero
        ? 'crown'
        : 'briefcase';
    const vipFont = 'bold 10px system-ui, -apple-system, sans-serif';
    const vipIconSize = 11;
    const vipGap = 4;
    ctx.font = vipFont;
    const vipTagW = Math.max(
      58,
      Math.min(138, Math.ceil(ctx.measureText(vipTagText).width + vipIconSize + vipGap) + 14)
    );
    ctx.fillStyle = v.fleeing ? '#991b1b' : v.escortedByHero ? '#a16207' : '#854d0e';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-vipTagW / 2, -68, vipTagW, 17, 6);
    ctx.fill();
    ctx.stroke();
    this.drawCenteredIconLabel(vipTagIcon, vipTagText, 0, -59.5, {
      iconSize: vipIconSize,
      iconColor: '#fde047',
      textColor: '#fef08a',
      font: vipFont,
      gap: vipGap,
      strokeWidth: 2.2,
      maxTextWidth: vipTagW - vipIconSize - vipGap - 10,
    });

    if (isSelected) {
      this.drawSelectionCaret(-74, t, true);
    }

    ctx.restore();
  }

  private drawEnemy(e: Enemy, engine: GameEngine, isSelected: boolean): void {
    const ctx = this.ctx;
    const key = `enemy-${e.kind}` as AssetKey;
    const img = assets.get(key);
    const t = engine.time;

    ctx.save();
    ctx.translate(e.x, e.y);

    // Animated selection halo when player taps Enemy to inspect
    if (isSelected) {
      this.drawSelectionHalo(e.radius, t, false);
    }

    // Stage 3: Subtle dark-blue rim light behind every chibi enemy so outlines pop crisply on obsidian road
    if (getRoadTheme(engine.getStage()) === 'furnace') {
      this.drawFurnaceUnitRim(
        e.radius * (e.isBoss ? 1.15 : 1.05),
        e.radius * (e.isBoss ? 1.35 : 1.18),
        e.isBoss ? -34 : -18,
        'blue'
      );
    }

    // Ground shadow
    ctx.fillStyle = e.isBoss ? 'rgba(15, 23, 42, 0.5)' : 'rgba(15, 23, 42, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 4, e.radius * 0.98, e.radius * 0.49, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boss sovereign EU-star aura ring
    if (e.isBoss) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.85)';
      ctx.fillStyle = 'rgba(30, 64, 175, 0.24)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, 4, e.radius * 1.24, e.radius * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      for (let i = 0; i < 6; i++) {
        const a = t * 1.1 + (i * Math.PI * 2) / 6;
        const sx = Math.cos(a) * e.radius * 1.24;
        const sy = 4 + Math.sin(a) * e.radius * 0.62;
        this.drawFivePointStar(sx, sy, 4.2, '#fde047', '#1e3a8a');
      }
    }

    // Enraged / slow status rings
    if (e.enraged) {
      const rp = 1 + Math.sin(t * 12 + e.id) * 0.08;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.92)';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 4, e.radius * 1.2 * rp, e.radius * 0.62 * rp, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rising fiery rage embers around enraged enemy
      for (let f = 0; f < 3; f++) {
        const ff = (t * 2.1 + f * 0.33 + e.id * 0.2) % 1;
        const fx = Math.cos(f * 2.2 + e.id) * e.radius * 0.85;
        const fy = -6 - ff * 32;
        ctx.fillStyle = f % 2 === 0 ? `rgba(239, 68, 68, ${1 - ff})` : `rgba(251, 146, 60, ${1 - ff})`;
        ctx.beginPath();
        ctx.arc(fx, fy, 2.6 * (1 - ff * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (e.slowTimer > 0) {
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.9)';
      ctx.fillStyle = 'rgba(168, 85, 247, 0.16)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.ellipse(0, 4, e.radius * 1.12, e.radius * 0.56, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const isMelee = e.engagedByGuardId !== null || e.engagedByHero;
    const isMoving = e.stunTimer <= 0 && !isMelee;
    let meleeDir = 1;
    if (e.engagedByHero && engine.hero.alive) {
      meleeDir = engine.hero.x >= e.x ? 1 : -1;
    } else if (e.engagedByGuardId !== null) {
      const gd = engine.guards.find((g) => g.id === e.engagedByGuardId && g.alive);
      if (gd) meleeDir = gd.x >= e.x ? 1 : -1;
    }
    const attackCd = e.engagedByHero ? 1.0 : 1.05;
    const lunge = this.computeMeleeLunge(getLungeTimer(e), isMelee && e.stunTimer <= 0, e.attackTimer, attackCd);
    const unitFacing = isMelee ? meleeDir : (e.facing ?? 1);
    if (isMoving && !engine.paused) {
      this.emitFootDust(
        `e-${e.id}`,
        e.x,
        e.y,
        e.walkPhase,
        unitFacing,
        getRoadTheme(engine.getStage()),
        e.isBoss
      );
    }
    const walkKey = `enemy-${e.kind}-walk` as AssetKey;
    const walkFrame = isMoving ? this.getWalkStripFrame(walkKey, e.walkPhase) : null;
    const stridePulse = isMoving ? Math.abs(Math.sin(e.walkPhase)) : 0;
    const idleBreath = isMoving ? 0 : Math.sin(t * 3.4 + e.id) * 0.018;
    const baseForwardLean = isMoving ? unitFacing * (e.kind === 'fork' ? 0.07 : e.isBoss ? 0.025 : 0.04) : 0;
    const walkLean = baseForwardLean + (isMoving ? Math.sin(e.walkPhase) * (e.isBoss ? 0.025 : 0.035) : 0);
    const hop = isMoving
      ? stridePulse * (walkFrame ? (e.isBoss ? 2.2 : e.kind === 'fork' ? 4.2 : 2.8) : e.isBoss ? 3 : 5)
      : 0;
    const hitSquash = e.hitFlash > 0.3 ? 1 + (e.hitFlash - 0.3) * 0.14 : 1;
    const runSquashX = isMoving ? (e.isBoss ? 1.035 : 1.03) - stridePulse * 0.055 : 1 - idleBreath * 0.5;
    const runSquashY = isMoving ? (e.isBoss ? 0.965 : 0.97) + stridePulse * 0.06 : 1 + idleBreath;

    ctx.save();
    ctx.translate(meleeDir * lunge * (e.isBoss ? 12 : 8.5), -hop - lunge * 2);
    ctx.rotate(walkLean + meleeDir * lunge * (e.isBoss ? 0.1 : 0.15));
    ctx.scale(
      runSquashX * hitSquash * (1 + lunge * 0.06),
      runSquashY * (1 / hitSquash) * (1 - lunge * 0.03)
    );
    if (unitFacing < 0) ctx.scale(-1, 1);

    const spriteW = e.isBoss ? 92 : e.kind === 'auditor' || e.kind === 'veteran' ? 54 : 46;
    if (walkFrame) {
      const refHt = img && img.width > 0 ? (img.height / img.width) * spriteW : spriteW * 1.15;
      const cellDraw = Math.round(refHt * (256 / 212));
      const footPad = Math.round(cellDraw * (10 / 256));
      const dx = -cellDraw / 2;
      const dy = 7 + footPad - cellDraw;
      ctx.drawImage(
        walkFrame.img,
        walkFrame.sx,
        walkFrame.sy,
        walkFrame.sw,
        walkFrame.sh,
        dx,
        dy,
        cellDraw,
        cellDraw
      );
      if (e.hitFlash > 0.25) {
        this.drawHitFlashOverlay(walkKey, walkFrame.img, dx, dy, cellDraw, cellDraw, e.hitFlash, 0.25, {
          sx: walkFrame.sx,
          sy: walkFrame.sy,
          sw: walkFrame.sw,
          sh: walkFrame.sh,
        });
      }
    } else if (img) {
      const h = (img.height / img.width) * spriteW;
      ctx.drawImage(img, -spriteW / 2, 7 - h, spriteW, h);
      if (e.hitFlash > 0.25) {
        this.drawHitFlashOverlay(key, img, -spriteW / 2, 7 - h, spriteW, h, e.hitFlash, 0.25);
      }
    } else {
      ctx.fillStyle = e.hitFlash > 0.25 ? '#ffffff' : e.isBoss ? '#1d4ed8' : '#0f766e';
      ctx.beginPath();
      ctx.arc(0, -18, e.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (lunge > 0.45) {
      this.drawMeleeSlashArc(meleeDir, e.isBoss ? 26 : 16, e.isBoss ? -34 : -18, lunge, e.isBoss ? '#fde047' : '#fb923c');
    }

    // Clean HP bar + crisp vector Armor / MR / Rage status readability
    const barY = e.isBoss ? -98 : -58;
    const barW = e.isBoss ? 74 : 36;
    const hpColor = e.isBoss ? '#3b82f6' : e.enraged ? '#f97316' : '#ef4444';
    this.drawHealthBar(0, barY, barW, Math.max(0, e.hp / e.maxHp), hpColor);

    // Physical Armor shield badge (left of HP bar)
    if (e.armor >= 0.3) {
      this.drawMiniArmorBadge(-barW / 2 - 8, barY + 3, e.armor >= 0.5);
    }
    // Magic Resist arcane diamond badge (right of HP bar)
    if (e.magicResist >= 0.25) {
      this.drawMiniMrBadge(barW / 2 + 8, barY + 3, e.magicResist >= 0.5);
    }
    // Enraged crimson anger pip (above HP bar, auto-sized for all 18 languages)
    if (e.enraged) {
      const rageLabel = translate(engine.lang, 'canvas.rage');
      const rageFont = '900 8.5px system-ui, -apple-system, sans-serif';
      ctx.save();
      ctx.font = rageFont;
      const rageW = Math.max(28, Math.min(92, Math.ceil(ctx.measureText(rageLabel).width) + 10));
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.roundRect(-rageW / 2, barY - 14, rageW, 12, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rageLabel, 0, barY - 8, rageW - 6);
      ctx.restore();
    }

    // Orbiting dizzy golden stars when stunned!
    if (e.stunTimer > 0) {
      const syBase = barY - (e.enraged ? 20 : 10);
      for (let i = 0; i < 3; i++) {
        const a = t * 6.2 + (i * Math.PI * 2) / 3;
        const sx = Math.cos(a) * 14;
        const sy = syBase + Math.sin(a) * 4.5;
        this.drawFivePointStar(sx, sy, 4.2, '#fde047', '#713f12');
      }
    }

    if (isSelected) {
      const caretY = barY - (e.enraged || e.stunTimer > 0 ? 22 : 8);
      this.drawSelectionCaret(caretY, t, false);
    }

    ctx.restore();
  }

  private drawMiniArmorBadge(x: number, y: number, heavy: boolean): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = heavy ? '#cbd5e1' : '#94a3b8';
    ctx.strokeStyle = heavy ? '#facc15' : '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-5, -5.5);
    ctx.lineTo(5, -5.5);
    ctx.lineTo(4.6, 1.2);
    ctx.lineTo(0, 6);
    ctx.lineTo(-4.6, 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Shield specular highlight
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2.5, -3.5, 2, 3.5);
    ctx.restore();
  }

  private drawMiniMrBadge(x: number, y: number, heavy: boolean): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = heavy ? '#34d399' : '#a78bfa';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(5.2, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-5.2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Inner bright core
    ctx.fillStyle = '#ecfdf5';
    ctx.beginPath();
    ctx.arc(0, 0, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawSuctionBeams(engine: GameEngine): void {
    const ctx = this.ctx;
    const stage = engine.getStage();
    const isFurnace = getRoadTheme(stage) === 'furnace';
    const signPos = stage.castleSignPos;
    for (const b of engine.suctionBeams) {
      const alpha = Math.min(1, b.life / 0.45);
      ctx.save();
      ctx.globalAlpha = alpha;
      const sx = signPos.x;
      const sy = signPos.y - 4;
      const mx = (sx + b.targetX) * 0.5;
      const my = Math.min(sy, b.targetY) - 68;

      // Stage 3: Electric midnight bloom aura behind purple/gold suction beam
      if (isFurnace) {
        ctx.strokeStyle = b.isVip ? 'rgba(250, 204, 21, 0.24)' : 'rgba(217, 70, 239, 0.28)';
        ctx.lineWidth = 22;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(mx, my, b.targetX, b.targetY);
        ctx.stroke();
      }

      // Soft outer vacuum energy glow
      ctx.strokeStyle = b.isVip ? 'rgba(250, 204, 21, 0.35)' : 'rgba(192, 132, 252, 0.38)';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx, my, b.targetX, b.targetY);
      ctx.stroke();

      // Core hose stream
      ctx.strokeStyle = b.isVip ? '#facc15' : '#c084fc';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx, my, b.targetX, b.targetY);
      ctx.stroke();

      // Animated data pulse dots racing toward castle manifold
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([7, 11]);
      ctx.lineDashOffset = engine.time * 115;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx, my, b.targetX, b.targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Flowing telemetry orbs traveling along quadratic curve from target -> castle
      for (let i = 0; i < 3; i++) {
        const u = (engine.time * 1.9 + i * 0.33) % 1;
        // u=0 at target, u=1 at castle
        const inv = 1 - u;
        const px = inv * inv * b.targetX + 2 * inv * u * mx + u * u * sx;
        const py = inv * inv * b.targetY + 2 * inv * u * my + u * u * sy;
        ctx.fillStyle = b.isVip ? '#fef08a' : '#f5d0fe';
        ctx.beginPath();
        ctx.arc(px, py, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Suction ring on victim
      ctx.strokeStyle = b.isVip ? '#fde047' : '#e879f9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.targetX, b.targetY, 10 + Math.sin(engine.time * 16) * 2.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawSniperSightlines(engine: GameEngine): void {
    const ctx = this.ctx;
    for (const tw of engine.towers) {
      if (tw.type !== 'archer' || tw.level !== 3 || tw.branch !== 'b') continue;
      const stat = getTowerStat(tw.type, tw.level, tw.branch);
      const prio = tw.targetPriority ?? 'first';
      // Match sniper's exact targeting priority (first / strong / weak) within range
      let best: Enemy | null = null;
      for (const e of engine.enemies) {
        if (Math.hypot(e.x - tw.x, e.y - tw.y) > stat.range) continue;
        if (!best) {
          best = e;
          continue;
        }
        if (prio === 'strong') {
          if (e.hp > best.hp || (e.hp === best.hp && e.dist > best.dist)) best = e;
        } else if (prio === 'weak') {
          if (e.hp < best.hp || (e.hp === best.hp && e.dist > best.dist)) best = e;
        } else if (e.dist > best.dist) {
          best = e;
        }
      }
      if (!best) continue;

      const sx = tw.x + 18;
      const sy = tw.y - 84;
      const tx = best.x;
      const ty = best.y - (best.isBoss ? 32 : 16);

      ctx.save();
      // Subtle shimmering gold laser aiming lock-on line
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.38)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -engine.time * 32;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tiny golden target reticle pip locked onto enemy
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(tx, ty, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(tx, ty, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private evalProjectilePos(p: Projectile, tNorm: number): Vec2 {
    const t = Math.max(0, Math.min(1, tNorm));
    return {
      x: p.startX + (p.targetX - p.startX) * t,
      y: p.startY + (p.targetY - p.startY) * t - Math.sin(t * Math.PI) * p.arcHeight,
    };
  }

  private drawProjectiles(engine: GameEngine): void {
    const ctx = this.ctx;
    for (const p of engine.projectiles) {
      if (p.progress < 0) continue;
      const tCur = Math.min(1, p.progress);
      ctx.save();

      if (p.kind === 'mortar' || p.kind === 'yolo') {
        // Dynamic ground shadow under parabolic shell (scales with height)
        const gx = p.startX + (p.targetX - p.startX) * tCur;
        const gy = p.startY + (p.targetY - p.startY) * tCur;
        const altitudeFrac = Math.sin(tCur * Math.PI);
        const shadowScale = 1.15 - altitudeFrac * 0.45;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
        ctx.beginPath();
        ctx.ellipse(gx, gy, 9 * shadowScale, 4.5 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Subtle landing warning ring as shell descends
        if (tCur > 0.55) {
          const warnA = ((tCur - 0.55) / 0.45) * 0.45;
          ctx.strokeStyle = p.kind === 'yolo' ? `rgba(251, 146, 60, ${warnA})` : `rgba(239, 68, 68, ${warnA})`;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(p.targetX, p.targetY, p.splashRadius * 0.45, p.splashRadius * 0.24, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Analytical cartoon smoke puff trail along the parabolic arc!
        for (let k = 5; k >= 1; k--) {
          const tTrail = tCur - k * 0.055;
          if (tTrail <= 0) continue;
          const pt = this.evalProjectilePos(p, tTrail);
          const puffAlpha = (1 - k / 6) * 0.56;
          const puffR = (p.kind === 'yolo' ? 3.8 : 4.2) + k * 1.35;
          ctx.fillStyle =
            p.kind === 'yolo'
              ? k <= 2
                ? `rgba(251, 146, 60, ${puffAlpha})`
                : `rgba(100, 116, 139, ${puffAlpha * 0.85})`
              : `rgba(203, 213, 225, ${puffAlpha})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, puffR, 0, Math.PI * 2);
          ctx.fill();
        }

        // Bomb body with dark outline, specular glint & sparking fuse
        const r = p.kind === 'yolo' ? 7 : 8.5;
        ctx.fillStyle = p.kind === 'yolo' ? '#ea580c' : '#1e293b';
        ctx.strokeStyle = p.kind === 'yolo' ? '#fef08a' : '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Specular shine on bomb
        ctx.fillStyle = p.kind === 'yolo' ? '#fed7aa' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(p.x - r * 0.3, p.y - r * 0.3, r * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Sparking lit fuse tip
        this.drawFourPointStar(p.x + r * 0.55, p.y - r * 0.75, 5, '#fef08a');
      } else if (p.kind === 'magic') {
        const isStarShot = Boolean(p.stunDuration);
        // Purple / golden magic orb trail ribbon
        for (let k = 5; k >= 1; k--) {
          const tTrail = tCur - k * 0.06;
          if (tTrail <= 0) continue;
          const pt = this.evalProjectilePos(p, tTrail);
          const a = (1 - k / 6) * 0.65;
          const tr = (isStarShot ? 5.2 : 4.8) * (1 - k * 0.13);
          ctx.fillStyle = isStarShot ? `rgba(250, 204, 21, ${a})` : `rgba(217, 70, 239, ${a})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, tr, 0, Math.PI * 2);
          ctx.fill();
        }

        if (isStarShot) {
          // 30s Star Funnel golden stun+siphon star projectile!
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(engine.time * 12);
          this.drawFivePointStar(0, 0, 8.5, '#fde047', '#78350f');
          ctx.restore();
        } else {
          // Outer soft magenta glow + glowing arcane orb core
          ctx.fillStyle = 'rgba(217, 70, 239, 0.32)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#e879f9';
          ctx.strokeStyle = '#581c87';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.x - 1.5, p.y - 1.5, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (p.kind === 'sniper') {
        // Crisp gold laser tracer line from muzzle to sniper round!
        const outerW = p.crit ? 6.5 : 4.2;
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
        ctx.lineWidth = outerW + 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.startX, p.startY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = outerW;
        ctx.beginPath();
        ctx.moveTo(p.startX, p.startY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = p.crit ? 2.4 : 1.5;
        ctx.beginPath();
        ctx.moveTo(p.startX, p.startY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Blazing golden sniper round head
        this.drawFourPointStar(p.x, p.y, p.crit ? 11 : 8, '#fef08a');
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.crit ? 4.2 : 3.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Hot-Take Tweet Bolt (arrow) with directional cyan/gold motion streak & sparks!
        const prevPt = this.evalProjectilePos(p, Math.max(0, tCur - 0.14));
        const ang = Math.atan2(p.y - prevPt.y, p.x - prevPt.x);

        // Motion trail streak
        const trailGrad = ctx.createLinearGradient(prevPt.x, prevPt.y, p.x, p.y);
        trailGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        trailGrad.addColorStop(1, 'rgba(125, 211, 252, 0.85)');
        ctx.strokeStyle = trailGrad;
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(prevPt.x, prevPt.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Trailing tweet sparks
        for (let k = 1; k <= 2; k++) {
          const sp = this.evalProjectilePos(p, Math.max(0, tCur - k * 0.08));
          ctx.fillStyle = k === 1 ? '#fef08a' : '#7dd3fc';
          ctx.beginPath();
          ctx.arc(sp.x + (k === 1 ? 2 : -2), sp.y - 1.5, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Crisp oriented dart bolt
        ctx.translate(p.x, p.y);
        ctx.rotate(ang);
        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(-4, -3.6);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-4, 3.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawLaserTracers(): void {
    const ctx = this.ctx;
    for (const tr of this.laserTracers) {
      const a = Math.max(0, tr.life / tr.maxLife);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.lineCap = 'round';

      ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
      ctx.lineWidth = (tr.crit ? 8 : 5) * a;
      ctx.beginPath();
      ctx.moveTo(tr.x1, tr.y1);
      ctx.lineTo(tr.x2, tr.y2);
      ctx.stroke();

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = (tr.crit ? 3.5 : 2.2) * a;
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = (tr.crit ? 1.6 : 1) * a;
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawLightning(engine: GameEngine): void {
    const ctx = this.ctx;
    for (const arc of engine.lightningArcs) {
      const a = arc.life / arc.maxLife;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Build jagged polyline once so outer glow, mid arc, and white core match cleanly
      const poly: Vec2[] = [];
      arc.points.forEach((pt, idx) => {
        if (idx === 0) {
          poly.push(pt);
        } else {
          const prev = arc.points[idx - 1];
          const mx1 = prev.x + (pt.x - prev.x) * 0.35 + (Math.random() - 0.5) * 16;
          const my1 = prev.y + (pt.y - prev.y) * 0.35 + (Math.random() - 0.5) * 16;
          const mx2 = prev.x + (pt.x - prev.x) * 0.7 + (Math.random() - 0.5) * 16;
          const my2 = prev.y + (pt.y - prev.y) * 0.7 + (Math.random() - 0.5) * 16;
          poly.push({ x: mx1, y: my1 }, { x: mx2, y: my2 }, pt);
        }
      });

      const tracePoly = () => {
        ctx.beginPath();
        poly.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      };

      ctx.strokeStyle = 'rgba(192, 132, 252, 0.38)';
      ctx.lineWidth = 10;
      tracePoly();

      ctx.strokeStyle = arc.color;
      ctx.lineWidth = 4.6;
      tracePoly();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.9;
      tracePoly();

      // Electric node flash bursts at each jump target
      for (let i = 1; i < arc.points.length; i++) {
        const node = arc.points[i];
        this.drawFourPointStar(node.x, node.y, 11 * a, '#f5d0fe');
      }
      ctx.restore();
    }
  }

  private drawFallingDeletes(engine: GameEngine): void {
    const ctx = this.ctx;
    const isFurnace = getRoadTheme(engine.getStage()) === 'furnace';
    for (const d of engine.fallingDeletes) {
      ctx.save();
      if (!d.impacted) {
        const frac = Math.min(1, d.elapsed / d.impactTime);
        if (isFurnace) {
          // Extra electric crimson bloom halo on Stage 3 obsidian stone
          const cGlow = ctx.createRadialGradient(d.x, d.y, 10, d.x, d.y, d.radius * 1.25);
          cGlow.addColorStop(0, `rgba(248, 113, 113, ${0.22 + frac * 0.26})`);
          cGlow.addColorStop(0.6, `rgba(220, 38, 38, ${0.12 + frac * 0.16})`);
          cGlow.addColorStop(1, 'rgba(220, 38, 38, 0)');
          ctx.fillStyle = cGlow;
          ctx.beginPath();
          ctx.ellipse(d.x, d.y, d.radius * 1.25, d.radius * 0.72, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // Pulsing crimson landing target zone + converging crosshair ring
        ctx.fillStyle = `rgba(239, 68, 68, ${0.14 + frac * 0.32})`;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, d.radius * frac, d.radius * 0.55 * frac, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Outer warning perimeter
        ctx.strokeStyle = `rgba(254, 202, 202, ${0.4 + frac * 0.5})`;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([7, 6]);
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, d.radius, d.radius * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Growing drop shadow directly under plummeting keycap
        ctx.fillStyle = `rgba(15, 23, 42, ${0.2 + frac * 0.45})`;
        ctx.beginPath();
        ctx.ellipse(d.x, d.y + 4, 26 + frac * 34, 12 + frac * 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // Falling giant crimson DELETE keyboard keycap with dramatic speed lines!
        const dropY = d.y - (1 - frac * frac) * 440;
        ctx.strokeStyle = `rgba(254, 202, 202, ${0.35 + frac * 0.45})`;
        ctx.lineWidth = 2.5;
        for (const sx of [-42, -16, 18, 42]) {
          ctx.beginPath();
          ctx.moveTo(d.x + sx, dropY - 26);
          ctx.lineTo(d.x + sx, dropY - 90 - frac * 55);
          ctx.stroke();
        }
        this.drawDeleteKeycap(d.x, dropY, 1, 1);
      } else {
        const post = d.elapsed - d.impactTime;
        const fade = Math.max(0, 1 - post / (d.fadeTime - d.impactTime));

        // Dramatic radial crimson impact crack lines underneath the slammed keycap!
        ctx.save();
        ctx.translate(d.x, d.y + 4);
        ctx.globalAlpha = Math.min(1, fade * 1.4);
        this.drawGroundCrackLines(Math.round(d.x + d.y), d.radius * 0.98, 0.56, Math.max(0.2, fade));
        ctx.restore();

        // Multi-ring expanding crimson shockwave during first 0.52s of impact!
        if (post < 0.52) {
          const sf = post / 0.52;
          const inv = 1 - sf;
          ctx.save();
          // Blazing crimson-white flash core
          if (sf < 0.28) {
            const flashA = (1 - sf / 0.28) * 0.55;
            const fg = ctx.createRadialGradient(d.x, d.y, 10, d.x, d.y, d.radius * 1.15);
            fg.addColorStop(0, `rgba(255, 255, 255, ${flashA})`);
            fg.addColorStop(0.45, `rgba(239, 68, 68, ${flashA * 0.9})`);
            fg.addColorStop(1, 'rgba(239, 68, 68, 0)');
            ctx.fillStyle = fg;
            ctx.beginPath();
            ctx.ellipse(d.x, d.y, d.radius * 1.15, d.radius * 0.65, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          // Primary outer crimson shockwave ring
          ctx.strokeStyle = `rgba(239, 68, 68, ${inv * 0.95})`;
          ctx.lineWidth = 6 * inv + 1.5;
          ctx.beginPath();
          ctx.ellipse(
            d.x,
            d.y + 4,
            d.radius * (0.35 + sf * 0.9),
            d.radius * 0.56 * (0.35 + sf * 0.9),
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();

          // Secondary inner white-hot shockwave ring
          ctx.strokeStyle = `rgba(254, 226, 226, ${inv * 0.85})`;
          ctx.lineWidth = 2.8 * inv;
          ctx.beginPath();
          ctx.ellipse(
            d.x,
            d.y + 4,
            d.radius * (0.2 + sf * 0.72),
            d.radius * 0.56 * (0.2 + sf * 0.72),
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();
          ctx.restore();
        }

        // Brief impact bounce squash on the giant DELETE keycap
        const bounce = post < 0.16 ? 1 + Math.sin((post / 0.16) * Math.PI) * 0.14 : 1;
        this.drawDeleteKeycap(d.x, d.y - 16, fade, bounce);
      }
      ctx.restore();
    }
  }

  private drawDeleteKeycap(x: number, y: number, alpha: number, squashX: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(squashX, 1 / Math.sqrt(squashX));

    // 3D sculpted keycap base skirt
    ctx.fillStyle = '#7f1d1d';
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-54, -26, 108, 60, 12);
    ctx.fill();
    ctx.stroke();

    // Sculpted crimson top cap face
    const capGrad = ctx.createLinearGradient(0, -32, 0, 14);
    capGrad.addColorStop(0, '#ef4444');
    capGrad.addColorStop(1, '#b91c1c');
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.roundRect(-47, -33, 94, 47, 9);
    ctx.fill();
    ctx.stroke();

    // Glossy top specular edge
    ctx.strokeStyle = 'rgba(254, 202, 202, 0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-38, -29);
    ctx.lineTo(38, -29);
    ctx.stroke();

    // Bold DELETE legend + 4:00 AM satirical corner sub-legend
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 17px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DELETE', 0, -12);

    ctx.fillStyle = '#fecaca';
    ctx.font = 'bold 8.5px monospace';
    ctx.fillText('04:00 AM', 0, 5);
    ctx.restore();
  }

  private drawParticles(engine: GameEngine): void {
    if (engine.particles.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    for (const p of engine.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      if (p.ring) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3.5 * a + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.2 - a * 0.6), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.8, p.size * a), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawRendererSparks(): void {
    if (this.sparks.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = 'round';
    for (const s of this.sparks) {
      const a = Math.max(0, s.life / s.maxLife);
      if (s.kind === 'spark') {
        const ang = Math.atan2(s.vy, s.vx);
        const len = s.size * (1.4 + a * 1.2);
        ctx.globalAlpha = a;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2.2 * a + 0.6;
        ctx.beginPath();
        ctx.moveTo(s.x - Math.cos(ang) * len, s.y - Math.sin(ang) * len);
        ctx.lineTo(s.x + Math.cos(ang) * len * 0.5, s.y + Math.sin(ang) * len * 0.5);
        ctx.stroke();
      } else if (s.kind === 'star') {
        ctx.globalAlpha = a;
        this.drawFourPointStar(s.x, s.y, s.size * (0.6 + a * 0.8), s.color);
      } else {
        ctx.globalAlpha = a * 0.45;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * (1.35 - a * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawFloatingTexts(engine: GameEngine): void {
    const ctx = this.ctx;
    for (const f of engine.floatingTexts) {
      const age = f.maxLife - f.life;
      const pop = age < 0.14 ? 0.72 + Math.sin((age / 0.14) * Math.PI * 0.65) * 0.42 : 1;
      const a = Math.min(1, f.life / (f.maxLife * 0.4));
      const sz = Math.round(14 * (f.scale ?? 1));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `800 ${sz}px system-ui, -apple-system, sans-serif`;
      const halfW = Math.min((LOGICAL_W - 20) / 2, (ctx.measureText(f.text).width * pop) / 2 + 4);
      const halfH = (sz * pop) / 2 + 3;
      const clampedX = Math.max(10 + halfW, Math.min(LOGICAL_W - 10 - halfW, f.x));
      const clampedY = Math.max(58 + halfH, Math.min(LOGICAL_H - 12 - halfH, f.y));

      ctx.translate(clampedX, clampedY);
      ctx.scale(pop, pop);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3.8;
      ctx.lineJoin = 'round';
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
  }

  private drawTopWorldOverlays(engine: GameEngine): void {
    const ctx = this.ctx;
    const placedBoxes: OverlayBox[] = [];

    // Reserve Boss HP banner region so speech bubbles never collide with top Boss bar
    const hasBoss = engine.enemies.some((e) => e.isBoss);
    if (hasBoss) {
      const bannerW = 540;
      const bannerH = 48;
      const left = LOGICAL_W / 2 - bannerW / 2;
      placedBoxes.push({
        x1: left - 6,
        y1: this.bossBannerY - 4,
        x2: left + bannerW + 6,
        y2: this.bossBannerY + bannerH + 6,
      });
    }

    // Reserve active Wave Intro Ribbon region so speech bubbles stay cleanly separated
    const activeWaveBanner = getWaveBanner(engine);
    if (activeWaveBanner) {
      const wbY = hasBoss ? Math.min(224, this.bossBannerY + 58) : Math.min(224, Math.max(this.bossBannerY + 10, 96));
      placedBoxes.push({
        x1: LOGICAL_W / 2 - 220,
        y1: wbY - 6,
        x2: LOGICAL_W / 2 + 220,
        y2: wbY + 62,
      });
    }

    // 1. Always-readable Fake Delete Rug countdown/GB pills (drawn AFTER towers & units!)
    for (const rug of engine.fakeRugs) {
      const frac = Math.min(1, rug.elapsed / rug.duration);
      const gb = (2.4 + frac * 39.2).toFixed(1);
      const remain = Math.max(0, rug.duration - rug.elapsed).toFixed(0);
      const quakeAmp = frac > 0.8 ? 6.5 : frac > 0.55 ? 2.2 : 0;
      const shakeX = quakeAmp > 0 ? Math.sin(engine.time * 48 + rug.id) * quakeAmp : 0;
      const shakeY = quakeAmp > 0 ? Math.cos(engine.time * 42 + rug.id) * (quakeAmp * 0.45) : 0;
      const domeY = -frac * 25;

      const label = `${gb}GB · ${remain}s`;
      const pillW = 104;
      const pillH = 27;
      const anchorX = rug.x + shakeX;
      const desiredTop = rug.y + shakeY + domeY - 38;
      const boxLeft = Math.max(10, Math.min(LOGICAL_W - 10 - pillW, anchorX - pillW / 2));
      const boxTop = Math.max(58, Math.min(LOGICAL_H - 12 - pillH, desiredTop));
      const boxCenterX = boxLeft + pillW / 2;
      const urgent = frac > 0.78;
      const pulseBorder = urgent && Math.sin(engine.time * 16) > 0;

      ctx.save();
      // Drop shadow for crisp separation above Lv.3 tower badges (e.g. p5 4.0x)
      ctx.fillStyle = 'rgba(2, 6, 23, 0.58)';
      ctx.beginPath();
      ctx.roundRect(boxLeft + 1.5, boxTop + 2.5, pillW, pillH, 8);
      ctx.fill();

      // Main dark-slate pressure pill
      ctx.fillStyle = urgent ? '#2b090f' : '#0f172a';
      ctx.strokeStyle = urgent ? (pulseBorder ? '#fef08a' : '#f87171') : '#facc15';
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.roundRect(boxLeft, boxTop, pillW, pillH, 8);
      ctx.fill();
      ctx.stroke();

      // Tiny downward pointer tick anchoring pill visually to the rug dome
      const tipX = Math.max(boxLeft + 12, Math.min(boxLeft + pillW - 12, anchorX));
      ctx.fillStyle = urgent ? '#2b090f' : '#0f172a';
      ctx.beginPath();
      ctx.moveTo(tipX - 4, boxTop + pillH - 1);
      ctx.lineTo(tipX, boxTop + pillH + 5);
      ctx.lineTo(tipX + 4, boxTop + pillH - 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(tipX - 4.5, boxTop + pillH - 3, 9, 3);

      // Mini pressure progress strip inside pill
      ctx.fillStyle = 'rgba(51, 65, 85, 0.92)';
      ctx.beginPath();
      ctx.roundRect(boxLeft + 8, boxTop + 20, pillW - 16, 3.5, 2);
      ctx.fill();
      ctx.fillStyle = urgent ? '#ef4444' : frac > 0.5 ? '#f97316' : '#facc15';
      ctx.beginPath();
      ctx.roundRect(boxLeft + 8, boxTop + 20, Math.max(2, (pillW - 16) * frac), 3.5, 2);
      ctx.fill();

      ctx.fillStyle = urgent ? '#fecaca' : '#fef08a';
      ctx.font = 'bold 11.5px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, boxCenterX, boxTop + 11);
      ctx.restore();

      placedBoxes.push({
        x1: boxLeft,
        y1: boxTop,
        x2: boxLeft + pillW,
        y2: boxTop + pillH + 5,
      });
    }

    // 2. Always-readable, ZERO-clipping Speech Bubbles (Hero -> VIPs -> Boss -> Enemies)
    const h = engine.hero;
    if (h.alive && h.bubbleText) {
      this.drawSpeechBubble(
        h.x,
        h.y - 86,
        h.bubbleText,
        h.stance === 'vip' ? '#fef9c3' : '#fee2e2',
        placedBoxes,
        h.stance === 'vip' ? '#a16207' : '#0f172a'
      );
    }

    for (const v of engine.vips) {
      if (!v.bubbleText) continue;
      this.drawSpeechBubble(v.x, v.y - 80, v.bubbleText, '#fef3c7', placedBoxes, '#854d0e');
    }

    // Draw Boss bubbles first so they never yield space to lesser minions
    for (const e of engine.enemies) {
      if (!e.isBoss || !e.bubbleText) continue;
      const barY = -98;
      const bubbleOffset = e.enraged || e.stunTimer > 0 ? 28 : 16;
      this.drawSpeechBubble(e.x, e.y + barY - bubbleOffset, e.bubbleText, '#dbeafe', placedBoxes, '#1e3a8a');
    }
    for (const e of engine.enemies) {
      if (e.isBoss || !e.bubbleText) continue;
      const barY = -58;
      const bubbleOffset = e.enraged || e.stunTimer > 0 ? 28 : 16;
      this.drawSpeechBubble(e.x, e.y + barY - bubbleOffset, e.bubbleText, '#ffffff', placedBoxes, '#0f172a');
    }
  }

  private drawBossHealthBanner(engine: GameEngine): void {
    const bosses = engine.enemies.filter((e) => e.isBoss);
    if (bosses.length === 0) return;

    // Pick the boss furthest along the lane (most urgent threat)
    let boss = bosses[0];
    for (let i = 1; i < bosses.length; i++) {
      if (bosses[i].dist > boss.dist) boss = bosses[i];
    }

    const ctx = this.ctx;
    const t = engine.time;
    const maxHp = Math.max(1, boss.maxHp);
    const hp = Math.max(0, boss.hp);
    const hpRatio = Math.max(0, Math.min(1, hp / maxHp));
    const trailRatio = Math.max(hpRatio, this.bossHpTrails.get(boss.id) ?? hpRatio);
    const phase2 = hpRatio <= 0.5;

    const baseName = translate(engine.lang, `enemy.${boss.kind}.name`);
    const bossTitle = bosses.length > 1 ? `${baseName} ×${bosses.length}` : baseName;
    const hpText = `${Math.ceil(hp).toLocaleString()} / ${Math.ceil(maxHp).toLocaleString()} ${translate(engine.lang, 'stat.hp')}`;
    const tagText = phase2 ? translate(engine.lang, 'canvas.phase2') : '';
    const titleFont = '900 12.5px system-ui, -apple-system, sans-serif';
    const hpFont = 'bold 11.5px monospace';
    const tagFont = '900 9.5px system-ui, -apple-system, sans-serif';
    const tagIconSize = 9.5;
    const tagGap = 3;

    ctx.save();
    ctx.font = titleFont;
    const rawTitleW = ctx.measureText(bossTitle).width;
    ctx.font = hpFont;
    const hpW = ctx.measureText(hpText).width;
    let tagW = 0;
    if (phase2) {
      ctx.font = tagFont;
      tagW = Math.min(130, Math.ceil(ctx.measureText(tagText).width + tagIconSize + tagGap) + 12);
    }
    const headerNeededW = rawTitleW + (phase2 ? 7 + tagW : 0) + 16 + hpW;
    const bannerW = Math.max(396, Math.min(560, Math.ceil(headerNeededW) + 66));
    const bannerH = 48;
    const left = Math.round(LOGICAL_W / 2 - bannerW / 2);
    const top = Math.round(this.bossBannerY);

    // Soft royal ambient glow behind banner
    const glow = ctx.createRadialGradient(
      LOGICAL_W / 2,
      top + bannerH / 2,
      30,
      LOGICAL_W / 2,
      top + bannerH / 2,
      bannerW * 0.58
    );
    glow.addColorStop(0, phase2 ? 'rgba(239, 68, 68, 0.32)' : 'rgba(59, 130, 246, 0.34)');
    glow.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(left - 24, top - 10, bannerW + 48, bannerH + 20);

    // Outer drop shadow
    ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
    ctx.beginPath();
    ctx.roundRect(left + 2, top + 4, bannerW, bannerH, 12);
    ctx.fill();

    // Royal-blue metallic plaque body
    const bgGrad = ctx.createLinearGradient(left, top, left, top + bannerH);
    bgGrad.addColorStop(0, phase2 ? '#1e1b4b' : '#1e3a8a');
    bgGrad.addColorStop(0.55, '#172554');
    bgGrad.addColorStop(1, '#090f24');
    ctx.fillStyle = bgGrad;
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.roundRect(left, top, bannerW, bannerH, 12);
    ctx.fill();
    ctx.stroke();

    // Gleaming metallic gold outer border
    const goldGrad = ctx.createLinearGradient(left, top, left + bannerW, top + bannerH);
    goldGrad.addColorStop(0, '#fef08a');
    goldGrad.addColorStop(0.35, '#eab308');
    goldGrad.addColorStop(0.65, '#fef9c3');
    goldGrad.addColorStop(1, '#ca8a04');
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(left + 0.8, top + 0.8, bannerW - 1.6, bannerH - 1.6, 11.5);
    ctx.stroke();

    // Left EU Sovereign Medallion with orbiting golden stars
    const medX = left + 25;
    const medY = top + bannerH / 2;
    const medGrad = ctx.createRadialGradient(medX - 4, medY - 4, 2, medX, medY, 17);
    medGrad.addColorStop(0, '#2563eb');
    medGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = medGrad;
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(medX, medY, 16.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const a = t * 0.65 + (i * Math.PI * 2) / 8;
      this.drawFivePointStar(medX + Math.cos(a) * 12.2, medY + Math.sin(a) * 12.2, 2.3, '#fde047', '#713f12');
    }
    drawCanvasIcon(ctx, 'scale', medX, medY, 15, '#fef9c3', 2.2);

    // Header Row: Boss Name + Phase 2 badge (left) and HP numbers (right)
    const barX = left + 49;
    const barW = bannerW - 63;
    const barY = top + 27;
    const barH = 13;

    const maxTitleW = Math.max(96, barW - hpW - (phase2 ? tagW + 20 : 12));
    const drawnTitleW = Math.min(rawTitleW, maxTitleW);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = titleFont;
    ctx.fillStyle = '#fef08a';
    ctx.fillText(bossTitle, barX, top + 14, maxTitleW);

    if (phase2) {
      const tagX = barX + drawnTitleW + 7;
      const pulse = 0.72 + 0.28 * Math.sin(t * 10);
      ctx.fillStyle = `rgba(220, 38, 38, ${0.85 * pulse})`;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(tagX, top + 7, tagW, 14, 5);
      ctx.fill();
      ctx.stroke();
      this.drawCenteredIconLabel('zap', tagText, tagX + tagW / 2, top + 14, {
        iconSize: tagIconSize,
        iconColor: '#fef08a',
        textColor: '#ffffff',
        font: tagFont,
        gap: tagGap,
        strokeWidth: 2.5,
        textOffsetY: 0.3,
        maxTextWidth: tagW - tagIconSize - tagGap - 8,
      });
    }

    // Crisp HP Numbers (right-aligned)
    ctx.font = hpFont;
    ctx.textAlign = 'right';
    ctx.fillStyle = phase2 ? '#fecaca' : '#dbeafe';
    ctx.fillText(hpText, barX + barW, top + 14);

    // Recessed HP Bar Track
    ctx.fillStyle = '#060a14';
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 6);
    ctx.fill();
    ctx.stroke();

    // Clipped inner fills (damage trail + royal HP fill + animated sheen)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(barX + 1, barY + 1, barW - 2, barH - 2, 5);
    ctx.clip();

    // Delayed white-gold impact damage trail
    if (trailRatio > hpRatio + 0.002) {
      ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
      ctx.fillRect(barX + 1, barY + 1, (barW - 2) * trailRatio, barH - 2);
    }

    // Primary Royal-Blue (or Phase 2 Crimson-Gold) HP Fill
    const fillW = (barW - 2) * hpRatio;
    if (fillW > 0.5) {
      const fillGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      if (phase2) {
        fillGrad.addColorStop(0, '#991b1b');
        fillGrad.addColorStop(0.55, '#dc2626');
        fillGrad.addColorStop(1, '#f59e0b');
      } else {
        fillGrad.addColorStop(0, '#1d4ed8');
        fillGrad.addColorStop(0.55, '#2563eb');
        fillGrad.addColorStop(1, '#60a5fa');
      }
      ctx.fillStyle = fillGrad;
      ctx.fillRect(barX + 1, barY + 1, fillW, barH - 2);

      // Animated travelling diagonal gleam across HP fill
      const sweepX = barX - 30 + ((t * 95) % (barW + 60));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.moveTo(sweepX, barY);
      ctx.lineTo(sweepX + 18, barY);
      ctx.lineTo(sweepX + 6, barY + barH);
      ctx.lineTo(sweepX - 12, barY + barH);
      ctx.closePath();
      ctx.fill();

      // Top glossy specular strip
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(barX + 1, barY + 1, fillW, 3.5);
    }
    ctx.restore();

    // Golden 50%-Phase Threshold Tick Mark + Diamond Pip!
    const midX = barX + barW * 0.5;
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(midX, barY - 2);
    ctx.lineTo(midX, barY + barH + 2);
    ctx.stroke();

    ctx.strokeStyle = phase2 ? '#f97316' : '#fef08a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(midX, barY - 2);
    ctx.lineTo(midX, barY + barH + 2);
    ctx.stroke();

    // Tiny gleaming 50% threshold diamond cap above the tick
    ctx.fillStyle = phase2 ? '#fb923c' : '#fde047';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(midX, barY - 6);
    ctx.lineTo(midX + 4, barY - 2);
    ctx.lineTo(midX, barY + 2);
    ctx.lineTo(midX - 4, barY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private drawPreviewRange(
    preview: NonNullable<RenderUIState['previewRange']>,
    stage: StageConfig,
    lang: Lang
  ): void {
    const ctx = this.ctx;
    const t = this.uiAnimTime;
    const pulse = 0.5 + 0.5 * Math.sin(t * 5.2);
    const { x, y, range } = preview;
    const isArtillery = Boolean(preview.isArtillery);
    const splashR =
      typeof preview.splashRadius === 'number' && preview.splashRadius > 0
        ? preview.splashRadius
        : isArtillery
          ? 72
          : 0;

    ctx.save();

    // Soft radial reach fill so outer tower boundary pops cleanly on meadow
    const fillGrad = ctx.createRadialGradient(x, y, Math.max(8, range * 0.12), x, y, range);
    if (isArtillery) {
      fillGrad.addColorStop(0, 'rgba(249, 115, 22, 0.04)');
      fillGrad.addColorStop(0.75, `rgba(249, 115, 22, ${0.11 + pulse * 0.04})`);
      fillGrad.addColorStop(1, `rgba(251, 146, 60, ${0.22 + pulse * 0.07})`);
    } else {
      fillGrad.addColorStop(0, 'rgba(56, 189, 248, 0.04)');
      fillGrad.addColorStop(0.75, `rgba(56, 189, 248, ${0.1 + pulse * 0.04})`);
      fillGrad.addColorStop(1, `rgba(125, 211, 252, ${0.2 + pulse * 0.06})`);
    }
    ctx.fillStyle = fillGrad;
    ctx.beginPath();
    ctx.arc(x, y, range, 0, Math.PI * 2);
    ctx.fill();

    // Soft glowing outer halo behind dashed range ring
    ctx.strokeStyle = isArtillery
      ? `rgba(251, 146, 60, ${0.26 + pulse * 0.16})`
      : `rgba(125, 211, 252, ${0.26 + pulse * 0.16})`;
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.arc(x, y, range, 0, Math.PI * 2);
    ctx.stroke();

    // Crisp pulsing animated dashed range boundary
    ctx.strokeStyle = isArtillery
      ? `rgba(251, 146, 60, ${0.84 + pulse * 0.16})`
      : `rgba(56, 189, 248, ${0.84 + pulse * 0.16})`;
    ctx.lineWidth = 2.8;
    ctx.setLineDash([11, 7]);
    ctx.lineDashOffset = -t * 36;
    ctx.beginPath();
    ctx.arc(x, y, range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4 crisp tactical cardinal tick notches on perimeter
    ctx.strokeStyle = isArtillery ? '#fef08a' : '#e0f2fe';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * (range - 6), y + Math.sin(a) * (range - 6));
      ctx.lineTo(x + Math.cos(a) * (range + 4), y + Math.sin(a) * (range + 4));
      ctx.stroke();
    }

    // Subtle inner splash radius indicator + road-aligned sample blast ring for Artillery
    if (isArtillery && splashR > 0) {
      // Concentric inner splash-scale reference ring around pad
      if (splashR < range * 0.88) {
        ctx.fillStyle = `rgba(251, 146, 60, ${0.09 + pulse * 0.04})`;
        ctx.strokeStyle = `rgba(254, 215, 170, ${0.65 + pulse * 0.25})`;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = t * 20;
        ctx.beginPath();
        ctx.arc(x, y, splashR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Sample blast preview ring snapped to nearest road spot inside artillery range
      const nearest = closestPointOnPaths(stage.sampledPaths, x, y);
      if (nearest.distToRoad <= range - 12 && nearest.distToRoad >= 24) {
        const dx = nearest.x - x;
        const dy = nearest.y - y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        // Push sample slightly outward along pad->road direction so it clears the radial menu cleanly
        const sampleDist = Math.min(range - splashR * 0.35, Math.max(dist, 98));
        const sx = x + (dx / dist) * sampleDist;
        const sy = y + (dy / dist) * sampleDist;

        const blastGrad = ctx.createRadialGradient(sx, sy, 4, sx, sy, splashR);
        blastGrad.addColorStop(0, `rgba(251, 146, 60, ${0.24 + pulse * 0.08})`);
        blastGrad.addColorStop(1, 'rgba(239, 68, 68, 0.04)');
        ctx.fillStyle = blastGrad;
        ctx.strokeStyle = `rgba(253, 186, 116, ${0.78 + pulse * 0.18})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -t * 24;
        ctx.beginPath();
        ctx.arc(sx, sy, splashR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        // Mini blast center crosshair
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx - 6, sy);
        ctx.lineTo(sx + 6, sy);
        ctx.moveTo(sx, sy - 6);
        ctx.lineTo(sx, sy + 6);
        ctx.stroke();
      }

      // Crisp "VIP AOE" micro-tag anchored cleanly on the outer range rim (never covered by radial menu or HUD)
      const tagText = translate(lang, 'canvas.vipAoe');
      const tagFont = '900 11px system-ui, -apple-system, sans-serif';
      const tagIconSize = 12.5;
      const tagGap = 4.5;
      ctx.font = tagFont;
      const tagW = Math.min(
        LOGICAL_W - 24,
        Math.ceil(ctx.measureText(tagText).width + tagIconSize + tagGap) + 18
      );
      const tagH = 22;
      const preferTopY = y - range - tagH / 2 - 4;
      const preferBotY = y + range + tagH / 2 + 4;
      const rawTagY = preferTopY >= 64 ? preferTopY : preferBotY <= LOGICAL_H - 18 ? preferBotY : Math.max(64, y - range + 16);
      const tagX = Math.max(12 + tagW / 2, Math.min(LOGICAL_W - 12 - tagW / 2, x));
      const tagY = Math.max(64 + tagH / 2, Math.min(LOGICAL_H - 14 - tagH / 2, rawTagY));

      // Drop shadow
      ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
      ctx.beginPath();
      ctx.roundRect(tagX - tagW / 2 + 1.5, tagY - tagH / 2 + 2, tagW, tagH, 11);
      ctx.fill();

      // Crimson-amber warning pill
      const tagGrad = ctx.createLinearGradient(tagX, tagY - tagH / 2, tagX, tagY + tagH / 2);
      tagGrad.addColorStop(0, '#9a3412');
      tagGrad.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = tagGrad;
      ctx.strokeStyle = pulse > 0.5 ? '#fde047' : '#fb923c';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(tagX - tagW / 2, tagY - tagH / 2, tagW, tagH, 11);
      ctx.fill();
      ctx.stroke();

      this.drawCenteredIconLabel('alertTriangle', tagText, tagX, tagY, {
        iconSize: tagIconSize,
        iconColor: '#fde047',
        textColor: '#fef08a',
        font: tagFont,
        gap: tagGap,
        maxTextWidth: tagW - tagIconSize - tagGap - 14,
        strokeWidth: 2.3,
      });
    }

    ctx.restore();
  }

  private evalFlyingCoinPos(c: FlyingCoin, pRaw: number): Vec2 {
    const p = Math.max(0, Math.min(1, pRaw));
    if (
      !Number.isFinite(c.startX) ||
      !Number.isFinite(c.startY) ||
      !Number.isFinite(c.targetX) ||
      !Number.isFinite(c.targetY)
    ) {
      return { x: c.x, y: c.y };
    }
    const ease = 1 - Math.pow(1 - p, 2.2);
    const arcLift = Math.sin(p * Math.PI) * 58;
    return {
      x: c.startX + (c.targetX - c.startX) * ease,
      y: c.startY + (c.targetY - c.startY) * ease - arcLift,
    };
  }

  private drawFlyingCoins(engine: GameEngine): void {
    const coins = getFlyingCoins(engine);
    if (coins.length === 0) return;

    const ctx = this.ctx;
    ctx.save();

    for (const c of coins) {
      const p = Math.max(0, Math.min(1, c.progress));
      const pos = this.evalFlyingCoinPos(c, p);
      const fadeIn = Math.min(1, p / 0.1);
      const fadeOut = p > 0.88 ? Math.max(0, (1 - p) / 0.12) : 1;
      const alpha = fadeIn * fadeOut;
      if (alpha <= 0.02) continue;

      const baseR = c.amount >= 50 ? 9.5 : c.amount >= 20 ? 8.2 : 7;
      const popScale = p < 0.14 ? 0.65 + (p / 0.14) * 0.45 : p > 0.86 ? 1 - ((p - 0.86) / 0.14) * 0.35 : 1;
      const r = baseR * popScale;

      // 1. Faint golden sparkle trail following the exact parabolic arc
      for (let k = 4; k >= 1; k--) {
        const tp = p - k * 0.042;
        if (tp <= 0.01) continue;
        const tPos = this.evalFlyingCoinPos(c, tp);
        const ta = alpha * (1 - k / 5) * 0.52;
        ctx.fillStyle = k === 1 ? `rgba(254, 249, 195, ${ta})` : `rgba(250, 204, 21, ${ta * 0.85})`;
        ctx.beginPath();
        ctx.arc(tPos.x, tPos.y, Math.max(1.2, r * (0.48 - k * 0.08)), 0, Math.PI * 2);
        ctx.fill();
        if (k === 2 && Math.sin(p * 26 + c.startX) > 0.2) {
          this.drawFourPointStar(tPos.x, tPos.y, r * 0.65, `rgba(255, 255, 255, ${ta * 1.15})`);
        }
      }

      // 2. Soft golden bloom behind spinning coin
      const glow = ctx.createRadialGradient(pos.x, pos.y, 1, pos.x, pos.y, r * 2.1);
      glow.addColorStop(0, `rgba(254, 240, 138, ${0.42 * alpha})`);
      glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r * 2.1, 0, Math.PI * 2);
      ctx.fill();

      // 3. 3D-spinning golden coin with width modulation Math.cos(progress * 16)
      const spinCos = Math.cos(p * 16);
      const scaleX = Math.max(0.18, Math.abs(spinCos));
      const edgeShift = (spinCos >= 0 ? -1 : 1) * (1 - scaleX) * 2.2;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(pos.x, pos.y);

      // 3D metallic gold rim thickness behind coin face
      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(edgeShift, 0, r * scaleX, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Main luminous gold medallion face
      ctx.save();
      ctx.scale(scaleX, 1);
      const coinGrad = ctx.createRadialGradient(-r * 0.28, -r * 0.3, r * 0.1, 0, 0, r);
      coinGrad.addColorStop(0, '#fef9c3');
      coinGrad.addColorStop(0.42, '#facc15');
      coinGrad.addColorStop(0.85, '#eab308');
      coinGrad.addColorStop(1, '#ca8a04');
      ctx.fillStyle = coinGrad;
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Embossed inner ring & currency glyph when coin faces viewer
      if (scaleX > 0.36) {
        ctx.strokeStyle = 'rgba(254, 249, 195, 0.78)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#854d0e';
        ctx.font = `900 ${Math.round(r * 1.15)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0.6);
      }

      // Specular glint highlight across upper-left face
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.28, -r * 0.32, r * 0.28, r * 0.14, -0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Periodic bright glint star when coin catches light head-on
      if (scaleX > 0.86) {
        this.drawFourPointStar(r * 0.45, -r * 0.55, 4.2, '#ffffff');
      }
      ctx.restore();
    }

    ctx.restore();
  }

  private drawWaveBanner(engine: GameEngine): void {
    const banner = getWaveBanner(engine);
    if (!banner) return;

    const ctx = this.ctx;
    const maxT = Math.max(0.4, banner.maxTimer || 2.2);
    const remain = Math.max(0, banner.timer);
    const elapsed = Math.max(0, maxT - remain);
    const inDur = Math.min(0.32, maxT * 0.22);
    const outDur = Math.min(0.38, maxT * 0.25);

    let alpha = 1;
    let slideY = 0;
    let scale = 1;
    if (elapsed < inDur) {
      const u = elapsed / inDur;
      const easeOut = 1 - Math.pow(1 - u, 3);
      alpha = easeOut;
      slideY = -(1 - easeOut) * 24;
      scale = 0.92 + easeOut * 0.08;
    } else if (remain < outDur) {
      const u = remain / outDur;
      const easeIn = u * u;
      alpha = easeIn;
      slideY = -(1 - easeIn) * 14;
      scale = 0.96 + easeIn * 0.04;
    }
    if (alpha <= 0.01) return;

    const hasBoss = engine.enemies.some((e) => e.isBoss);
    const baseTop = hasBoss
      ? Math.min(224, this.bossBannerY + 58)
      : Math.min(224, Math.max(this.bossBannerY + 10, 96));

    // Measure bilingual title + subtitle to auto-size the heraldic ribbon cleanly
    ctx.save();
    ctx.font = '900 18.5px system-ui, -apple-system, sans-serif';
    const titleW = ctx.measureText(banner.title || '').width;
    ctx.font = '700 12px system-ui, -apple-system, sans-serif';
    const subW = banner.subtitle ? ctx.measureText(banner.subtitle).width : 0;

    const ribbonW = Math.max(304, Math.min(620, Math.ceil(Math.max(titleW, subW)) + 104));
    const ribbonH = banner.subtitle ? 54 : 40;
    const cx = LOGICAL_W / 2;
    const cy = baseTop + ribbonH / 2 + slideY;

    const theme: {
      bgTop: string;
      bgMid: string;
      bgBot: string;
      tail: string;
      borderA: string;
      borderB: string;
      glow: string;
      titleCol: string;
      subCol: string;
      emblem: IconName;
    } =
      banner.tone === 'boss'
        ? {
            bgTop: '#991b1b',
            bgMid: '#6b0f1a',
            bgBot: '#3b0712',
            tail: '#5c0c14',
            borderA: '#fef08a',
            borderB: '#f59e0b',
            glow: 'rgba(239, 68, 68, 0.36)',
            titleCol: '#fef08a',
            subCol: '#fecaca',
            emblem: 'scale',
          }
        : banner.tone === 'endless'
          ? {
              bgTop: '#6b21a8',
              bgMid: '#4c1d95',
              bgBot: '#240b4c',
              tail: '#3b0764',
              borderA: '#f5d0fe',
              borderB: '#c084fc',
              glow: 'rgba(192, 132, 252, 0.36)',
              titleCol: '#fef08a',
              subCol: '#f5d0fe',
              emblem: 'infinity',
            }
          : {
              bgTop: '#1e293b',
              bgMid: '#152033',
              bgBot: '#090f1d',
              tail: '#0f172a',
              borderA: '#fde047',
              borderB: '#ca8a04',
              glow: 'rgba(250, 204, 21, 0.24)',
              titleCol: '#fef08a',
              subCol: '#e2e8f0',
              emblem: 'swords',
            };

    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    const halfW = ribbonW / 2;
    const halfH = ribbonH / 2;
    const tailExt = 34;

    // Ambient halo glow behind ribbon
    const halo = ctx.createRadialGradient(0, 0, 24, 0, 0, halfW + tailExt);
    halo.addColorStop(0, theme.glow);
    halo.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(-halfW - tailExt - 10, -halfH - 16, ribbonW + tailExt * 2 + 20, ribbonH + 32);

    // Kingdom Rush swallowtail folded ribbon ends (left & right)
    for (const side of [-1, 1]) {
      const bx = side * (halfW - 6);
      const ex = side * (halfW + tailExt);
      const notchX = side * (halfW + tailExt - 12);

      // Tail drop shadow
      ctx.fillStyle = 'rgba(2, 6, 23, 0.5)';
      ctx.beginPath();
      ctx.moveTo(bx, -halfH + 11);
      ctx.lineTo(ex, -halfH + 11);
      ctx.lineTo(notchX, 5);
      ctx.lineTo(ex, halfH + 6);
      ctx.lineTo(bx, halfH + 6);
      ctx.closePath();
      ctx.fill();

      // Tail silk flap
      ctx.fillStyle = theme.tail;
      ctx.strokeStyle = theme.borderB;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(bx, -halfH + 8);
      ctx.lineTo(ex, -halfH + 8);
      ctx.lineTo(notchX, 3);
      ctx.lineTo(ex, halfH + 3);
      ctx.lineTo(bx, halfH + 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dark 2.5D crease triangle tucked under main plaque
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.moveTo(side * halfW, halfH - 2);
      ctx.lineTo(side * (halfW - 10), halfH + 4);
      ctx.lineTo(side * (halfW - 10), halfH - 4);
      ctx.closePath();
      ctx.fill();
    }

    // Main plaque drop shadow
    ctx.fillStyle = 'rgba(2, 6, 23, 0.62)';
    ctx.beginPath();
    ctx.roundRect(-halfW + 2, -halfH + 4, ribbonW, ribbonH, 10);
    ctx.fill();

    // Rich heraldic ribbon body
    const bodyGrad = ctx.createLinearGradient(0, -halfH, 0, halfH);
    bodyGrad.addColorStop(0, theme.bgTop);
    bodyGrad.addColorStop(0.55, theme.bgMid);
    bodyGrad.addColorStop(1, theme.bgBot);
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.roundRect(-halfW, -halfH, ribbonW, ribbonH, 10);
    ctx.fill();
    ctx.stroke();

    // Animated diagonal sheen sweep clipped inside plaque
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-halfW + 1, -halfH + 1, ribbonW - 2, ribbonH - 2, 9);
    ctx.clip();
    const sheenU = Math.min(1, elapsed / Math.max(0.8, maxT * 0.72));
    const sx = -halfW - 50 + sheenU * (ribbonW + 100);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.beginPath();
    ctx.moveTo(sx, -halfH);
    ctx.lineTo(sx + 34, -halfH);
    ctx.lineTo(sx + 10, halfH);
    ctx.lineTo(sx - 24, halfH);
    ctx.closePath();
    ctx.fill();
    // Subtle top specular highlight strip
    ctx.fillStyle = 'rgba(255, 255, 255, 0.11)';
    ctx.fillRect(-halfW, -halfH, ribbonW, 6);
    ctx.restore();

    // Brushed metallic gold / violet double trim
    const trimGrad = ctx.createLinearGradient(-halfW, -halfH, halfW, halfH);
    trimGrad.addColorStop(0, theme.borderA);
    trimGrad.addColorStop(0.5, theme.borderB);
    trimGrad.addColorStop(1, theme.borderA);
    ctx.strokeStyle = trimGrad;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(-halfW + 0.8, -halfH + 0.8, ribbonW - 1.6, ribbonH - 1.6, 9.5);
    ctx.stroke();

    // Flanking heraldic vector emblems + gold corner rivets
    drawCanvasIcon(ctx, theme.emblem, -halfW + 26, 0, 18, theme.titleCol, 2.2);
    drawCanvasIcon(ctx, theme.emblem, halfW - 26, 0, 18, theme.titleCol, 2.2);

    for (const rx of [-halfW + 9, halfW - 9]) {
      for (const ry of [-halfH + 8, halfH - 8]) {
        ctx.fillStyle = theme.borderA;
        ctx.beginPath();
        ctx.arc(rx, ry, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Crisp comic Title & Subtitle typography
    const maxBannerTextW = ribbonW - 92;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const titleY = banner.subtitle ? -9 : 1;
    ctx.font = '900 18.5px system-ui, -apple-system, sans-serif';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#020617';
    ctx.strokeText(banner.title, 0, titleY, maxBannerTextW);
    ctx.fillStyle = theme.titleCol;
    ctx.fillText(banner.title, 0, titleY, maxBannerTextW);

    if (banner.subtitle) {
      ctx.font = '700 12px system-ui, -apple-system, sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#020617';
      ctx.strokeText(banner.subtitle, 0, 12.5, maxBannerTextW);
      ctx.fillStyle = theme.subCol;
      ctx.fillText(banner.subtitle, 0, 12.5, maxBannerTextW);
    }

    ctx.restore();
  }

  private syncStageEndFx(engine: GameEngine, dt: number): void {
    const showVictory = engine.victoryShown && !engine.endlessMode && !engine.gameOver;
    const showDefeat = engine.gameOver && engine.lives <= 0;
    const nextMode: 'none' | 'victory' | 'defeat' = showVictory
      ? 'victory'
      : showDefeat
        ? 'defeat'
        : 'none';

    const castlePos = engine.getStage().castlePos;

    if (nextMode !== this.stageFxMode) {
      this.stageFxMode = nextMode;
      this.fireworkRockets = [];
      this.fireworkSparks = [];
      this.defeatEmbers = [];
      this.fireworkCooldown = 0;
      this.emberSpawnAcc = 0;

      if (nextMode === 'victory') {
        // Immediate celebratory opening bursts squarely in both unobstructed side flanks around .result-card!
        this.explodeFirework(1135, 134, 'gold');
        this.explodeFirework(1038, 246, 'cyan');
        this.explodeFirework(158, 138, 'violet');
        this.explodeFirework(222, 260, 'gold');
        this.launchFirework('cyan', castlePos, true);
        this.launchFirework('violet', castlePos, false);
        this.fireworkCooldown = 0.36;
      } else if (nextMode === 'defeat') {
        // Seed initial rising embers & smoke in both visible side flanks around the Defeat modal
        for (let i = 0; i < 32; i++) {
          this.spawnDefeatEmber('ember', true, castlePos);
        }
        for (let i = 0; i < 16; i++) {
          this.spawnDefeatEmber('smoke', true, castlePos);
        }
      }
    }

    if (nextMode === 'victory') {
      this.fireworkCooldown -= dt;
      if (this.fireworkCooldown <= 0 && this.fireworkRockets.length < 6) {
        const palettes: Array<'gold' | 'cyan' | 'violet'> = ['gold', 'cyan', 'violet'];
        const pick = palettes[Math.floor(Math.random() * palettes.length)];
        this.launchFirework(pick, castlePos);
        this.fireworkCooldown = 0.38 + Math.random() * 0.34;
      }

      const activeRockets: FireworkRocket[] = [];
      for (const rk of this.fireworkRockets) {
        rk.progress += dt / rk.duration;
        const p = Math.min(1, rk.progress);
        const ease = 1 - Math.pow(1 - p, 2);
        rk.x = rk.startX + (rk.targetX - rk.startX) * p;
        rk.y = rk.startY + (rk.targetY - rk.startY) * ease;
        if (rk.progress >= 1) {
          this.explodeFirework(rk.targetX, rk.targetY, rk.palette);
        } else {
          activeRockets.push(rk);
        }
      }
      this.fireworkRockets = activeRockets;

      this.fireworkSparks = this.fireworkSparks.filter((s) => {
        s.life -= dt;
        if (s.kind !== 'ring' && s.kind !== 'bloom') {
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.vx *= Math.pow(0.28, dt);
          s.vy = s.vy * Math.pow(0.45, dt) + 84 * dt;
        }
        return s.life > 0;
      });
    } else if (nextMode === 'defeat') {
      this.emberSpawnAcc += dt * 38;
      while (this.emberSpawnAcc >= 1) {
        this.emberSpawnAcc -= 1;
        this.spawnDefeatEmber(Math.random() < 0.74 ? 'ember' : 'smoke', false, castlePos);
      }

      this.defeatEmbers = this.defeatEmbers.filter((em) => {
        em.life -= dt;
        const sway = Math.sin(this.uiAnimTime * (em.kind === 'smoke' ? 1.4 : 3.2) + em.phase);
        em.x += (em.vx + sway * (em.kind === 'smoke' ? 14 : 26)) * dt;
        em.y += em.vy * dt;
        if (em.kind === 'smoke') {
          em.size += 11 * dt;
        }
        return em.life > 0 && em.y > -40;
      });
    }
  }

  private launchFirework(
    palette: 'gold' | 'cyan' | 'violet',
    castlePos: Vec2,
    forceRight?: boolean
  ): void {
    // Frame bursts strictly in the visible side flanks outside the centered .result-card (x=315..965):
    // Right flank over Silicon-Valley fortress: x=985..1235; Left flank over meadow: x=55..290; y=72..320
    const overFortress = forceRight !== undefined ? forceRight : Math.random() < 0.58;
    const targetX = overFortress
      ? 985 + Math.random() * 250
      : 55 + Math.random() * 235;
    const targetY = 72 + Math.random() * 248;
    const startX = overFortress
      ? 1030 + Math.random() * 195
      : 70 + Math.random() * 210;
    const startY = overFortress ? castlePos.y + 45 : 530 + Math.random() * 110;

    this.fireworkRockets.push({
      x: startX,
      y: startY,
      startX,
      startY,
      targetX,
      targetY,
      progress: 0,
      duration: 0.42 + Math.random() * 0.24,
      palette,
    });
  }

  private explodeFirework(x: number, y: number, palette: 'gold' | 'cyan' | 'violet'): void {
    const colors =
      palette === 'gold'
        ? ['#fef9c3', '#fde047', '#f59e0b', '#ffffff']
        : palette === 'cyan'
          ? ['#ecfeff', '#67e8f9', '#38bdf8', '#fde047']
          : ['#fae8ff', '#e879f9', '#c084fc', '#fef08a'];

    // Punchy luminous radial glow halo at detonation core
    this.fireworkSparks.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size: 105 + Math.random() * 32,
      color: colors[1],
      life: 0.68,
      maxLife: 0.68,
      twinklePhase: 0,
      kind: 'bloom',
    });

    // Expanding celebratory shock ring
    this.fireworkSparks.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size: 76 + Math.random() * 26,
      color: colors[1],
      life: 0.58,
      maxLife: 0.58,
      twinklePhase: 0,
      kind: 'ring',
    });

    // Outer chrysanthemum burst (28 particles) + inner star ring (10 particles)
    const outerCount = 28;
    for (let i = 0; i < outerCount; i++) {
      const ang = (i / outerCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.14;
      const spd = 120 + Math.random() * 105;
      const maxL = 0.95 + Math.random() * 0.48;
      this.fireworkSparks.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 16,
        size: 4.2 + Math.random() * 2.6,
        color: colors[i % colors.length],
        life: maxL,
        maxLife: maxL,
        twinklePhase: Math.random() * Math.PI * 2,
        kind: i % 4 === 0 ? 'star' : 'spark',
      });
    }
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + 0.18;
      const spd = 58 + Math.random() * 42;
      const maxL = 0.72 + Math.random() * 0.28;
      this.fireworkSparks.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 12,
        size: 5.5,
        color: '#ffffff',
        life: maxL,
        maxLife: maxL,
        twinklePhase: i,
        kind: 'star',
      });
    }

    // Cap particle pool cleanly for 60fps
    if (this.fireworkSparks.length > 340) {
      this.fireworkSparks.splice(0, this.fireworkSparks.length - 340);
    }
  }

  private spawnDefeatEmber(kind: 'ember' | 'smoke', prewarm: boolean, castlePos: Vec2): void {
    // Frame defeat smoke & glowing embers prominently across both unobstructed side flanks around .result-card
    const fromCastle = Math.random() < 0.68;
    const baseX = fromCastle
      ? 995 + Math.random() * 260
      : 45 + Math.random() * 250;
    const baseY = fromCastle
      ? castlePos.y + (Math.random() - 0.35) * 185
      : 430 + Math.random() * 250;

    const maxLife = kind === 'smoke' ? 2.5 + Math.random() * 1.4 : 1.7 + Math.random() * 1.5;
    const life = prewarm ? maxLife * (0.2 + Math.random() * 0.75) : maxLife;
    const age = maxLife - life;
    const vx = kind === 'smoke' ? -12 - Math.random() * 12 : -18 + Math.random() * 22;
    const vy = kind === 'smoke' ? -(32 + Math.random() * 24) : -(50 + Math.random() * 62);

    const emberColors = ['#fb923c', '#f97316', '#fde047', '#ef4444'];
    this.defeatEmbers.push({
      x: baseX + vx * age,
      y: baseY + vy * age,
      vx,
      vy,
      size: kind === 'smoke' ? 14 + Math.random() * 16 + age * 8 : 2.6 + Math.random() * 3.4,
      life,
      maxLife,
      phase: Math.random() * Math.PI * 2,
      kind,
      color: kind === 'smoke' ? '#1e293b' : emberColors[Math.floor(Math.random() * emberColors.length)],
    });

    if (this.defeatEmbers.length > 180) {
      this.defeatEmbers.shift();
    }
  }

  private drawStageEndFx(engine: GameEngine): void {
    if (this.stageFxMode === 'none') return;
    const ctx = this.ctx;
    const castlePos = engine.getStage().castlePos;
    ctx.save();

    if (this.stageFxMode === 'victory') {
      // Rising firework comet trails
      for (const rk of this.fireworkRockets) {
        const prevP = Math.max(0, rk.progress - 0.18);
        const prevEase = 1 - Math.pow(1 - prevP, 2);
        const px = rk.startX + (rk.targetX - rk.startX) * prevP;
        const py = rk.startY + (rk.targetY - rk.startY) * prevEase;

        const tailGrad = ctx.createLinearGradient(px, py, rk.x, rk.y);
        tailGrad.addColorStop(0, 'rgba(254, 240, 138, 0)');
        tailGrad.addColorStop(1, 'rgba(254, 249, 195, 0.96)');
        ctx.strokeStyle = tailGrad;
        ctx.lineWidth = 3.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(rk.x, rk.y);
        ctx.stroke();

        // Warm rocket head glow halo
        const rkGlow = ctx.createRadialGradient(rk.x, rk.y, 1, rk.x, rk.y, 16);
        rkGlow.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
        rkGlow.addColorStop(0.5, 'rgba(253, 224, 71, 0.45)');
        rkGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = rkGlow;
        ctx.beginPath();
        ctx.arc(rk.x, rk.y, 16, 0, Math.PI * 2);
        ctx.fill();

        this.drawFourPointStar(rk.x, rk.y, 7, '#fef9c3');
      }

      // 1. Punchy detonation radial glow halos behind sparks
      for (const s of this.fireworkSparks) {
        if (s.kind !== 'bloom') continue;
        const a = Math.max(0, s.life / s.maxLife);
        const r = s.size * (0.55 + (1 - a) * 0.65);
        ctx.save();
        ctx.globalAlpha = a * 0.62;
        const bg = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, r);
        bg.addColorStop(0, '#ffffff');
        bg.addColorStop(0.32, s.color);
        bg.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 2. Festive chrysanthemum burst sparks, rings & glittering stars
      for (const s of this.fireworkSparks) {
        if (s.kind === 'bloom') continue;
        const a = Math.max(0, s.life / s.maxLife);
        if (s.kind === 'ring') {
          const expand = 1 - a;
          ctx.save();
          ctx.globalAlpha = a * 0.72;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 4 * a + 1.4;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * (0.25 + expand * 0.98), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (s.kind === 'star') {
          const twinkle = 0.7 + 0.3 * Math.sin(this.uiAnimTime * 18 + s.twinklePhase);
          ctx.save();
          ctx.globalAlpha = a * twinkle;
          // Soft star glow dot
          ctx.fillStyle = s.color;
          ctx.globalAlpha = a * twinkle * 0.35;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * 1.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = a * twinkle;
          this.drawFourPointStar(s.x, s.y, s.size * (0.75 + a * 0.85), s.color);
          ctx.restore();
        } else {
          ctx.save();
          // Outer soft glow streak
          ctx.globalAlpha = a * 0.42;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.size * 1.25 * a + 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - s.vx * 0.07, s.y - s.vy * 0.07);
          ctx.stroke();

          // Crisp hot inner spark streak
          ctx.globalAlpha = a * 0.96;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.size * 0.62 * a + 1;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - s.vx * 0.06, s.y - s.vy * 0.06);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(s.x, s.y, Math.max(1.2, s.size * 0.42 * a), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    } else if (this.stageFxMode === 'defeat') {
      // Smoldering ember furnace glow flickering across the ruined fortress & left battleground flank
      const flicker = 0.78 + 0.22 * Math.sin(this.uiAnimTime * 7.5);
      const ruinGlow = ctx.createRadialGradient(
        castlePos.x - 10,
        castlePos.y - 10,
        18,
        castlePos.x - 10,
        castlePos.y - 10,
        265
      );
      ruinGlow.addColorStop(0, `rgba(249, 115, 22, ${0.44 * flicker})`);
      ruinGlow.addColorStop(0.55, `rgba(185, 28, 28, ${0.24 * flicker})`);
      ruinGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = ruinGlow;
      ctx.fillRect(castlePos.x - 280, castlePos.y - 280, 560, 560);

      // Subtle smoldering left-flank fire glow so both flanks around Defeat modal feel alive
      const leftGlow = ctx.createRadialGradient(160, 560, 12, 160, 560, 210);
      leftGlow.addColorStop(0, `rgba(249, 115, 22, ${0.26 * flicker})`);
      leftGlow.addColorStop(0.6, `rgba(153, 27, 27, ${0.14 * flicker})`);
      leftGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = leftGlow;
      ctx.fillRect(0, 340, 380, 380);

      // Rising dark smoke plumes first, then bright glowing orange embers on top
      for (const em of this.defeatEmbers) {
        if (em.kind !== 'smoke') continue;
        const frac = 1 - em.life / em.maxLife;
        const alpha = Math.sin(frac * Math.PI) * 0.48;
        if (alpha <= 0.01) continue;
        const sg = ctx.createRadialGradient(em.x, em.y, 2, em.x, em.y, em.size);
        sg.addColorStop(0, `rgba(30, 41, 59, ${alpha})`);
        sg.addColorStop(0.65, `rgba(15, 23, 42, ${alpha * 0.75})`);
        sg.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(em.x, em.y, em.size, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const em of this.defeatEmbers) {
        if (em.kind !== 'ember') continue;
        const frac = 1 - em.life / em.maxLife;
        const pulse = 0.68 + 0.32 * Math.sin(this.uiAnimTime * 14 + em.phase);
        const alpha = Math.sin(frac * Math.PI) * pulse;
        if (alpha <= 0.02) continue;

        // Warm glowing ember halo
        ctx.fillStyle = `rgba(251, 146, 60, ${alpha * 0.48})`;
        ctx.beginPath();
        ctx.arc(em.x, em.y, em.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Crisp glowing cinder streak
        ctx.strokeStyle = em.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = em.size * 0.85;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(em.x, em.y);
        ctx.lineTo(em.x - em.vx * 0.065, em.y - em.vy * 0.065);
        ctx.stroke();

        ctx.fillStyle = '#fef9c3';
        ctx.beginPath();
        ctx.arc(em.x, em.y, em.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();
  }

  private drawHealthBar(x: number, y: number, w: number, ratio: number, fill: string): void {
    const ctx = this.ctx;
    const h = 6;
    const clamped = Math.max(0, Math.min(1, ratio));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(x - w / 2 - 1.5, y - 1.5, w + 3, h + 3, 2.5);
    ctx.fill();

    if (clamped > 0) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y, w * clamped, h, 1.5);
      ctx.fill();
      // Subtle top gloss highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillRect(x - w / 2, y, w * clamped, 2);
    }
  }

  private drawSpeechBubble(
    speakerX: number,
    anchorY: number,
    text: string,
    bg: string,
    placedBoxes: OverlayBox[],
    borderColor = '#0f172a'
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    const boxW = Math.min(LOGICAL_W - 20, Math.max(66, Math.ceil(ctx.measureText(text).width) + 18));
    const boxH = 22;

    // Strictly clamp horizontally inside [10 .. LOGICAL_W - 10] and vertically inside [58 .. LOGICAL_H - 12]
    const minX = 10;
    const maxX = LOGICAL_W - 10;
    const minY = 58;
    const maxY = LOGICAL_H - 12;

    const boxLeft = Math.max(minX, Math.min(maxX - boxW, speakerX - boxW / 2));
    let boxTop = Math.max(minY, Math.min(maxY - boxH, anchorY - boxH));

    // Gently nudge vertically if intersecting an already-placed top readout (e.g. Fake Rug pill or Boss bar)
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidate: OverlayBox = {
        x1: boxLeft,
        y1: boxTop,
        x2: boxLeft + boxW,
        y2: boxTop + boxH + 5,
      };
      const hit = placedBoxes.find((b) => boxesOverlap(candidate, b, 3));
      if (!hit) break;
      const aboveTop = hit.y1 - boxH - 8;
      if (aboveTop >= minY) {
        boxTop = aboveTop;
      } else {
        const belowTop = hit.y2 + 6;
        if (belowTop + boxH <= maxY) {
          boxTop = belowTop;
        } else {
          break;
        }
      }
    }

    const boxBottom = boxTop + boxH;
    const boxCenterX = boxLeft + boxW / 2;
    placedBoxes.push({
      x1: boxLeft,
      y1: boxTop,
      x2: boxLeft + boxW,
      y2: boxBottom + 5,
    });

    // Subtle bubble drop shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.beginPath();
    ctx.roundRect(boxLeft + 1.5, boxTop + 2, boxW, boxH, 7);
    ctx.fill();

    ctx.fillStyle = bg;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(boxLeft, boxTop, boxW, boxH, 7);
    ctx.fill();
    ctx.stroke();

    // Comic pointer triangle clamped inside bubble base yet still pointing directly toward the speaker!
    const tailBaseX = Math.max(boxLeft + 12, Math.min(boxLeft + boxW - 12, speakerX));
    const tailTipX = Math.max(minX + 3, Math.min(maxX - 3, Math.max(boxLeft + 4, Math.min(boxLeft + boxW - 4, speakerX))));
    const tailTipY = Math.min(LOGICAL_H - 6, boxBottom + 6);
    ctx.beginPath();
    ctx.moveTo(tailBaseX - 4.5, boxBottom - 1);
    ctx.lineTo(tailTipX, tailTipY);
    ctx.lineTo(tailBaseX + 4.5, boxBottom - 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Cover tail top seam cleanly inside rounded rect
    ctx.fillStyle = bg;
    ctx.fillRect(tailBaseX - 5, boxBottom - 3, 10, 3);

    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, boxCenterX, boxTop + boxH / 2);
    ctx.restore();
  }

  private drawFourPointStar(x: number, y: number, r: number, color: string): void {
    const ctx = this.ctx;
    const inner = r * 0.26;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(inner, -inner);
    ctx.lineTo(r, 0);
    ctx.lineTo(inner, inner);
    ctx.lineTo(0, r);
    ctx.lineTo(-inner, inner);
    ctx.lineTo(-r, 0);
    ctx.lineTo(-inner, -inner);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawFivePointStar(x: number, y: number, r: number, fill: string, stroke: string): void {
    const ctx = this.ctx;
    const inner = r * 0.44;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? r : inner;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawMiniHeart(x: number, y: number, s: number, color: string): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.strokeStyle = '#881337';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.75);
    ctx.bezierCurveTo(-s * 1.25, 0, -s * 1.15, -s * 1.1, 0, -s * 0.35);
    ctx.bezierCurveTo(s * 1.15, -s * 1.1, s * 1.25, 0, 0, s * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
