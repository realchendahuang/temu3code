import {
  AlertTriangle,
  ArrowUp,
  Award,
  Bomb,
  BookOpen,
  Bot,
  Briefcase,
  Bug,
  Castle,
  Check,
  ChevronDown,
  Clock,
  Coins,
  Compass,
  Copy,
  Cpu,
  Crosshair,
  Crown,
  Database,
  Droplet,
  Dumbbell,
  Eraser,
  EyeOff,
  Feather,
  Flag,
  Flame,
  Gauge,
  GitFork,
  Globe,
  Hammer,
  Heart,
  HelpCircle,
  Infinity as InfinityIcon,
  Keyboard,
  Landmark,
  Layers,
  LifeBuoy,
  Lock,
  Map as MapIcon,
  Megaphone,
  MousePointerClick,
  Music,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Scale,
  ScrollText,
  Search,
  Shield,
  ShieldBan,
  ShieldCheck,
  Smartphone,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  Swords,
  Target,
  Terminal,
  Trash2,
  Trees,
  Trophy,
  UserCheck,
  Volume2,
  VolumeX,
  Wand2,
  Wind,
  X,
  Zap,
} from 'lucide';

type SvgAttrs = Record<string, string | number | undefined>;
type LucideIconNode = readonly (readonly [tag: string, attrs: SvgAttrs])[];

export type IconName =
  | 'shield'
  | 'coins'
  | 'swords'
  | 'pause'
  | 'play'
  | 'rotateCcw'
  | 'music'
  | 'volume2'
  | 'volumeX'
  | 'helpCircle'
  | 'x'
  | 'infinity'
  | 'sparkles'
  | 'check'
  | 'copy'
  | 'trash2'
  | 'smartphone'
  | 'keyboard'
  | 'database'
  | 'eraser'
  | 'flame'
  | 'sun'
  | 'megaphone'
  | 'flag'
  | 'castle'
  | 'shieldBan'
  | 'bot'
  | 'crosshair'
  | 'scale'
  | 'wand2'
  | 'zap'
  | 'bomb'
  | 'radio'
  | 'star'
  | 'arrowUp'
  | 'briefcase'
  | 'bug'
  | 'gitFork'
  | 'search'
  | 'terminal'
  | 'crown'
  | 'target'
  | 'dumbbell'
  | 'droplet'
  | 'heart'
  | 'gauge'
  | 'alertTriangle'
  | 'clock'
  | 'lock'
  | 'shieldCheck'
  | 'eyeOff'
  | 'lifeBuoy'
  | 'wind'
  | 'trees'
  | 'landmark'
  | 'cpu'
  | 'trophy'
  | 'bookOpen'
  | 'layers'
  | 'map'
  | 'feather'
  | 'award'
  | 'scrollText'
  | 'userCheck'
  | 'snowflake'
  | 'globe'
  | 'chevronDown'
  | 'hammer'
  | 'compass'
  | 'mousePointer';

const ICON_NODES: Record<IconName, LucideIconNode> = {
  shield: Shield,
  coins: Coins,
  swords: Swords,
  pause: Pause,
  play: Play,
  rotateCcw: RotateCcw,
  music: Music,
  volume2: Volume2,
  volumeX: VolumeX,
  helpCircle: HelpCircle,
  x: X,
  infinity: InfinityIcon,
  sparkles: Sparkles,
  check: Check,
  copy: Copy,
  trash2: Trash2,
  smartphone: Smartphone,
  keyboard: Keyboard,
  database: Database,
  eraser: Eraser,
  flame: Flame,
  sun: Sun,
  megaphone: Megaphone,
  flag: Flag,
  castle: Castle,
  shieldBan: ShieldBan,
  bot: Bot,
  crosshair: Crosshair,
  scale: Scale,
  wand2: Wand2,
  zap: Zap,
  bomb: Bomb,
  radio: Radio,
  star: Star,
  arrowUp: ArrowUp,
  briefcase: Briefcase,
  bug: Bug,
  gitFork: GitFork,
  search: Search,
  terminal: Terminal,
  crown: Crown,
  target: Target,
  dumbbell: Dumbbell,
  droplet: Droplet,
  heart: Heart,
  gauge: Gauge,
  alertTriangle: AlertTriangle,
  clock: Clock,
  lock: Lock,
  shieldCheck: ShieldCheck,
  eyeOff: EyeOff,
  lifeBuoy: LifeBuoy,
  wind: Wind,
  trees: Trees,
  landmark: Landmark,
  cpu: Cpu,
  trophy: Trophy,
  bookOpen: BookOpen,
  layers: Layers,
  map: MapIcon,
  feather: Feather,
  award: Award,
  scrollText: ScrollText,
  userCheck: UserCheck,
  snowflake: Snowflake,
  globe: Globe,
  chevronDown: ChevronDown,
  hammer: Hammer,
  compass: Compass,
  mousePointer: MousePointerClick,
};

const svgInnerCache = new Map<IconName, string>();

interface CachedCanvasPaths {
  combined: Path2D;
  parts: Path2D[];
}

const canvasPathCache = new Map<IconName, CachedCanvasPaths>();

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getSvgInner(name: IconName): string {
  const cached = svgInnerCache.get(name);
  if (cached !== undefined) return cached;
  const node = ICON_NODES[name];
  let html = '';
  for (const [tag, attrs] of node) {
    let attrStr = '';
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || k === 'key') continue;
      attrStr += ` ${k}="${escapeAttr(String(v))}"`;
    }
    html += `<${tag}${attrStr}/>`;
  }
  svgInnerCache.set(name, html);
  return html;
}

export function isIconName(v: string): v is IconName {
  return Object.prototype.hasOwnProperty.call(ICON_NODES, v);
}

export interface IconSvgOptions {
  size?: number;
  className?: string;
  strokeWidth?: number;
  fill?: string;
}

export function iconSvg(name: IconName, opts?: IconSvgOptions): string {
  const size = opts?.size ?? 16;
  const strokeWidth = opts?.strokeWidth ?? 2;
  const fill = opts?.fill ?? 'none';
  const cls = opts?.className ? `ico-svg ${opts.className}` : 'ico-svg';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${escapeAttr(fill)}" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="${escapeAttr(cls)}" aria-hidden="true">${getSvgInner(name)}</svg>`;
}

function toNum(v: string | number | undefined, fallback = 0): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  if (typeof v === 'string') {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function parsePoints(pointsStr: string): number[] {
  const nums: number[] = [];
  const matches = pointsStr.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!matches) return nums;
  for (const token of matches) {
    const n = Number.parseFloat(token);
    if (Number.isFinite(n)) nums.push(n);
  }
  return nums;
}

function addRoundedRectToPath(
  path: Path2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rxRaw: number,
  ryRaw: number
): void {
  if (w <= 0 || h <= 0) return;
  let rx = rxRaw > 0 ? rxRaw : ryRaw > 0 ? ryRaw : 0;
  let ry = ryRaw > 0 ? ryRaw : rxRaw > 0 ? rxRaw : 0;
  rx = Math.min(rx, w / 2);
  ry = Math.min(ry, h / 2);
  if (rx <= 0 || ry <= 0) {
    path.rect(x, y, w, h);
    return;
  }
  path.moveTo(x + rx, y);
  path.lineTo(x + w - rx, y);
  path.ellipse(x + w - rx, y + ry, rx, ry, 0, -Math.PI / 2, 0);
  path.lineTo(x + w, y + h - ry);
  path.ellipse(x + w - rx, y + h - ry, rx, ry, 0, 0, Math.PI / 2);
  path.lineTo(x + rx, y + h);
  path.ellipse(x + rx, y + h - ry, rx, ry, 0, Math.PI / 2, Math.PI);
  path.lineTo(x, y + ry);
  path.ellipse(x + rx, y + ry, rx, ry, 0, Math.PI, Math.PI * 1.5);
  path.closePath();
}

function buildPrimitivePath(tag: string, attrs: SvgAttrs): Path2D | null {
  if (tag === 'path') {
    const d = attrs.d;
    return typeof d === 'string' && d.length > 0 ? new Path2D(d) : null;
  }
  const p = new Path2D();
  if (tag === 'circle') {
    const cx = toNum(attrs.cx);
    const cy = toNum(attrs.cy);
    const r = toNum(attrs.r);
    if (r <= 0) return null;
    p.moveTo(cx + r, cy);
    p.arc(cx, cy, r, 0, Math.PI * 2);
    return p;
  }
  if (tag === 'ellipse') {
    const cx = toNum(attrs.cx);
    const cy = toNum(attrs.cy);
    const rx = toNum(attrs.rx);
    const ry = toNum(attrs.ry);
    if (rx <= 0 || ry <= 0) return null;
    p.moveTo(cx + rx, cy);
    p.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    return p;
  }
  if (tag === 'rect') {
    const x = toNum(attrs.x);
    const y = toNum(attrs.y);
    const w = toNum(attrs.width);
    const h = toNum(attrs.height);
    const rx = toNum(attrs.rx);
    const ry = toNum(attrs.ry);
    if (w <= 0 || h <= 0) return null;
    addRoundedRectToPath(p, x, y, w, h, rx, ry);
    return p;
  }
  if (tag === 'line') {
    const x1 = toNum(attrs.x1);
    const y1 = toNum(attrs.y1);
    const x2 = toNum(attrs.x2);
    const y2 = toNum(attrs.y2);
    p.moveTo(x1, y1);
    p.lineTo(x2, y2);
    return p;
  }
  if (tag === 'polyline' || tag === 'polygon') {
    const pts = typeof attrs.points === 'string' ? parsePoints(attrs.points) : [];
    if (pts.length < 4) return null;
    p.moveTo(pts[0], pts[1]);
    for (let i = 2; i + 1 < pts.length; i += 2) {
      p.lineTo(pts[i], pts[i + 1]);
    }
    if (tag === 'polygon') p.closePath();
    return p;
  }
  return null;
}

function getCanvasPaths(name: IconName): CachedCanvasPaths {
  const cached = canvasPathCache.get(name);
  if (cached) return cached;
  const combined = new Path2D();
  const parts: Path2D[] = [];
  for (const [tag, attrs] of ICON_NODES[name]) {
    const part = buildPrimitivePath(tag, attrs);
    if (part) {
      parts.push(part);
      combined.addPath(part);
    }
  }
  const entry: CachedCanvasPaths = { combined, parts };
  canvasPathCache.set(name, entry);
  return entry;
}

export function drawCanvasIcon(
  ctx: CanvasRenderingContext2D,
  name: IconName,
  x: number,
  y: number,
  size: number,
  color = '#ffffff',
  strokeWidth = 2.2,
  fill?: string
): void {
  if (size <= 0) return;
  const entry = getCanvasPaths(name);
  const scale = size / 24;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-12, -12);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = color;

  if (fill && fill !== 'none') {
    ctx.fillStyle = fill;
    for (const part of entry.parts) {
      ctx.fill(part);
      ctx.stroke(part);
    }
  } else {
    ctx.stroke(entry.combined);
  }

  ctx.restore();
}

export function drawCanvasStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill = '#facc15',
  stroke = '#0f172a'
): void {
  if (r <= 0) return;
  const inner = r * 0.45;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = x + Math.cos(angle) * rad;
    const py = y + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke && stroke !== 'none') {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, r * 0.22);
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  ctx.restore();
}
