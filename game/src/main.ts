import { assets } from './assets';
import { sfx } from './audio';
import {
  ACHIEVEMENTS,
  closestPointOnStageRoads,
  DIFFICULTY_CONFIG,
  ENEMY_ARCHETYPES,
  getStageConfig,
  getTowerStat,
  LOGICAL_H,
  LOGICAL_W,
  POLICY_POOL,
  STAGE_ORDER,
  TOWER_STATS,
  VIP_ESCORT_PAYOUT,
  VIP_PAYOUT,
} from './config';
import {
  GameEngine,
  loadCareerStats,
  loadStageBestRecord,
  resetAllLocalProgress,
} from './engine';
import {
  getHeroBubbles,
  getLangMeta,
  getTowerDesc,
  getTowerTag,
  getTowerTitle,
  LANGUAGES,
  loadLocale,
  normalizeLang,
  t,
} from './i18n';
import { iconSvg, isIconName, type IconName } from './icons';
import { GameRenderer, type RenderUIState } from './renderer';
import type {
  AchievementDef,
  AchievementId,
  Difficulty,
  Enemy,
  EnemyKind,
  Lang,
  PolicyChoice,
  PolicyId,
  StageId,
  TargetPriority,
  Tower,
  TowerBaseType,
  TowerBranch,
  TowerStat,
  VipUnit,
  WaveDef,
} from './types';

// Defensive contract for Audio BGM & Gold Master SFX API (coordinated with audio worker)
interface ExtendedSfx {
  muted: boolean;
  bgmMuted?: boolean;
  setMuted?: (muted: boolean) => void;
  startBgm?: () => void;
  stopBgm?: () => void;
  setBgmMuted?: (muted: boolean) => void;
  setIntensity?: (level: 0 | 1 | 2) => void;
  achievement?: () => void;
  policyPick?: () => void;
  inspect?: () => void;
  error?: () => void;
  bossSpawn?: () => void;
}
const audioExt = sfx as unknown as ExtendedSfx;

const portraitTip = document.getElementById('portrait-tip') as HTMLDivElement;
const btnDismissPortrait = document.getElementById('btn-dismiss-portrait') as HTMLButtonElement;

const stageWrap = document.getElementById('stage-wrap') as HTMLDivElement;
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const hudTop = document.getElementById('hud-top') as HTMLElement;
const hudBottom = document.getElementById('hud-bottom') as HTMLElement;
const hudPolicies = document.getElementById('hud-policies') as HTMLDivElement;
const radialMenu = document.getElementById('radial-menu') as HTMLDivElement;
const inspectorCard = document.getElementById('inspector-card') as HTMLDivElement;
const bannerToast = document.getElementById('banner-toast') as HTMLDivElement;
const achievementToast = document.getElementById('achievement-toast') as HTMLDivElement;
const achToastIcon = document.getElementById('ach-toast-icon') as HTMLDivElement;
const achToastKicker = document.getElementById('ach-toast-kicker') as HTMLDivElement;
const achToastTitle = document.getElementById('ach-toast-title') as HTMLDivElement;
const achToastDesc = document.getElementById('ach-toast-desc') as HTMLDivElement;
const targetingHint = document.getElementById('targeting-hint') as HTMLDivElement;
const skillsBar = document.querySelector('.skills-bar') as HTMLDivElement;

const statHpWrap = document.getElementById('stat-hp-wrap') as HTMLDivElement;
const statGoldWrap = document.getElementById('stat-gold-wrap') as HTMLDivElement;
const statWaveWrap = document.getElementById('stat-wave-wrap') as HTMLDivElement;
const statHp = document.getElementById('stat-hp') as HTMLSpanElement;
const statGold = document.getElementById('stat-gold') as HTMLSpanElement;
const statWave = document.getElementById('stat-wave') as HTMLSpanElement;
const alarmWrap = document.getElementById('alarm-wrap') as HTMLDivElement;
const alarmLabel = document.getElementById('alarm-label') as HTMLSpanElement;
const alarmPct = document.getElementById('alarm-pct') as HTMLSpanElement;
const alarmFill = document.getElementById('alarm-fill') as HTMLDivElement;

const btnSpeed = document.getElementById('btn-speed') as HTMLButtonElement;
const btnPause = document.getElementById('btn-pause') as HTMLButtonElement;
const btnRestart = document.getElementById('btn-restart') as HTMLButtonElement;
const btnMusic = document.getElementById('btn-music') as HTMLButtonElement;
const btnMute = document.getElementById('btn-mute') as HTMLButtonElement;
const btnLangHud = document.getElementById('btn-lang-hud') as HTMLButtonElement;
const hudLangCode = document.getElementById('hud-lang-code') as HTMLSpanElement;
const langPopover = document.getElementById('lang-popover') as HTMLDivElement;
const btnHelp = document.getElementById('btn-help') as HTMLButtonElement;
const tutorialCard = document.getElementById('tutorial-card') as HTMLElement;
const tutStepBadge = document.getElementById('tut-step-badge') as HTMLSpanElement;
const tutTitle = document.getElementById('tut-title') as HTMLSpanElement;
const tutBody = document.getElementById('tut-body') as HTMLParagraphElement;
const tutDots = document.getElementById('tut-dots') as HTMLDivElement;
const btnTutSkip = document.getElementById('btn-tut-skip') as HTMLButtonElement;
const btnTutNext = document.getElementById('btn-tut-next') as HTMLButtonElement;
const btnReplayTutorial = document.getElementById('btn-replay-tutorial') as HTMLButtonElement;

const heroPill = document.getElementById('hero-pill') as HTMLButtonElement;
const heroAvatar = document.getElementById('hero-avatar') as HTMLImageElement;
const heroLv = document.getElementById('hero-lv') as HTMLSpanElement;
const heroRespawnOverlay = document.getElementById('hero-respawn-overlay') as HTMLSpanElement;
const heroStance = document.getElementById('hero-stance') as HTMLSpanElement;
const heroHpFill = document.getElementById('hero-hp-fill') as HTMLDivElement;
const heroXpFill = document.getElementById('hero-xp-fill') as HTMLDivElement;

const waveCallWrap = document.getElementById('wave-call-wrap') as HTMLDivElement;
const wavePreviewPill = document.getElementById('wave-preview-pill') as HTMLDivElement;
const wavePreviewTooltip = document.getElementById('wave-preview-tooltip') as HTMLDivElement;
const btnCallWave = document.getElementById('btn-call-wave') as HTMLButtonElement;
const waveCallText = document.getElementById('wave-call-text') as HTMLSpanElement;

const btnSkillSteal = document.getElementById('skill-steal') as HTMLButtonElement;
const btnSkillRug = document.getElementById('skill-rug') as HTMLButtonElement;
const btnSkillDelete = document.getElementById('skill-delete') as HTMLButtonElement;
const btnSkillHero = document.getElementById('skill-hero') as HTMLButtonElement;
const cdSteal = document.getElementById('cd-steal') as HTMLSpanElement;
const cdRug = document.getElementById('cd-rug') as HTMLSpanElement;
const cdDelete = document.getElementById('cd-delete') as HTMLSpanElement;
const cdHero = document.getElementById('cd-hero') as HTMLSpanElement;

const overlayTitle = document.getElementById('overlay-title') as HTMLDivElement;
const overlayPause = document.getElementById('overlay-pause') as HTMLDivElement;
const overlayHelp = document.getElementById('overlay-help') as HTMLDivElement;
const overlayPolicy = document.getElementById('overlay-policy') as HTMLDivElement;
const overlayResult = document.getElementById('overlay-result') as HTMLDivElement;
const stagePicker = document.getElementById('stage-picker') as HTMLDivElement;
const difficultyPicker = document.getElementById('difficulty-picker') as HTMLDivElement;
const diffPillBtns = Array.from(difficultyPicker.querySelectorAll<HTMLButtonElement>('.diff-pill'));
const btnTitleHelp = document.getElementById('btn-title-help') as HTMLButtonElement;
const btnPauseResume = document.getElementById('btn-pause-resume') as HTMLButtonElement;
const btnPauseRestart = document.getElementById('btn-pause-restart') as HTMLButtonElement;
const btnPauseStages = document.getElementById('btn-pause-stages') as HTMLButtonElement;
const btnPauseTutorial = document.getElementById('btn-pause-tutorial') as HTMLButtonElement;
const tabHelpGuide = document.getElementById('tab-help-guide') as HTMLButtonElement;
const tabHelpCodex = document.getElementById('tab-help-codex') as HTMLButtonElement;
const tabHelpAchievements = document.getElementById('tab-help-achievements') as HTMLButtonElement;
const tabAchLabel = document.getElementById('tab-ach-label') as HTMLSpanElement;
const helpPanelGuide = document.getElementById('help-panel-guide') as HTMLDivElement;
const helpPanelCodex = document.getElementById('help-panel-codex') as HTMLDivElement;
const helpPanelAchievements = document.getElementById('help-panel-achievements') as HTMLDivElement;
const helpContent = document.getElementById('help-content') as HTMLDivElement;
const helpHotkeys = document.getElementById('help-hotkeys') as HTMLDivElement;
const codexContent = document.getElementById('codex-content') as HTMLDivElement;
const achievementsContent = document.getElementById('achievements-content') as HTMLDivElement;
const policyChoicesEl = document.getElementById('policy-choices') as HTMLDivElement;
const btnTitleAchievements = document.getElementById('btn-title-achievements') as HTMLButtonElement;
const titleAchCount = document.getElementById('title-ach-count') as HTMLSpanElement;
const btnLangTitle = document.getElementById('btn-lang-title') as HTMLButtonElement;
const titleLangName = document.getElementById('title-lang-name') as HTMLSpanElement;

const resultStars = document.getElementById('result-stars') as HTMLDivElement;
const resultRank = document.getElementById('result-rank') as HTMLDivElement;
const resultTrilogyBanner = document.getElementById('result-trilogy-banner') as HTMLDivElement;
const resultTitle = document.getElementById('result-title') as HTMLHeadingElement;
const resultSubtitle = document.getElementById('result-subtitle') as HTMLParagraphElement;
const resultMetrics = document.getElementById('result-metrics') as HTMLDivElement;
const resultPolicies = document.getElementById('result-policies') as HTMLDivElement;
const resultRecap = document.getElementById('result-recap') as HTMLDivElement;
const btnCopyReport = document.getElementById('btn-copy-report') as HTMLButtonElement;
const copyReportIco = document.getElementById('copy-report-ico') as HTMLSpanElement;
const copyReportLabel = document.getElementById('copy-report-label') as HTMLSpanElement;
const btnNextStage = document.getElementById('btn-next-stage') as HTMLButtonElement;
const btnEndless = document.getElementById('btn-endless') as HTMLButtonElement;
const btnStageSelect = document.getElementById('btn-stage-select') as HTMLButtonElement;
const btnBackSite = document.getElementById('btn-back-site') as HTMLAnchorElement;

const RTL_TEXT_CONTAINERS: HTMLElement[] = [
  overlayTitle,
  overlayPause,
  overlayPolicy,
  overlayHelp,
  overlayResult,
  inspectorCard,
  bannerToast,
  achievementToast,
  tutorialCard,
  langPopover,
];

const SITE_LANG_STORAGE_KEY = 'temu3-lang';
const LANG_STORAGE_KEY = 'temu3_kingdom_lang';
const TUTORIAL_STORAGE_KEY = 'temu3_kingdom_tutorial_v1';
const DIFFICULTY_STORAGE_KEY = 'temu3_kingdom_difficulty';
const STAGE_STORAGE_KEY = 'temu3_kingdom_stage_v1';
const STAGE_ICONS: Record<StageId, IconName> = {
  meadow: 'trees',
  bridge: 'landmark',
  furnace: 'cpu',
};
const STAGE_ICON_COLORS: Record<StageId, string> = {
  meadow: 'ico-emerald',
  bridge: 'ico-amber',
  furnace: 'ico-cyan',
};
const BRANCH_ICONS: Record<TowerBaseType, { a: { ico: IconName; cls: string }; b: { ico: IconName; cls: string } }> = {
  barracks: {
    a: { ico: 'shieldBan', cls: 'ico-crimson' },
    b: { ico: 'bot', cls: 'ico-gold' },
  },
  archer: {
    a: { ico: 'flame', cls: 'ico-amber' },
    b: { ico: 'scale', cls: 'ico-cyan' },
  },
  mage: {
    a: { ico: 'star', cls: 'ico-gold' },
    b: { ico: 'zap', cls: 'ico-purple' },
  },
  artillery: {
    a: { ico: 'bomb', cls: 'ico-amber' },
    b: { ico: 'wind', cls: 'ico-crimson' },
  },
};

let langPopoverAnchor: HTMLButtonElement | null = null;

function renderLangPopover(): void {
  const current = engine.lang;
  langPopover.innerHTML = LANGUAGES.map((meta) => {
    const active = meta.code === current;
    const metaRight = active
      ? iconSvg('check', { size: 13, strokeWidth: 2.5 })
      : escapeHtml(meta.short);
    return `<button type="button" class="lang-opt${active ? ' is-active' : ''}" role="option" aria-selected="${active ? 'true' : 'false'}" data-lang="${meta.code}" lang="${meta.code}">
      <span class="lang-opt-name">${escapeHtml(meta.name)}</span>
      <span class="lang-opt-meta">${metaRight}</span>
    </button>`;
  }).join('');
}

function positionLangPopover(anchor: HTMLButtonElement): void {
  const stageRect = stageWrap.getBoundingClientRect();
  const aRect = anchor.getBoundingClientRect();
  const compactMob = stageRect.height <= 460;
  const popW = Math.min(compactMob ? 440 : 326, Math.max(220, stageRect.width - 20));
  langPopover.style.width = `${Math.round(popW)}px`;
  const popH = Math.min(langPopover.scrollHeight || 310, Math.round(stageRect.height * (compactMob ? 0.92 : 0.72)), 360);

  const relLeft = aRect.left - stageRect.left;
  const relRight = aRect.right - stageRect.left;
  const relTop = aRect.top - stageRect.top;
  const relBottom = aRect.bottom - stageRect.top;

  // Prefer right-aligned under HUD button, centered/start-aligned near Title button, clamped cleanly
  let left = anchor === btnLangHud ? relRight - popW : relLeft + (aRect.width - popW) / 2;
  left = Math.max(10, Math.min(left, stageRect.width - popW - 10));

  const spaceBelow = stageRect.height - relBottom - 10;
  const spaceAbove = relTop - 10;
  let top = relBottom + 8;
  if (spaceBelow < Math.min(popH, 200) && spaceAbove > spaceBelow) {
    top = Math.max(10, relTop - popH - 8);
  }
  top = Math.max(10, Math.min(top, stageRect.height - Math.min(popH, stageRect.height - 20) - 10));

  langPopover.style.left = `${Math.round(left)}px`;
  langPopover.style.top = `${Math.round(top)}px`;
}

function closeLangPopover(returnFocus = false): void {
  if (langPopover.classList.contains('hidden')) return;
  const prevAnchor = langPopoverAnchor;
  langPopover.classList.add('hidden');
  btnLangHud.classList.remove('is-open');
  btnLangTitle.classList.remove('is-open');
  btnLangHud.setAttribute('aria-expanded', 'false');
  btnLangTitle.setAttribute('aria-expanded', 'false');
  langPopoverAnchor = null;
  if (returnFocus && prevAnchor) prevAnchor.focus();
}

function toggleLangPopover(anchor: HTMLButtonElement): void {
  if (!langPopover.classList.contains('hidden') && langPopoverAnchor === anchor) {
    closeLangPopover(false);
    return;
  }
  renderLangPopover();
  langPopoverAnchor = anchor;
  langPopover.classList.remove('hidden');
  btnLangHud.classList.toggle('is-open', anchor === btnLangHud);
  btnLangTitle.classList.toggle('is-open', anchor === btnLangTitle);
  btnLangHud.setAttribute('aria-expanded', anchor === btnLangHud ? 'true' : 'false');
  btnLangTitle.setAttribute('aria-expanded', anchor === btnLangTitle ? 'true' : 'false');
  positionLangPopover(anchor);
}

// ---- Interactive 4-Step First-Run Tutorial ----
let tutorialStep = -1; // -1 = inactive, 0 = build, 1 = wave, 2 = hero, 3 = skill

function isTutorialCompleted(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'done';
  } catch {
    return false;
  }
}

function markTutorialCompleted(): void {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'done');
  } catch {
    // ignore storage errors
  }
}

function clearTutorialHighlights(): void {
  ui.tutorialPadId = null;
  btnCallWave.classList.remove('tut-highlight');
  heroPill.classList.remove('tut-highlight');
  btnSkillSteal.classList.remove('tut-highlight');
}

function pickTutorialPadId(): string | null {
  const pads = engine.getStage().pads;
  const preferred = pads.find((p) => p.id === 'p2' && !engine.towers.some((tw) => tw.padId === p.id));
  if (preferred) return preferred.id;
  const anyEmpty = pads.find((p) => !engine.towers.some((tw) => tw.padId === p.id));
  return anyEmpty ? anyEmpty.id : null;
}

function renderTutorialCard(): void {
  clearTutorialHighlights();
  if (tutorialStep < 0 || !started || engine.gameOver || !overlayTitle.classList.contains('hidden')) {
    tutorialCard.classList.add('hidden');
    return;
  }

  const lang = engine.lang;
  const stepNum = tutorialStep + 1;
  tutStepBadge.textContent = `${stepNum} / 4`;
  tutTitle.textContent = t(lang, `tut.s${stepNum}t`);
  tutBody.textContent = t(lang, `tut.s${stepNum}b`);
  tutDots.innerHTML = [0, 1, 2, 3]
    .map((i) => `<span class="tut-dot${i < tutorialStep ? ' is-done' : i === tutorialStep ? ' is-current' : ''}"></span>`)
    .join('');

  if (tutorialStep === 0) {
    ui.tutorialPadId = pickTutorialPadId();
    btnTutNext.classList.add('hidden');
  } else if (tutorialStep === 1) {
    btnCallWave.classList.add('tut-highlight');
    btnTutNext.classList.add('hidden');
  } else if (tutorialStep === 2) {
    heroPill.classList.add('tut-highlight');
    btnTutNext.textContent = t(lang, 'tut.next');
    btnTutNext.classList.remove('hidden');
  } else {
    btnSkillSteal.classList.add('tut-highlight');
    btnTutNext.textContent = t(lang, 'tut.done');
    btnTutNext.classList.remove('hidden');
  }

  tutorialCard.classList.remove('hidden');
}

function startTutorial(force = false): void {
  if (!force && isTutorialCompleted()) {
    tutorialStep = -1;
    renderTutorialCard();
    return;
  }
  if (engine.towers.length === 0) tutorialStep = 0;
  else if (engine.waveIndex < 0) tutorialStep = 1;
  else tutorialStep = 2;
  renderTutorialCard();
}

function finishTutorial(showCompleteToast: boolean): void {
  tutorialStep = -1;
  markTutorialCompleted();
  clearTutorialHighlights();
  tutorialCard.classList.add('hidden');
  if (showCompleteToast) {
    showToast(t(engine.lang, 'tut.completeToast'), 'good', 'sparkles');
  }
}

function notifyTutorialEvent(event: 'build' | 'wave' | 'hero' | 'skill'): void {
  if (tutorialStep < 0) return;
  if (tutorialStep === 0 && event === 'build') {
    tutorialStep = 1;
    renderTutorialCard();
  } else if (tutorialStep === 1 && event === 'wave') {
    tutorialStep = 2;
    renderTutorialCard();
  } else if (tutorialStep === 2 && event === 'hero') {
    tutorialStep = 3;
    renderTutorialCard();
  } else if (tutorialStep === 3 && event === 'skill') {
    finishTutorial(true);
  }
}

function escapeHtml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function safeIconSvg(
  name: IconName | string,
  opts?: { size?: number; className?: string; strokeWidth?: number; fill?: string },
  fallback: IconName = 'award'
): string {
  return iconSvg(isIconName(name) ? name : fallback, opts);
}

function hydrateStaticIcons(): void {
  document.querySelectorAll<HTMLElement>('[data-icon]').forEach((el) => {
    const name = el.dataset.icon;
    if (!name || !isIconName(name)) return;
    const size = Number(el.dataset.iconSize) || 16;
    const strokeWidth = el.dataset.iconStroke ? Number(el.dataset.iconStroke) : undefined;
    const className = el.dataset.iconClass || undefined;
    el.innerHTML = iconSvg(name, { size, strokeWidth, className });
  });
}

function renderStarsSvg(earned: number, total = 3, size = 12): string {
  const clamped = Math.max(0, Math.min(total, Math.round(earned)));
  let html = '';
  for (let i = 0; i < total; i++) {
    html +=
      i < clamped
        ? iconSvg('star', { size, className: 'ico-star-filled', fill: 'currentColor', strokeWidth: 2 })
        : iconSvg('star', { size, className: 'ico-star-empty', strokeWidth: 2 });
  }
  return `<span class="stars-row" aria-label="${clamped}/${total}">${html}</span>`;
}

let toastTimeout: number | null = null;
let copyResetTimeout: number | null = null;
let restartArmed = false;
let restartArmTimer: number | null = null;
let resetSaveArmed = false;
let resetSaveArmTimer: number | null = null;
let started = false;
let bgmMutedFallback = typeof audioExt.bgmMuted === 'boolean' ? audioExt.bgmMuted : false;
let lastAudioIntensity: 0 | 1 | 2 | -1 = -1;
let lastHeroPortraitKey: 'vip' | 'rage' = 'rage';
let lastHeroStanceKey = '';
let lastWaveRenderKey = '';
let lastPausedIconState: boolean | null = null;
let lastMutedIconState: boolean | null = null;
let lastPreviewCacheKey = '';
let lastPoliciesCacheKey = '';
let waveTooltipPinned = false;
let lastUiPointerTs = 0;
let lastResultKind: 'victory' | 'defeat' | 'endless_over' | null = null;
let openPolicyChoices: PolicyChoice[] | null = null;
let pinnedPolicyBadgeId: PolicyId | null = null;
let entityInspectorCacheKey = '';
let entityInspectorChipsHtml = '';
let entityInspectorBadgeHtml = '';
let inspectedTowerId: number | null = null;
let inspectedTowerRenderKey = '';
let radialHoveringBtn = false;
let radialHoveringPriorityBtn = false;
let radialMenuRenderKey = '';
let pausedBeforeHelp = false;
let achievementToastQueue: AchievementDef[] = [];
let activeAchievementToastDef: AchievementDef | null = null;
let achToastHideTimer: number | null = null;
let achToastCleanupTimer: number | null = null;

const knownPolicies = new Map<PolicyId, PolicyChoice>();
for (const p of POLICY_POOL) {
  knownPolicies.set(p.id, p);
}

const ui: RenderUIState = {
  selectedPadId: null,
  hoveredPadId: null,
  targetingMode: 'none',
  mouseX: 640,
  mouseY: 360,
  rallyTowerId: null,
  selectedEntity: null,
  previewRange: null,
};

// ---- HiDPI Canvas Buffer Sync (Contract with visuals worker) ----
function syncCanvasHiDpi(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const targetW = Math.round(LOGICAL_W * dpr);
  const targetH = Math.round(LOGICAL_H * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
}

function isBgmMuted(): boolean {
  return typeof audioExt.bgmMuted === 'boolean' ? audioExt.bgmMuted : bgmMutedFallback;
}

function setBgmMutedState(muted: boolean): void {
  bgmMutedFallback = muted;
  if (typeof audioExt.setBgmMuted === 'function') {
    audioExt.setBgmMuted(muted);
  } else {
    audioExt.bgmMuted = muted;
  }
}

function syncAudioIntensity(): void {
  if (!started || engine.gameOver) {
    if (lastAudioIntensity !== 0) {
      lastAudioIntensity = 0;
      audioExt.setIntensity?.(0);
    }
    return;
  }
  const hasBoss = engine.enemies.some((e) => e.isBoss);
  const level: 0 | 1 | 2 =
    !engine.waveActive ? 0 : hasBoss || engine.leakAlarm >= 70 ? 2 : 1;
  if (level !== lastAudioIntensity) {
    lastAudioIntensity = level;
    audioExt.setIntensity?.(level);
  }
}

function detectInitialLang(): Lang {
  try {
    const qp = new URLSearchParams(window.location.search).get('lang');
    if (qp && qp.trim()) {
      return normalizeLang(qp);
    }
  } catch {
    // ignore URL parsing errors
  }
  try {
    const siteSaved = localStorage.getItem(SITE_LANG_STORAGE_KEY);
    if (siteSaved && siteSaved.trim()) {
      return normalizeLang(siteSaved);
    }
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && saved.trim()) {
      return normalizeLang(saved);
    }
  } catch {
    // ignore storage restrictions
  }
  // Always default to English unless explicit ?lang= or saved user preference exists
  return 'en';
}

function detectInitialDifficulty(): Difficulty {
  try {
    const saved = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (saved === 'normal' || saved === 'crunch' || saved === 'gdpr') return saved;
  } catch {
    // ignore storage restrictions
  }
  return 'normal';
}

function detectInitialStage(): StageId {
  try {
    const saved = localStorage.getItem(STAGE_STORAGE_KEY);
    if (saved && STAGE_ORDER.includes(saved as StageId)) return saved as StageId;
  } catch {
    // ignore storage restrictions
  }
  return STAGE_ORDER[0] ?? 'meadow';
}

let selectedDifficulty: Difficulty = detectInitialDifficulty();
let selectedStageId: StageId = detectInitialStage();

syncCanvasHiDpi();

const engine = new GameEngine({
  onToast: (msg, tone = 'info') => showToast(msg, tone),
  onGameEnd: (kind) => showResultModal(kind),
  onHudDirty: () => {
    refreshHud();
    if (ui.selectedPadId) syncOpenRadialMenu();
  },
  onPolicyDraft: (choices) => openPolicyDraft(choices),
  onAchievement: (def) => handleAchievementUnlocked(def),
});

engine.lang = 'en';
engine.setDifficulty(selectedDifficulty);
engine.setStage(selectedStageId);
const renderer = new GameRenderer(canvas);

function getStageStartGold(stageId: StageId, diff: Difficulty): number {
  const stage = getStageConfig(stageId);
  const delta = DIFFICULTY_CONFIG[diff].startGold - DIFFICULTY_CONFIG.normal.startGold;
  return Math.max(150, stage.startingGold + delta);
}

function updateDifficultyTip(_diff: Difficulty = selectedDifficulty): void {
  for (const btn of diffPillBtns) {
    const d = btn.dataset.diff as Difficulty | undefined;
    if (!d) continue;
    btn.title = t(engine.lang, `diff.${d}Tip`, { g: getStageStartGold(selectedStageId, d) });
  }
}

function isStageCleared(id: StageId): boolean {
  const cfg = getStageConfig(id);
  const best = loadStageBestRecord(id);
  return Boolean(best && best.wave >= cfg.waves.length && best.stars >= 1);
}

function getTrilogyClearedCount(): number {
  return STAGE_ORDER.reduce((acc, id) => acc + (isStageCleared(id) ? 1 : 0), 0);
}

function isTrilogyComplete(): boolean {
  return STAGE_ORDER.length > 0 && STAGE_ORDER.every((id) => isStageCleared(id));
}

function updateTitleBestRecord(): void {
  // Stage progress stars/best-wave live cleanly inside each minimal stage card
}

function renderStagePicker(): void {
  const lang = engine.lang;
  const cardsHtml = STAGE_ORDER.map((id) => {
    const cfg = getStageConfig(id);
    const isActive = id === selectedStageId;
    const icoName = STAGE_ICONS[id] ?? 'map';
    const icoCls = STAGE_ICON_COLORS[id] ?? 'ico-gold';
    const name = t(lang, `stage.${id}.name`);
    const tag = t(lang, `stage.${id}.tag`);
    const best = loadStageBestRecord(id);
    const totalWaves = cfg.waves.length;

    let recordHtml = '';
    let recordCls = 'is-empty';
    if (best && best.wave >= totalWaves && best.stars > 0) {
      const starsHtml = renderStarsSvg(best.stars, 3, 11);
      recordHtml =
        best.wave > totalWaves
          ? `${starsHtml} · ${iconSvg('infinity', { size: 11, className: 'ico-cyan' })}${escapeHtml(t(lang, 'canvas.waveFmt', { n: best.wave }))}`
          : starsHtml;
      recordCls = 'is-cleared';
    } else if (best && best.wave > 0) {
      recordHtml = escapeHtml(t(lang, 'stage.bestWave', { w: best.wave }));
      recordCls = 'is-progress';
    }

    const goldVal = getStageStartGold(id, selectedDifficulty);

    return `
      <button
        class="stage-card stage-card-minimal${isActive ? ' active' : ''}"
        type="button"
        role="radio"
        aria-checked="${isActive ? 'true' : 'false'}"
        data-stage="${id}"
        title="${escapeHtml(name)} (${escapeHtml(tag)}, $${goldVal})"
      >
        <div class="stage-card-title">
          <span class="stage-card-ico ${icoCls}">${iconSvg(icoName, { size: 16 })}</span>
          <span class="stage-card-title-name">${escapeHtml(name)}</span>
        </div>
        ${recordHtml ? `<span class="stage-record ${recordCls}">${recordHtml}</span>` : ''}
      </button>`;
  }).join('');

  stagePicker.innerHTML = `<div class="stage-grid">${cardsHtml}</div>`;
}

function applyStage(id: StageId, persist = true): void {
  selectedStageId = id;
  if (persist) {
    try {
      localStorage.setItem(STAGE_STORAGE_KEY, id);
    } catch {
      // ignore storage errors
    }
  }
  closeRadialMenu();
  cancelTargeting();
  clearSelectedEntity();
  disarmRestart();
  lastPreviewCacheKey = '';
  lastPoliciesCacheKey = '';
  engine.setDifficulty(selectedDifficulty);
  engine.setStage(id);
  renderStagePicker();
  updateTitleBestRecord();
  updateDifficultyTip(selectedDifficulty);
  refreshHud();
}

function applyDifficulty(diff: Difficulty, persist = true): void {
  selectedDifficulty = diff;
  engine.setDifficulty(diff);
  if (persist) {
    try {
      localStorage.setItem(DIFFICULTY_STORAGE_KEY, diff);
    } catch {
      // ignore storage errors
    }
  }
  for (const btn of diffPillBtns) {
    const isActive = btn.dataset.diff === diff;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
  }
  renderStagePicker();
  updateDifficultyTip(diff);
}

function disarmRestart(): void {
  restartArmed = false;
  if (restartArmTimer !== null) {
    window.clearTimeout(restartArmTimer);
    restartArmTimer = null;
  }
  btnRestart.classList.remove('is-armed');
}

function disarmResetSave(): void {
  resetSaveArmed = false;
  if (resetSaveArmTimer !== null) {
    window.clearTimeout(resetSaveArmTimer);
    resetSaveArmTimer = null;
  }
  const resetBtn = achievementsContent.querySelector<HTMLButtonElement>('#btn-reset-save');
  if (resetBtn) {
    resetBtn.classList.remove('is-armed');
    resetBtn.innerHTML = `${iconSvg('trash2', { size: 13 })}<span>${escapeHtml(t(engine.lang, 'career.resetBtn'))}</span>`;
  }
}

function restartCurrentStage(showRestartToast = true): void {
  disarmRestart();
  lastResultKind = null;
  overlayResult.classList.add('hidden');
  closeHelpModal();
  closePolicyDraft();
  closeRadialMenu();
  cancelTargeting();
  clearSelectedEntity();
  waveTooltipPinned = false;
  wavePreviewTooltip.classList.add('hidden');
  lastPreviewCacheKey = '';
  lastPoliciesCacheKey = '';
  engine.setDifficulty(selectedDifficulty);
  engine.reset();
  audioExt.startBgm?.();
  lastAudioIntensity = -1;
  applyLanguage();
  if (showRestartToast) {
    const stage = engine.getStage();
    const stageName = t(engine.lang, `stage.${stage.id}.name`);
    showToast(t(engine.lang, 'hud.restarted', { name: stageName }), 'info', 'rotateCcw');
  }
}

window.addEventListener('resize', () => {
  syncCanvasHiDpi();
  if (ui.selectedPadId) renderRadialMenu(ui.selectedPadId);
});

function showToast(
  msg: string,
  tone: 'info' | 'warn' | 'good' | 'purple' = 'info',
  iconOverride?: IconName
): void {
  const icoName: IconName =
    iconOverride ??
    (tone === 'warn'
      ? 'alertTriangle'
      : tone === 'good'
        ? 'sparkles'
        : tone === 'purple'
          ? 'database'
          : 'megaphone');
  const icoCls =
    tone === 'warn'
      ? 'ico-crimson'
      : tone === 'good'
        ? 'ico-gold'
        : tone === 'purple'
          ? 'ico-purple'
          : 'ico-cyan';
  bannerToast.innerHTML = `${iconSvg(icoName, { size: 15, className: icoCls })}<span class="toast-msg">${escapeHtml(msg)}</span>`;
  bannerToast.className = `tone-${tone}`;
  if (toastTimeout !== null) window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    bannerToast.classList.add('hidden');
  }, 3200);
}

let langSwitchSeq = 0;

async function setLanguage(
  rawCode: string,
  opts: { persist?: boolean; syncUrl?: boolean } = {}
): Promise<void> {
  const { persist = true, syncUrl = true } = opts;
  const code = normalizeLang(rawCode);
  const seq = ++langSwitchSeq;
  await loadLocale(code);
  if (seq !== langSwitchSeq) return;
  engine.lang = code;
  if (persist) {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, code);
      localStorage.setItem(SITE_LANG_STORAGE_KEY, code);
    } catch {
      // ignore storage restrictions
    }
  }
  if (syncUrl) {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('lang') !== code) {
        url.searchParams.set('lang', code);
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      }
    } catch {
      // ignore restricted history environments
    }
  }
  applyLanguage();
}

function applyLanguage(): void {
  const lang = engine.lang;
  const meta = getLangMeta(lang);

  document.documentElement.lang = lang;
  document.documentElement.dir = 'ltr';
  stageWrap.dir = 'ltr';
  canvas.dir = 'ltr';

  for (const el of RTL_TEXT_CONTAINERS) {
    el.dir = meta.dir;
  }

  hudLangCode.textContent = meta.short;
  titleLangName.textContent = meta.name;
  const langLabel = t(lang, 'title.langLabel');
  btnLangHud.title = `${langLabel}: ${meta.name}`;
  btnLangHud.setAttribute('aria-label', `${langLabel}: ${meta.name}`);
  btnLangTitle.title = langLabel;
  btnLangTitle.setAttribute('aria-label', `${langLabel}: ${meta.name}`);
  if (!langPopover.classList.contains('hidden')) {
    renderLangPopover();
  }
  btnBackSite.href = `../?lang=${encodeURIComponent(lang)}`;

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(lang, key);
  });

  statHpWrap.title = t(lang, 'hud.hpTip');
  statGoldWrap.title = t(lang, 'hud.goldTip');
  statWaveWrap.title = t(lang, 'hud.waveTip');
  alarmLabel.textContent = t(lang, 'hud.alarm');
  btnSpeed.title = t(lang, 'hud.speedTip');
  btnPause.title = t(lang, 'hud.pauseTip');
  btnRestart.title = t(lang, 'hud.restartTip');
  btnMusic.title = t(lang, 'hud.musicTip');
  btnMute.title = t(lang, 'hud.muteTip');
  btnHelp.title = t(lang, 'hud.helpTip');
  btnTitleHelp.title = t(lang, 'hud.helpTip');
  btnTitleHelp.setAttribute('aria-label', t(lang, 'hud.helpTip'));
  btnSkillSteal.title = t(lang, 'skill.steal');
  btnSkillRug.title = t(lang, 'skill.rug');
  btnSkillDelete.title = t(lang, 'skill.delete');
  btnSkillHero.title = t(lang, 'skill.apology');

  renderStagePicker();
  updateTitleBestRecord();

  const guideIcons: Array<{ ico: IconName; cls: string }> = [
    { ico: 'briefcase', cls: 'ico-gold' },
    { ico: 'sparkles', cls: 'ico-purple' },
    { ico: 'swords', cls: 'ico-cyan' },
  ];
  helpContent.innerHTML = [1, 2, 3]
    .map((i) => {
      const g = guideIcons[i - 1];
      return `
      <div class="help-box">
        <h3><span class="help-box-ico ${g.cls}">${iconSvg(g.ico, { size: 15 })}</span><span>${escapeHtml(t(lang, `help.sec${i}t`))}</span></h3>
        <p>${escapeHtml(t(lang, `help.sec${i}b`))}</p>
      </div>`;
    })
    .join('');

  const hotkeysList: Array<[string, string]> = [
    ['1-4', t(lang, 'hotkey.skills')],
    ['Space', t(lang, 'hotkey.pause')],
    ['F', t(lang, 'hotkey.speed')],
    ['N', t(lang, 'hotkey.wave')],
    ['R', t(lang, 'hotkey.restart')],
    ['M', t(lang, 'hotkey.mute')],
    ['Esc', t(lang, 'hotkey.cancel')],
  ];
  helpHotkeys.innerHTML = `
    <span class="hotkey-strip-label">${iconSvg('keyboard', { size: 14, className: 'ico-gold' })}<span>${escapeHtml(t(lang, 'hotkey.title'))}</span></span>
    <div class="hotkey-list">
      ${hotkeysList
        .map(
          ([k, lbl]) =>
            `<span class="hotkey-item"><kbd class="hotkey-kbd">${k}</kbd><span>${escapeHtml(lbl)}</span></span>`
        )
        .join('')}
    </div>
  `;

  renderFieldCodex();
  updateAchievementIndicators();
  renderAchievementsWall();
  refreshActiveAchievementToastLang();
  updateDifficultyTip(selectedDifficulty);

  lastPreviewCacheKey = '';
  lastPoliciesCacheKey = '';
  refreshHud();
  if (openPolicyChoices && !overlayPolicy.classList.contains('hidden')) {
    renderPolicyChoices(openPolicyChoices);
  }
  if (ui.selectedPadId) renderRadialMenu(ui.selectedPadId);
  else if (ui.selectedEntity) refreshSelectedEntityInspector();
  if (!overlayResult.classList.contains('hidden') && lastResultKind) {
    renderResultModalContent(lastResultKind);
  }
  updateTargetingHint();
  renderTutorialCard();
}

// ---- Visual Field Codex & Satirical Achievements Wall inside Help Modal ----

function setHelpTab(tab: 'guide' | 'codex' | 'achievements'): void {
  const isGuide = tab === 'guide';
  const isCodex = tab === 'codex';
  const isAch = tab === 'achievements';
  tabHelpGuide.classList.toggle('active', isGuide);
  tabHelpGuide.setAttribute('aria-selected', isGuide ? 'true' : 'false');
  tabHelpCodex.classList.toggle('active', isCodex);
  tabHelpCodex.setAttribute('aria-selected', isCodex ? 'true' : 'false');
  tabHelpAchievements.classList.toggle('active', isAch);
  tabHelpAchievements.setAttribute('aria-selected', isAch ? 'true' : 'false');
  helpPanelGuide.classList.toggle('hidden', !isGuide);
  helpPanelCodex.classList.toggle('hidden', !isCodex);
  helpPanelAchievements.classList.toggle('hidden', !isAch);
  if (isAch) {
    updateAchievementIndicators();
    renderAchievementsWall();
  } else {
    disarmResetSave();
  }
}

function openHelpModal(tab?: 'guide' | 'codex' | 'achievements'): void {
  disarmRestart();
  if (overlayHelp.classList.contains('hidden')) {
    pausedBeforeHelp = engine.paused;
  }
  if (started) {
    engine.paused = true;
  }
  if (tab) {
    setHelpTab(tab);
  } else {
    updateAchievementIndicators();
    renderAchievementsWall();
  }
  overlayHelp.classList.remove('hidden');
  refreshHud();
}

function closeHelpModal(): void {
  if (overlayHelp.classList.contains('hidden')) return;
  disarmResetSave();
  overlayHelp.classList.add('hidden');
  if (started && overlayPolicy.classList.contains('hidden')) {
    engine.paused = pausedBeforeHelp;
  }
  refreshHud();
}

function getUnlockedAchievementSet(): Set<AchievementId> {
  const list = Array.isArray(engine.unlockedAchievements) ? engine.unlockedAchievements : [];
  return new Set<AchievementId>(list);
}

function updateAchievementIndicators(): void {
  const lang = engine.lang;
  const unlocked = getUnlockedAchievementSet();
  const total = ACHIEVEMENTS.length;
  const count = ACHIEVEMENTS.reduce((acc, def) => acc + (unlocked.has(def.id) ? 1 : 0), 0);

  titleAchCount.textContent = `${count} / ${total}`;
  btnTitleAchievements.title = t(lang, 'ach.titlePillTip', { n: count, total });
  btnTitleAchievements.classList.toggle('is-complete', total > 0 && count >= total);
  tabAchLabel.textContent = t(lang, 'help.tabAchievements', { n: count, total });
}

function renderAchievementsWall(): void {
  const lang = engine.lang;
  const unlocked = getUnlockedAchievementSet();
  const total = ACHIEVEMENTS.length;
  const count = ACHIEVEMENTS.reduce((acc, def) => acc + (unlocked.has(def.id) ? 1 : 0), 0);
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  const summarySubHtml =
    total > 0 && count >= total
      ? `${iconSvg('crown', { size: 13, className: 'ico-gold' })} ${escapeHtml(t(lang, 'ach.allDone', { total }))}`
      : escapeHtml(t(lang, 'ach.wallSub', { total }));

  const cardsHtml = ACHIEVEMENTS.map((def) => {
    const isUnlocked = unlocked.has(def.id);
    const title = t(lang, `ach.${def.id}.title`);
    const desc = t(lang, `ach.${def.id}.desc`);
    const statusHtml = isUnlocked
      ? `${iconSvg('check', { size: 10, strokeWidth: 2.6 })}<span>${escapeHtml(t(lang, 'ach.statusUnlocked'))}</span>`
      : `${iconSvg('lock', { size: 10, strokeWidth: 2.3 })}<span>${escapeHtml(t(lang, 'ach.statusLocked'))}</span>`;
    return `
      <div class="ach-card ${isUnlocked ? 'is-unlocked' : 'is-locked'}" data-ach-id="${def.id}">
        <div class="ach-medal">
          <span class="ach-medal-ico">${safeIconSvg(def.icon, { size: 22, strokeWidth: 2.1 })}</span>
          ${isUnlocked ? '' : `<span class="ach-lock-dot" aria-hidden="true">${iconSvg('lock', { size: 10, strokeWidth: 2.4 })}</span>`}
        </div>
        <div class="ach-info">
          <div class="ach-head">
            <span class="ach-title">${escapeHtml(title)}</span>
            <span class="ach-badge">${statusHtml}</span>
          </div>
          <div class="ach-desc">${escapeHtml(desc)}</div>
        </div>
      </div>`;
  }).join('');

  const career = loadCareerStats();
  const stolenDisplay = `+$${career.totalGoldStolen.toLocaleString()}`;
  const endlessDisplay =
    career.bestEndlessWave > 0 ? t(lang, 'canvas.waveFmt', { n: career.bestEndlessWave }) : '—';

  achievementsContent.innerHTML = `
    <div class="ach-summary">
      <div class="ach-summary-top">
        <span class="ach-summary-title">${iconSvg('trophy', { size: 15, className: 'ico-gold' })}<span>${t(lang, 'ach.wallTitle')}</span></span>
        <span class="ach-summary-count" dir="ltr">${count} / ${total}</span>
      </div>
      <div class="ach-summary-sub">${summarySubHtml}</div>
      <div class="ach-progress-bar">
        <div class="ach-progress-fill" style="width:${pct}%"></div>
      </div>
    </div>
    <div class="career-bar" id="career-stats-bar">
      <div class="career-bar-head">
        <span class="career-bar-title">${iconSvg('award', { size: 13, className: 'ico-cyan' })}<span>${t(lang, 'career.title')}</span></span>
        <span class="career-runs-pill" data-career="runs">${t(lang, 'career.runs', { n: career.runsFinished })}</span>
      </div>
      <div class="career-grid">
        <div class="career-cell is-gold">
          <span class="career-val" dir="ltr" data-career="victories">${career.victories}</span>
          <span class="career-lbl">${t(lang, 'career.victories')}</span>
        </div>
        <div class="career-cell">
          <span class="career-val" dir="ltr" data-career="blocked">${career.totalBlocked.toLocaleString()}</span>
          <span class="career-lbl">${t(lang, 'career.blocked')}</span>
        </div>
        <div class="career-cell is-gold">
          <span class="career-val" dir="ltr" data-career="vips">${career.totalVipsEscorted.toLocaleString()}</span>
          <span class="career-lbl">${t(lang, 'career.vips')}</span>
        </div>
        <div class="career-cell is-purple">
          <span class="career-val" dir="ltr" data-career="stolen">${stolenDisplay}</span>
          <span class="career-lbl">${t(lang, 'career.stolen')}</span>
        </div>
        <div class="career-cell">
          <span class="career-val" dir="ltr" data-career="endless">${endlessDisplay}</span>
          <span class="career-lbl">${t(lang, 'career.endless')}</span>
        </div>
      </div>
    </div>
    <div class="ach-grid">${cardsHtml}</div>
    <div class="ach-reset-row">
      <span class="ach-reset-note">${t(lang, 'career.resetNote')}</span>
      <button class="reset-save-btn${resetSaveArmed ? ' is-armed' : ''}" id="btn-reset-save" type="button">
        ${
          resetSaveArmed
            ? `${iconSvg('alertTriangle', { size: 13 })}<span>${t(lang, 'career.resetConfirm')}</span>`
            : `${iconSvg('trash2', { size: 13 })}<span>${t(lang, 'career.resetBtn')}</span>`
        }
      </button>
    </div>
  `;
}

function populateAchievementToast(def: AchievementDef): void {
  const lang = engine.lang;
  achToastIcon.innerHTML = safeIconSvg(def.icon, { size: 22, strokeWidth: 2.2 });
  achToastKicker.innerHTML = `${iconSvg('trophy', { size: 11, className: 'ico-gold' })}<span>${escapeHtml(t(lang, 'ach.unlockedKicker'))}</span>`;
  achToastTitle.textContent = t(lang, `ach.${def.id}.title`);
  achToastDesc.textContent = t(lang, `ach.${def.id}.desc`);
}

function refreshActiveAchievementToastLang(): void {
  if (activeAchievementToastDef && !achievementToast.classList.contains('hidden')) {
    populateAchievementToast(activeAchievementToastDef);
  }
}

function pumpAchievementToastQueue(): void {
  if (activeAchievementToastDef || achievementToastQueue.length === 0) return;
  const next = achievementToastQueue.shift();
  if (!next) return;

  activeAchievementToastDef = next;
  populateAchievementToast(next);
  achievementToast.classList.remove('hidden', 'is-visible');
  void achievementToast.offsetWidth;
  achievementToast.classList.add('is-visible');

  if (achToastHideTimer !== null) window.clearTimeout(achToastHideTimer);
  if (achToastCleanupTimer !== null) window.clearTimeout(achToastCleanupTimer);

  achToastHideTimer = window.setTimeout(() => {
    achievementToast.classList.remove('is-visible');
    achToastCleanupTimer = window.setTimeout(() => {
      achievementToast.classList.add('hidden');
      activeAchievementToastDef = null;
      pumpAchievementToastQueue();
    }, 360);
  }, 3800);
}

function handleAchievementUnlocked(def: AchievementDef): void {
  updateAchievementIndicators();
  renderAchievementsWall();
  const alreadyQueued =
    activeAchievementToastDef?.id === def.id ||
    achievementToastQueue.some((item) => item.id === def.id);
  if (!alreadyQueued) {
    achievementToastQueue.push(def);
    pumpAchievementToastQueue();
  }
}

function renderFieldCodex(): void {
  const lang = engine.lang;

  const coreCards: Array<{
    img: string;
    name: string;
    badge: string;
    warnPill?: string;
    desc: string;
    extra?: string;
  }> = [
    {
      img: './assets/castle-t3.webp',
      name: t(lang, 'codex.castle.name'),
      badge: `${iconSvg('castle', { size: 12, className: 'ico-gold' })} 20 HP`,
      desc: t(lang, 'codex.castle.desc'),
      extra: 'is-gold',
    },
    {
      img: './assets/hero-rage.webp',
      name: t(lang, 'codex.hero.name'),
      badge: `${iconSvg('megaphone', { size: 12, className: 'ico-crimson' })} / ${iconSvg('briefcase', { size: 12, className: 'ico-gold' })} Lv.5`,
      desc: t(lang, 'codex.hero.desc'),
    },
    {
      img: './assets/vip-exec.webp',
      name: t(lang, 'codex.vip.name'),
      badge: `${iconSvg('coins', { size: 12, className: 'ico-gold' })} +$${VIP_PAYOUT} / 2x`,
      warnPill: `${iconSvg('alertTriangle', { size: 11, className: 'ico-crimson' })} ${escapeHtml(t(lang, 'hud.vipWarnShort'))}`,
      desc: t(lang, 'codex.vip.desc'),
      extra: 'is-gold',
    },
  ];

  const coreHtml = `<div class="codex-grid codex-core-grid">${coreCards
    .map(
      (c) => `
      <article class="codex-card codex-core-card ${c.extra ?? ''}">
        <div class="codex-core-top">
          <div class="codex-thumb">
            <img src="${c.img}" alt="${escapeHtml(c.name)}" loading="eager" decoding="async" draggable="false" />
          </div>
          <div class="codex-core-head">
            <span class="codex-name">${escapeHtml(c.name)}</span>
            <div class="codex-core-badges">
              <span class="codex-badge" dir="ltr">${c.badge}</span>
              ${c.warnPill ? `<span class="codex-pill is-warn">${c.warnPill}</span>` : ''}
            </div>
          </div>
        </div>
        <p class="codex-desc">${escapeHtml(c.desc)}</p>
      </article>`
    )
    .join('')}</div>`;

  const towerOrder: TowerBaseType[] = ['barracks', 'archer', 'mage', 'artillery'];
  const towersHtml = `<div class="codex-grid">${towerOrder
    .map((type) => {
      const lv1 = TOWER_STATS[type].lv1;
      const isArt = type === 'artillery';
      const name = getTowerTitle(lang, type, 'none');
      const desc = getTowerDesc(lang, type, 'none');
      const brIcons = BRANCH_ICONS[type];
      const nameA = getTowerTitle(lang, type, 'a');
      const nameB = getTowerTitle(lang, type, 'b');

      const keyStatPill =
        type === 'barracks'
          ? `<span class="codex-pill">${iconSvg('shield', { size: 11, className: 'ico-cyan' })} ${escapeHtml(getTowerTag(lang, type, 'none'))}</span>`
          : `<span class="codex-pill">${iconSvg('swords', { size: 11, className: 'ico-amber' })} ${escapeHtml(t(lang, 'stat.dmg'))} <bdi dir="ltr">${lv1.damage}</bdi></span>`;
      const vipPill = isArt
        ? `<span class="codex-pill is-warn">${iconSvg('alertTriangle', { size: 11, className: 'ico-crimson' })} ${escapeHtml(t(lang, 'stat.vipAoe'))}</span>`
        : `<span class="codex-pill is-safe">${iconSvg('briefcase', { size: 11, className: 'ico-gold' })} ${escapeHtml(t(lang, 'stat.safeVip'))}</span>`;

      return `
      <article class="codex-card codex-tower-card ${isArt ? 'is-boss' : ''}">
        <div class="codex-thumb">
          <img src="./assets/tower-${type}.webp" alt="${escapeHtml(name)}" loading="eager" decoding="async" draggable="false" />
        </div>
        <div class="codex-info">
          <div class="codex-head">
            <span class="codex-name">${escapeHtml(name)}</span>
            <span class="codex-badge is-price" dir="ltr">$${lv1.cost}</span>
          </div>
          <div class="codex-pills">
            ${keyStatPill}
            ${vipPill}
          </div>
          <p class="codex-desc">${escapeHtml(desc)}</p>
          <div class="codex-branches">
            <span class="codex-branch-kicker" dir="ltr">Lv.3</span>
            <span class="codex-branch-tag">${iconSvg(brIcons.a.ico, { size: 11, className: brIcons.a.cls })}<span>${escapeHtml(nameA)}</span></span>
            <span class="codex-branch-tag">${iconSvg(brIcons.b.ico, { size: 11, className: brIcons.b.cls })}<span>${escapeHtml(nameB)}</span></span>
          </div>
        </div>
      </article>`;
    })
    .join('')}</div>`;

  const enemyOrder: EnemyKind[] = ['dev', 'fork', 'auditor', 'veteran', 'gdpr'];
  const enemiesHtml = `<div class="codex-grid">${enemyOrder
    .map((kind) => {
      const arch = ENEMY_ARCHETYPES[kind];
      const name = t(lang, `enemy.${kind}.name`);
      const desc = t(lang, `enemy.${kind}.counter`);
      const armPct = Math.round(arch.armor * 100);
      const mrPct = Math.round(arch.magicResist * 100);

      const pills: string[] = [
        `<span class="codex-pill is-hp">${iconSvg('heart', { size: 11, className: 'ico-crimson' })} <bdi dir="ltr">${arch.hp}</bdi></span>`,
      ];
      if (arch.speed >= 70) {
        pills.push(
          `<span class="codex-pill is-speed">${iconSvg('gauge', { size: 11, className: 'ico-cyan' })} <bdi dir="ltr">${arch.speed}</bdi></span>`
        );
      }
      if (arch.armor >= 0.25) {
        pills.push(
          `<span class="codex-pill is-armor">${iconSvg('shield', { size: 11, className: 'ico-slate' })} ${escapeHtml(t(lang, 'inspect.armor'))} <bdi dir="ltr">${armPct}%</bdi></span>`
        );
      }
      if (arch.magicResist >= 0.25) {
        pills.push(
          `<span class="codex-pill is-mr">${iconSvg('sparkles', { size: 11, className: 'ico-emerald' })} ${escapeHtml(t(lang, 'inspect.mr'))} <bdi dir="ltr">${mrPct}%</bdi></span>`
        );
      }

      const badge = arch.isBoss
        ? `${iconSvg('crown', { size: 11, className: 'ico-gold' })} BOSS · +$${arch.reward}`
        : `+$${arch.reward}`;

      return `
      <article class="codex-card codex-enemy-card ${arch.isBoss ? 'is-boss is-boss-wide' : ''}">
        <div class="codex-thumb">
          <img src="./assets/enemy-${kind}.webp" alt="${escapeHtml(name)}" loading="eager" decoding="async" draggable="false" />
        </div>
        <div class="codex-info">
          <div class="codex-head">
            <span class="codex-name">${escapeHtml(name)}</span>
            <span class="codex-badge ${arch.isBoss ? 'is-boss-badge' : 'is-price'}" dir="ltr">${badge}</span>
          </div>
          <div class="codex-pills">${pills.join('')}</div>
          <p class="codex-desc">${escapeHtml(desc)}</p>
        </div>
      </article>`;
    })
    .join('')}</div>`;

  codexContent.innerHTML = `
    <section class="codex-section">
      <h3>${iconSvg('castle', { size: 15, className: 'ico-gold' })}<span>${escapeHtml(t(lang, 'codex.secFortress'))}</span></h3>
      ${coreHtml}
    </section>
    <section class="codex-section">
      <h3>${iconSvg('swords', { size: 15, className: 'ico-cyan' })}<span>${escapeHtml(t(lang, 'codex.secTowers'))}</span></h3>
      ${towersHtml}
    </section>
    <section class="codex-section">
      <h3>${iconSvg('bug', { size: 15, className: 'ico-crimson' })}<span>${escapeHtml(t(lang, 'codex.secEnemies'))}</span></h3>
      ${enemiesHtml}
    </section>
  `;
}

// ---- Boardroom Policy 3-Choice Draft Modal & HUD Badges ----

function getPolicyDef(id: PolicyId): PolicyChoice | undefined {
  return knownPolicies.get(id) ?? POLICY_POOL.find((p) => p.id === id);
}

function getPolicyTitle(p: PolicyChoice, lang: Lang): string {
  return t(lang, `policy.${p.id}.title`);
}

function getPolicyDesc(p: PolicyChoice, lang: Lang): string {
  return t(lang, `policy.${p.id}.desc`);
}

function renderPolicyChoices(choices: PolicyChoice[]): void {
  const lang = engine.lang;
  policyChoicesEl.innerHTML = '';
  choices.forEach((choice, idx) => {
    knownPolicies.set(choice.id, choice);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'policy-card';
    card.dataset.policyId = choice.id;
    card.style.animationDelay = `${idx * 65}ms`;
    card.innerHTML = `
      <div class="policy-icon-ring">${safeIconSvg(choice.icon, { size: 26, strokeWidth: 2 })}</div>
      <div class="policy-title">${getPolicyTitle(choice, lang)}</div>
      <div class="policy-desc">${getPolicyDesc(choice, lang)}</div>
      <div class="policy-cta">
        <span class="policy-key">${idx + 1}</span>
        <span>${t(lang, 'policy.signBtn')}</span>
      </div>
    `;
    card.addEventListener('click', (ev) => {
      ev.stopPropagation();
      pickPolicyChoice(choice);
    });
    policyChoicesEl.appendChild(card);
  });
}

function openPolicyDraft(choices: PolicyChoice[]): void {
  if (!choices || choices.length === 0) return;
  disarmRestart();
  openPolicyChoices = choices;
  // Unhide & render BEFORE clearing targeting/menus so any nested refreshHud() sees the modal open and never recurses!
  renderPolicyChoices(choices);
  overlayPolicy.classList.remove('hidden');
  closeRadialMenu();
  ui.targetingMode = 'none';
  ui.rallyTowerId = null;
  updateTargetingHint();
  clearSelectedEntity();
  waveTooltipPinned = false;
  wavePreviewTooltip.classList.add('hidden');
  pinnedPolicyBadgeId = null;
  refreshHud();
}

function closePolicyDraft(): void {
  openPolicyChoices = null;
  overlayPolicy.classList.add('hidden');
  policyChoicesEl.innerHTML = '';
}

function pickPolicyChoice(choice: PolicyChoice): void {
  if (!openPolicyChoices) return;
  const ok = engine.selectPolicy(choice.id);
  if (ok || !engine.pendingPolicies) {
    closePolicyDraft();
    lastPoliciesCacheKey = '';
    showToast(
      t(engine.lang, 'policy.signedToast', { name: getPolicyTitle(choice, engine.lang) }),
      'good',
      isIconName(choice.icon) ? choice.icon : 'scrollText'
    );
    refreshHud();
  }
}

function refreshActivePolicyBadges(): void {
  const ids = engine.activePolicies;
  const key = `${ids.join(',')}:${engine.lang}:${pinnedPolicyBadgeId ?? ''}`;
  if (key === lastPoliciesCacheKey) return;
  lastPoliciesCacheKey = key;

  if (!started || ids.length === 0) {
    hudPolicies.classList.add('hidden');
    hudPolicies.innerHTML = '';
    return;
  }

  const lang = engine.lang;
  hudPolicies.classList.remove('hidden');
  hudPolicies.innerHTML = '';

  for (const id of ids) {
    const def = getPolicyDef(id);
    if (!def) continue;
    const title = getPolicyTitle(def, lang);
    const desc = getPolicyDesc(def, lang);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `policy-badge ${pinnedPolicyBadgeId === id ? 'is-open' : ''}`.trim();
    btn.dataset.policyId = id;
    btn.title = `${title} — ${desc}`;
    btn.setAttribute('aria-label', `${title}: ${desc}`);
    btn.innerHTML = `
      <span class="policy-badge-ico">${safeIconSvg(def.icon, { size: 15, strokeWidth: 2.1 })}</span>
      <div class="policy-tooltip">
        <div class="policy-tt-head">${safeIconSvg(def.icon, { size: 13, className: 'ico-gold' })}<span>${title}</span></div>
        <div class="policy-tt-desc">${desc}</div>
      </div>
    `;
    btn.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation();
      lastUiPointerTs = performance.now();
    });
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      lastUiPointerTs = performance.now();
      pinnedPolicyBadgeId = pinnedPolicyBadgeId === id ? null : id;
      lastPoliciesCacheKey = '';
      refreshActivePolicyBadges();
    });
    hudPolicies.appendChild(btn);
  }
}

// ---- Next-Wave Composition Preview ----

const ENTITY_META: Record<EnemyKind | 'vip', { ico: IconName; icoCls: string; order: number }> = {
  gdpr: { ico: 'scale', icoCls: 'ico-crimson', order: 0 },
  vip: { ico: 'briefcase', icoCls: 'ico-gold', order: 1 },
  auditor: { ico: 'search', icoCls: 'ico-slate', order: 2 },
  veteran: { ico: 'terminal', icoCls: 'ico-emerald', order: 3 },
  fork: { ico: 'gitFork', icoCls: 'ico-cyan', order: 4 },
  dev: { ico: 'bug', icoCls: 'ico-amber', order: 5 },
};

function summarizeWave(def: WaveDef): {
  counts: Array<{ kind: EnemyKind | 'vip'; count: number }>;
  laneMask: number;
} {
  const map = new Map<EnemyKind | 'vip', number>();
  let laneMask = 0;
  for (const ev of def.events) {
    map.set(ev.entityType, (map.get(ev.entityType) ?? 0) + 1);
    laneMask |= ev.lane === 0 ? 1 : 2;
  }
  const counts = Array.from(map.entries())
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => ENTITY_META[a.kind].order - ENTITY_META[b.kind].order);
  return { counts, laneMask };
}

function refreshWavePreview(): void {
  const def = engine.getNextWaveDef();
  const stage = engine.getStage();
  const cacheKey = `${engine.stageId}:${def.waveNumber}:${engine.lang}`;
  if (cacheKey === lastPreviewCacheKey) return;
  lastPreviewCacheKey = cacheKey;

  const { counts, laneMask } = summarizeWave(def);
  const lang = engine.lang;

  wavePreviewPill.innerHTML = counts
    .map(({ kind, count }) => {
      const meta = ENTITY_META[kind];
      const ico = iconSvg(meta.ico, { size: 12, className: meta.icoCls });
      const cls = kind === 'vip' ? 'wp-chip wp-vip' : kind === 'gdpr' ? 'wp-chip wp-boss' : 'wp-chip';
      const label = kind === 'vip' ? `VIP×${count}` : kind === 'gdpr' ? `BOSS×${count}` : `×${count}`;
      return `<span class="${cls}">${ico}<span>${label}</span></span>`;
    })
    .join('');

  const laneText =
    laneMask === 3
      ? t(lang, 'hud.laneDual')
      : laneMask === 2
        ? `↓ ${t(lang, `stage.${stage.id}.entry1`)}`
        : `↑ ${t(lang, `stage.${stage.id}.entry0`)}`;
  const waveTitle =
    def.waveNumber > stage.waves.length
      ? t(lang, 'wave.endless', { n: def.waveNumber })
      : t(lang, `wave.${stage.id}.${def.waveNumber}`);

  const rowsHtml = counts
    .map(({ kind, count }) => {
      const meta = ENTITY_META[kind];
      const ico = iconSvg(meta.ico, { size: 13, className: meta.icoCls });
      const name = t(lang, `enemy.${kind}.name`);
      const hint = t(lang, `enemy.hint.${kind}`);
      const rowCls =
        kind === 'vip' ? 'wpt-row wpt-row-vip' : kind === 'gdpr' ? 'wpt-row wpt-row-boss' : 'wpt-row';
      return `<div class="${rowCls}"><span class="wpt-name">${ico}<span>${escapeHtml(name)} ×${count}</span></span><span class="wpt-hint">${escapeHtml(hint)}</span></div>`;
    })
    .join('');

  wavePreviewTooltip.innerHTML = `
    <div class="wpt-head">
      <span class="wpt-title">${escapeHtml(t(lang, 'hud.callWave', { n: def.waveNumber }))} · ${escapeHtml(t(lang, 'hud.nextWaveLabel'))}</span>
      <span class="wpt-lane">${escapeHtml(laneText)}</span>
    </div>
    <div class="wpt-sub">${escapeHtml(waveTitle)}</div>
    <div class="wpt-list">${rowsHtml}</div>
  `;
}

// ---- Live Hero Status Pill ----

function refreshHeroPill(): void {
  const h = engine.hero;
  const lang = engine.lang;
  heroLv.textContent = `Lv.${h.level}`;

  const portraitKey: 'vip' | 'rage' = h.stance === 'vip' ? 'vip' : 'rage';
  if (portraitKey !== lastHeroPortraitKey) {
    lastHeroPortraitKey = portraitKey;
    heroAvatar.src = portraitKey === 'vip' ? './assets/hero-vip.webp' : './assets/hero-rage.webp';
  }

  heroPill.classList.toggle('is-vip', h.alive && h.stance === 'vip');
  heroPill.classList.toggle('is-rage', h.alive && h.stance === 'rage');
  heroPill.classList.toggle('is-dead', !h.alive);

  if (!h.alive) {
    const secs = Math.max(1, Math.ceil(h.respawnTimer));
    heroRespawnOverlay.textContent = `${secs}s`;
    heroRespawnOverlay.classList.remove('hidden');
    const key = `dead:${secs}:${lang}`;
    if (key !== lastHeroStanceKey) {
      lastHeroStanceKey = key;
      heroStance.innerHTML = `${iconSvg('clock', { size: 11 })}<span>${escapeHtml(t(lang, 'hero.stanceDead', { s: secs }))}</span>`;
      heroStance.className = 'hero-stance stance-dead';
    }
  } else {
    heroRespawnOverlay.classList.add('hidden');
    const mode = h.stance === 'vip' ? 'vip' : h.stance === 'rage' ? 'rage' : 'idle';
    const key = `${mode}:${lang}`;
    if (key !== lastHeroStanceKey) {
      lastHeroStanceKey = key;
      if (mode === 'vip') {
        heroStance.innerHTML = `${iconSvg('briefcase', { size: 11 })}<span>${escapeHtml(t(lang, 'hero.stanceVip'))}</span>`;
        heroStance.className = 'hero-stance stance-vip';
      } else if (mode === 'rage') {
        heroStance.innerHTML = `${iconSvg('megaphone', { size: 11 })}<span>${escapeHtml(t(lang, 'hero.stanceRage'))}</span>`;
        heroStance.className = 'hero-stance stance-rage';
      } else {
        heroStance.innerHTML = `${iconSvg('zap', { size: 11 })}<span>${escapeHtml(t(lang, 'hero.stanceIdle'))}</span>`;
        heroStance.className = 'hero-stance stance-idle';
      }
    }
  }

  const hpPct = h.alive ? Math.max(0, Math.min(100, (h.hp / Math.max(1, h.maxHp)) * 100)) : 0;
  heroHpFill.style.width = `${hpPct}%`;
  heroHpFill.classList.toggle('hp-mid', hpPct > 30 && hpPct <= 60);
  heroHpFill.classList.toggle('hp-low', hpPct <= 30);

  const xpPct = h.level >= 5 ? 100 : Math.max(0, Math.min(100, (h.xp / Math.max(1, h.nextXp)) * 100));
  heroXpFill.style.width = `${xpPct}%`;
}

function showHeroInspector(): void {
  const h = engine.hero;
  const lang = engine.lang;
  const stateKey = !h.alive
    ? 'ui.heroDead'
    : h.stance === 'vip'
      ? 'ui.heroEscort'
      : h.stance === 'rage'
        ? 'ui.heroRage'
        : 'ui.heroIdle';
  const chips: Array<{ text: string; cls?: string }> = [
    { text: `${iconSvg('heart', { size: 12, className: 'ico-crimson' })} <bdi dir="ltr">${Math.max(0, Math.round(h.hp))}/${h.maxHp}</bdi>` },
    { text: `${iconSvg('megaphone', { size: 12, className: 'ico-amber' })} ${t(lang, 'stat.dmg')} <bdi dir="ltr">${h.damage}</bdi>` },
    {
      text:
        h.level >= 5
          ? `${iconSvg('star', { size: 12, className: 'ico-star-filled', fill: 'currentColor' })} ${escapeHtml(t(lang, 'ui.max'))}`
          : `${iconSvg('star', { size: 12, className: 'ico-gold' })} <bdi dir="ltr">XP ${Math.round(h.xp)}/${h.nextXp}</bdi>`,
      cls: 'chip-special',
    },
    {
      text: `${iconSvg('briefcase', { size: 12, className: 'ico-gold' })} ${h.stance === 'vip' ? t(lang, 'hero.stanceVip') : t(lang, 'stat.safeVip')}`,
      cls: 'chip-vip-safe',
    },
  ];
  const heroLine =
    h.alive && h.stance === 'idle'
      ? t(lang, 'hero.clickHint')
      : t(lang, stateKey, { s: Math.ceil(h.respawnTimer) });
  showInspector(
    t(lang, 'ui.heroTitle', { lv: h.level }),
    heroLine,
    chips,
    '',
    'left'
  );
}

// ---- HUD Refresh ----

function refreshHud(): void {
  const stage = engine.getStage();
  statHp.textContent = String(engine.lives);
  statGold.textContent = String(engine.gold);
  const waveKey = engine.endlessMode ? `E:${engine.waveIndex}` : `N:${engine.waveIndex}/${stage.waves.length}`;
  if (waveKey !== lastWaveRenderKey) {
    lastWaveRenderKey = waveKey;
    if (engine.endlessMode) {
      statWave.innerHTML = `${iconSvg('infinity', { size: 14, className: 'ico-cyan' })}<span>${engine.waveIndex}</span>`;
    } else {
      statWave.textContent = `${engine.waveIndex} / ${stage.waves.length}`;
    }
  }

  const pct = Math.round(engine.leakAlarm);
  alarmPct.textContent = `${pct}%`;
  alarmFill.style.width = `${pct}%`;
  alarmWrap.classList.toggle('danger', pct >= 70);

  refreshHeroPill();

  // Sync Boardroom Policy Draft modal defensively with engine.pendingPolicies
  if (started && !engine.gameOver && engine.pendingPolicies && engine.pendingPolicies.length > 0) {
    if (overlayPolicy.classList.contains('hidden')) {
      openPolicyDraft(engine.pendingPolicies);
    }
  } else if (!overlayPolicy.classList.contains('hidden')) {
    closePolicyDraft();
  }

  refreshActivePolicyBadges();

  if (ui.selectedEntity && !ui.selectedPadId && overlayPolicy.classList.contains('hidden')) {
    refreshSelectedEntityInspector();
  } else if (ui.selectedPadId && !radialHoveringBtn && overlayPolicy.classList.contains('hidden')) {
    refreshSelectedTowerCombatStats();
  }

  // Wave Call button + Next-Wave Preview
  const policyOpen = !overlayPolicy.classList.contains('hidden');
  const canCall = started && !policyOpen && engine.canCallNextWave();
  waveCallWrap.classList.toggle('hidden', !canCall);
  if (canCall) {
    refreshWavePreview();
    const nextW = engine.waveIndex + 1;
    const bonus = engine.getEarlyCallBonus();
    if (engine.waveIndex === 0) {
      waveCallText.textContent = t(engine.lang, 'hud.startWave');
    } else if (bonus > 0) {
      const cdSuffix = !engine.waveActive && engine.betweenWaveTimer > 0 ? `${Math.ceil(engine.betweenWaveTimer)}s · ` : '';
      waveCallText.textContent = `${t(engine.lang, 'hud.callWave', { n: nextW })} (${cdSuffix}${t(engine.lang, 'hud.earlyBonus', { g: bonus })})`;
    } else {
      waveCallText.textContent = t(engine.lang, 'hud.callWave', { n: nextW });
    }
    btnCallWave.classList.toggle('pulse', !engine.waveActive);
  } else {
    waveTooltipPinned = false;
    wavePreviewTooltip.classList.add('hidden');
  }

  // Skills CDs
  const setCd = (btn: HTMLButtonElement, cdEl: HTMLSpanElement, val: number, active = false) => {
    btn.disabled = !started || engine.gameOver || policyOpen || val > 0;
    btn.classList.toggle('active', active);
    cdEl.textContent = val > 0 ? `${Math.ceil(val)}s` : '';
  };
  setCd(btnSkillSteal, cdSteal, engine.skillCds.steal);
  setCd(btnSkillRug, cdRug, engine.skillCds.rug, ui.targetingMode === 'rug');
  setCd(btnSkillDelete, cdDelete, engine.skillCds.delete, ui.targetingMode === 'delete');
  setCd(btnSkillHero, cdHero, !engine.hero.alive ? engine.hero.respawnTimer : engine.skillCds.apology);

  // Speed, pause, restart, music & mute UI
  btnSpeed.textContent = `${engine.speedMultiplier}x`;
  btnSpeed.classList.toggle('active', engine.speedMultiplier === 2);
  btnSpeed.classList.toggle('speed-3x', engine.speedMultiplier === 3);
  if (lastPausedIconState !== engine.paused) {
    lastPausedIconState = engine.paused;
    btnPause.innerHTML = iconSvg(engine.paused ? 'play' : 'pause', { size: 15 });
  }
  btnPause.classList.toggle('active', engine.paused);
  btnRestart.disabled = !started;
  if (!started && restartArmed) disarmRestart();

  const musicOff = sfx.muted || isBgmMuted();
  btnMusic.classList.toggle('is-off', musicOff);
  btnMusic.classList.toggle('is-on', !musicOff && started);
  btnMusic.setAttribute('aria-pressed', musicOff ? 'true' : 'false');
  if (lastMutedIconState !== sfx.muted) {
    lastMutedIconState = sfx.muted;
    btnMute.innerHTML = iconSvg(sfx.muted ? 'volumeX' : 'volume2', { size: 15 });
  }
  btnMute.classList.toggle('is-muted', sfx.muted);
  btnMute.setAttribute('aria-pressed', sfx.muted ? 'true' : 'false');

  syncAudioIntensity();
}

function updateTargetingHint(): void {
  if (ui.targetingMode === 'none') {
    targetingHint.classList.add('hidden');
  } else {
    targetingHint.textContent = t(engine.lang, `hint.${ui.targetingMode}`);
    targetingHint.classList.remove('hidden');
  }
}

function cancelTargeting(): void {
  ui.targetingMode = 'none';
  ui.rallyTowerId = null;
  updateTargetingHint();
  refreshHud();
}

function clearSelectedEntity(): void {
  ui.selectedEntity = null;
  entityInspectorCacheKey = '';
  entityInspectorChipsHtml = '';
  inspectorCard.classList.remove('insp-mode-enemy', 'insp-mode-vip');
  if (!ui.selectedPadId) {
    inspectedTowerId = null;
    inspectedTowerRenderKey = '';
    inspectorCard.classList.add('hidden');
  }
}

function closeRadialMenu(): void {
  ui.selectedPadId = null;
  ui.previewRange = null;
  radialHoveringBtn = false;
  radialHoveringPriorityBtn = false;
  radialMenuRenderKey = '';
  inspectedTowerId = null;
  inspectedTowerRenderKey = '';
  radialMenu.classList.add('hidden');
  radialMenu.innerHTML = '';
  if (!ui.selectedEntity) {
    inspectorCard.classList.remove('insp-mode-enemy', 'insp-mode-vip');
    inspectorCard.classList.add('hidden');
  }
}

function buildTowerChips(
  type: TowerBaseType,
  stat: TowerStat,
  branch: TowerBranch,
  prevStat?: TowerStat
): Array<{ text: string; cls?: string }> {
  const lang = engine.lang;
  const chips: Array<{ text: string; cls?: string }> = [];

  if (type === 'barracks') {
    const dmg = stat.guardDamage ?? stat.damage;
    const prevDmg = prevStat ? (prevStat.guardDamage ?? prevStat.damage) : null;
    const hp = stat.guardHp ?? 85;
    const prevHp = prevStat?.guardHp ?? null;
    chips.push({
      text: `${iconSvg('swords', { size: 12, className: 'ico-amber' })} ${t(lang, 'stat.dmg')} <bdi dir="ltr">${prevDmg && prevDmg !== dmg ? `${prevDmg}→${dmg}` : dmg}</bdi>`,
    });
    chips.push({
      text: `${iconSvg('heart', { size: 12, className: 'ico-crimson' })} ${t(lang, 'stat.hp')} <bdi dir="ltr">${prevHp && prevHp !== hp ? `${prevHp}→${hp}` : hp}</bdi>`,
    });
    if ((stat.guardArmor ?? 0) > 0) {
      chips.push({ text: `${iconSvg('shield', { size: 12, className: 'ico-slate' })} <bdi dir="ltr">${Math.round((stat.guardArmor ?? 0) * 100)}%</bdi>` });
    }
  } else {
    const prevDmg = prevStat?.damage ?? null;
    const prevRng = prevStat?.range ?? null;
    chips.push({
      text: `${iconSvg('swords', { size: 12, className: 'ico-amber' })} ${t(lang, 'stat.dmg')} <bdi dir="ltr">${prevDmg && prevDmg !== stat.damage ? `${prevDmg}→${stat.damage}` : stat.damage}</bdi>`,
    });
    chips.push({
      text: `${iconSvg('crosshair', { size: 12, className: 'ico-cyan' })} ${t(lang, 'stat.range')} <bdi dir="ltr">${prevRng && prevRng !== stat.range ? `${prevRng}→${stat.range}` : stat.range}</bdi>`,
    });
    if (stat.splashRadius) {
      chips.push({ text: `${iconSvg('bomb', { size: 12, className: 'ico-amber' })} ${t(lang, 'stat.splash')} <bdi dir="ltr">${stat.splashRadius}</bdi>` });
    }
  }

  chips.push({ text: `${iconSvg('sparkles', { size: 12, className: 'ico-purple' })} ${getTowerTag(lang, type, branch)}`, cls: 'chip-special' });

  if (type === 'artillery') {
    chips.push({
      text: `${iconSvg('alertTriangle', { size: 12, className: 'ico-crimson' })} ${t(lang, 'stat.vipAoe')}`,
      cls: 'chip-vip-warn',
    });
  } else {
    chips.push({
      text: `${iconSvg('briefcase', { size: 12, className: 'ico-gold' })} ${t(lang, 'stat.safeVip')}`,
      cls: 'chip-vip-safe',
    });
  }

  return chips;
}

function showInspector(
  title: string,
  desc: string,
  chips: Array<{ text: string; cls?: string }> = [],
  costBadge = '',
  dock: 'left' | 'right' = 'right'
): void {
  entityInspectorCacheKey = '';
  entityInspectorChipsHtml = '';
  entityInspectorBadgeHtml = '';
  inspectedTowerId = null;
  inspectedTowerRenderKey = '';
  const chipsHtml =
    chips.length > 0
      ? `<div class="inspector-chips">${chips
          .map((c) => `<span class="stat-chip ${c.cls ?? ''}">${c.text}</span>`)
          .join('')}</div>`
      : '';
  const costHtml = costBadge ? `<span class="insp-cost" dir="ltr">${costBadge}</span>` : '';
  inspectorCard.classList.remove('insp-mode-enemy', 'insp-mode-vip');
  inspectorCard.innerHTML = `<div class="insp-head"><h4>${title}</h4>${costHtml}</div>${chipsHtml}<p>${desc}</p>`;
  inspectorCard.classList.toggle('dock-left', dock === 'left');
  inspectorCard.classList.toggle('dock-right-high', dock === 'right' && !waveCallWrap.classList.contains('hidden'));
  inspectorCard.classList.remove('hidden');
}

function getPriorityMeta(
  prio: TargetPriority | undefined,
  lang: Lang
): { prio: TargetPriority; icoHtml: string; icoSmallHtml: string; label: string; desc: string; cls: string } {
  const mode: TargetPriority = prio === 'strong' || prio === 'weak' ? prio : 'first';
  if (mode === 'strong') {
    return {
      prio: 'strong',
      icoHtml: iconSvg('dumbbell', { size: 17, className: 'ico-amber' }),
      icoSmallHtml: iconSvg('dumbbell', { size: 13, className: 'ico-amber' }),
      label: t(lang, 'prio.strong'),
      desc: t(lang, 'prio.strongDesc'),
      cls: 'prio-strong',
    };
  }
  if (mode === 'weak') {
    return {
      prio: 'weak',
      icoHtml: iconSvg('droplet', { size: 17, className: 'ico-crimson' }),
      icoSmallHtml: iconSvg('droplet', { size: 13, className: 'ico-crimson' }),
      label: t(lang, 'prio.weak'),
      desc: t(lang, 'prio.weakDesc'),
      cls: 'prio-weak',
    };
  }
  return {
    prio: 'first',
    icoHtml: iconSvg('target', { size: 17, className: 'ico-cyan' }),
    icoSmallHtml: iconSvg('target', { size: 13, className: 'ico-cyan' }),
    label: t(lang, 'prio.first'),
    desc: t(lang, 'prio.firstDesc'),
    cls: 'prio-first',
  };
}

function syncPriorityUiInPlace(tower: Tower, animateRadial = false): void {
  if (tower.type === 'barracks') return;
  const lang = engine.lang;
  const pm = getPriorityMeta(tower.targetPriority, lang);

  // Update open radial Target Priority button in-place (zero DOM clobber)
  const radBtn = radialMenu.querySelector<HTMLButtonElement>(`.priority-btn[data-tower-id="${tower.id}"]`);
  if (radBtn) {
    radBtn.classList.remove('prio-first', 'prio-strong', 'prio-weak');
    radBtn.classList.add(pm.cls);
    const icoEl = radBtn.querySelector<HTMLElement>('.radial-ico');
    const lblEl = radBtn.querySelector<HTMLElement>('.radial-lbl');
    const costEl = radBtn.querySelector<HTMLElement>('.radial-cost');
    if (icoEl) icoEl.innerHTML = pm.icoHtml;
    if (lblEl) lblEl.textContent = t(lang, 'prio.label');
    if (costEl) costEl.textContent = pm.label;
    if (animateRadial) {
      radBtn.classList.remove('is-pop');
      void radBtn.offsetWidth;
      radBtn.classList.add('is-pop');
    }
  }

  // Update Inspector Priority pill in-place if currently viewing this tower
  const inspBtn = inspectorCard.querySelector<HTMLButtonElement>(`.insp-prio-btn[data-tower-id="${tower.id}"]`);
  if (inspBtn) {
    inspBtn.classList.remove('prio-first', 'prio-strong', 'prio-weak');
    inspBtn.classList.add(pm.cls);
    const leftEl = inspBtn.querySelector<HTMLElement>('.insp-prio-left');
    if (leftEl) {
      leftEl.innerHTML = `${pm.icoSmallHtml} <span>${t(lang, 'prio.label')}:</span> <strong>${pm.label}</strong>`;
    }
  }
}

function cycleSelectedTowerPriority(towerId: number, dock?: 'left' | 'right'): void {
  const next = engine.cycleTowerTargetPriority(towerId);
  if (!next) return;
  const tower = engine.towers.find((tw) => tw.id === towerId);
  if (!tower) return;
  syncPriorityUiInPlace(tower, true);
  if (radialHoveringPriorityBtn && dock) {
    const pm = getPriorityMeta(tower.targetPriority, engine.lang);
    showInspector(
      `${pm.icoSmallHtml} ${t(engine.lang, 'prio.label')} · ${pm.label}`,
      pm.desc,
      [],
      pm.label,
      dock
    );
  }
}

function renderTowerInspector(tower: Tower, dock: 'left' | 'right', costBadge = ''): void {
  const lang = engine.lang;
  const expectedKey = `${tower.id}:${tower.level}:${tower.branch}:${costBadge}:${dock}:${lang}`;
  if (
    inspectedTowerId === tower.id &&
    inspectedTowerRenderKey === expectedKey &&
    !inspectorCard.classList.contains('hidden')
  ) {
    // Update live stats & priority pill in-place so interactive buttons (e.g. .insp-prio-btn) are NEVER destroyed mid-click
    inspectorCard.classList.toggle('dock-left', dock === 'left');
    inspectorCard.classList.toggle('dock-right-high', dock === 'right' && !waveCallWrap.classList.contains('hidden'));
    refreshSelectedTowerCombatStats();
    return;
  }

  const curStat = getTowerStat(tower.type, tower.level, tower.branch);
  const title = `${getTowerTitle(lang, tower.type, tower.branch)} · Lv.${tower.level}`;
  const desc = getTowerDesc(lang, tower.type, tower.branch);
  const chips = buildTowerChips(tower.type, curStat, tower.branch);
  const kills = Math.max(0, Math.round(tower.kills ?? 0));
  const totalDmg = Math.max(0, Math.round(tower.totalDamage ?? 0));
  const goldEarned = Math.max(0, Math.round(tower.goldEarned ?? 0));

  entityInspectorCacheKey = '';
  entityInspectorChipsHtml = '';
  entityInspectorBadgeHtml = '';
  inspectedTowerId = tower.id;
  inspectedTowerRenderKey = expectedKey;

  const chipsHtml =
    chips.length > 0
      ? `<div class="inspector-chips">${chips
          .map((c) => `<span class="stat-chip ${c.cls ?? ''}">${c.text}</span>`)
          .join('')}</div>`
      : '';
  const costHtml = costBadge ? `<span class="insp-cost" dir="ltr">${costBadge}</span>` : '';

  let prioHtml = '';
  if (tower.type !== 'barracks') {
    const pm = getPriorityMeta(tower.targetPriority, lang);
    prioHtml = `
      <div class="insp-prio-bar">
        <button
          type="button"
          class="insp-prio-btn ${pm.cls}"
          data-tower-id="${tower.id}"
          title="${t(lang, 'prio.btnTip')}"
        >
          <span class="insp-prio-left">${pm.icoSmallHtml} <span>${t(lang, 'prio.label')}:</span> <strong>${pm.label}</strong></span>
          <span class="insp-prio-cycle">${iconSvg('rotateCcw', { size: 11 })}</span>
        </button>
      </div>
    `;
  }

  const statsHtml = `
    <div class="insp-combat-stats" data-tower-id="${tower.id}">
      <span class="insp-cs-item insp-cs-kills">${iconSvg('swords', { size: 12, className: 'ico-crimson' })} <span class="insp-cs-lbl">${t(lang, 'inspect.kills')}</span> <strong class="insp-cs-val" data-field="kills">${kills}</strong></span>
      <span class="insp-cs-sep" aria-hidden="true">·</span>
      <span class="insp-cs-item insp-cs-dmg">${iconSvg('zap', { size: 12, className: 'ico-cyan' })} <span class="insp-cs-lbl">${t(lang, 'inspect.totalDmg')}</span> <strong class="insp-cs-val" data-field="dmg">${totalDmg}</strong></span>
      <span class="insp-cs-gold-wrap${goldEarned > 0 ? '' : ' hidden'}"><span class="insp-cs-sep" aria-hidden="true">·</span><span class="insp-cs-item insp-cs-gold">${iconSvg('coins', { size: 12, className: 'ico-gold' })} <span class="insp-cs-lbl">${t(lang, 'inspect.goldEarned')}</span> <strong class="insp-cs-val" data-field="gold">+$${goldEarned}</strong></span></span>
    </div>
  `;

  inspectorCard.classList.remove('insp-mode-enemy', 'insp-mode-vip');
  inspectorCard.innerHTML = `<div class="insp-head"><h4>${title}</h4>${costHtml}</div>${chipsHtml}<p>${desc}</p>${prioHtml}${statsHtml}`;
  inspectorCard.classList.toggle('dock-left', dock === 'left');
  inspectorCard.classList.toggle('dock-right-high', dock === 'right' && !waveCallWrap.classList.contains('hidden'));
  inspectorCard.classList.remove('hidden');
}

function refreshSelectedTowerCombatStats(): void {
  if (!ui.selectedPadId || inspectedTowerId === null || inspectorCard.classList.contains('hidden')) return;
  const tower = engine.getTowerAtPad(ui.selectedPadId);
  if (!tower || tower.id !== inspectedTowerId) return;

  syncPriorityUiInPlace(tower, false);

  const statsEl = inspectorCard.querySelector<HTMLDivElement>('.insp-combat-stats');
  if (!statsEl) return;

  const killsStr = String(Math.max(0, Math.round(tower.kills ?? 0)));
  const dmgStr = String(Math.max(0, Math.round(tower.totalDamage ?? 0)));
  const goldEarned = Math.max(0, Math.round(tower.goldEarned ?? 0));

  const killsEl = statsEl.querySelector<HTMLElement>('[data-field="kills"]');
  if (killsEl && killsEl.textContent !== killsStr) killsEl.textContent = killsStr;

  const dmgEl = statsEl.querySelector<HTMLElement>('[data-field="dmg"]');
  if (dmgEl && dmgEl.textContent !== dmgStr) dmgEl.textContent = dmgStr;

  const goldWrap = statsEl.querySelector<HTMLElement>('.insp-cs-gold-wrap');
  const goldEl = statsEl.querySelector<HTMLElement>('[data-field="gold"]');
  if (goldWrap) {
    goldWrap.classList.toggle('hidden', goldEarned <= 0);
  }
  if (goldEl && goldEarned > 0) {
    const goldStr = `+$${goldEarned}`;
    if (goldEl.textContent !== goldStr) goldEl.textContent = goldStr;
  }
}

// Delegated handlers for inspector interactive buttons (never destroyed by 120ms live refreshes)
inspectorCard.addEventListener('pointerdown', (ev) => {
  if (ev.target instanceof Element && ev.target.closest('.insp-close, .insp-prio-btn')) {
    ev.stopPropagation();
    lastUiPointerTs = performance.now();
  }
});

inspectorCard.addEventListener('click', (ev) => {
  if (!(ev.target instanceof Element)) return;
  if (ev.target.closest('.insp-close')) {
    ev.stopPropagation();
    lastUiPointerTs = performance.now();
    clearSelectedEntity();
    return;
  }
  const prioBtn = ev.target.closest<HTMLButtonElement>('.insp-prio-btn');
  if (prioBtn) {
    ev.stopPropagation();
    lastUiPointerTs = performance.now();
    const towerId = Number(prioBtn.dataset.towerId);
    if (Number.isFinite(towerId)) {
      cycleSelectedTowerPriority(towerId);
    }
  }
});

// ---- Tap-to-Inspect Live Enemy & Golden VIP Encyclopedia Card ----

function renderEntityInspectorCard(
  mode: 'enemy' | 'vip',
  entityId: number,
  imgSrc: string,
  title: string,
  badge: string,
  barPct: number,
  barLabel: string,
  chips: Array<{ text: string; cls?: string }>,
  tipText: string,
  dock: 'left' | 'right'
): void {
  const clampedPct = Math.max(0, Math.min(100, barPct));
  const chipsHtml = chips
    .map((c) => `<span class="stat-chip ${c.cls ?? ''}">${c.text}</span>`)
    .join('');

  inspectorCard.classList.toggle('insp-mode-enemy', mode === 'enemy');
  inspectorCard.classList.toggle('insp-mode-vip', mode === 'vip');
  inspectorCard.classList.toggle('dock-left', dock === 'left');
  inspectorCard.classList.toggle('dock-right-high', dock === 'right' && !waveCallWrap.classList.contains('hidden'));

  const cacheKey = `${mode}:${entityId}:${engine.lang}`;
  if (entityInspectorCacheKey === cacheKey && !inspectorCard.classList.contains('hidden')) {
    // Update live stats in-place so .insp-close button DOM node stays intact during mouse hold/clicks!
    if (entityInspectorBadgeHtml !== badge) {
      const badgeEl = inspectorCard.querySelector<HTMLSpanElement>('.insp-cost');
      if (badgeEl) badgeEl.innerHTML = badge;
      entityInspectorBadgeHtml = badge;
    }
    const hpFillEl = inspectorCard.querySelector<HTMLDivElement>('.insp-hp-fill');
    if (hpFillEl) hpFillEl.style.width = `${clampedPct}%`;
    const hpTextEl = inspectorCard.querySelector<HTMLSpanElement>('.insp-hp-text');
    if (hpTextEl && hpTextEl.textContent !== barLabel) hpTextEl.textContent = barLabel;
    if (chipsHtml !== entityInspectorChipsHtml) {
      const chipsEl = inspectorCard.querySelector<HTMLDivElement>('.inspector-chips');
      if (chipsEl) chipsEl.innerHTML = chipsHtml;
      entityInspectorChipsHtml = chipsHtml;
    }
    return;
  }

  entityInspectorCacheKey = cacheKey;
  entityInspectorChipsHtml = chipsHtml;
  entityInspectorBadgeHtml = badge;
  inspectedTowerId = null;
  inspectedTowerRenderKey = '';
  inspectorCard.innerHTML = `
    <div class="insp-entity-row">
      <div class="insp-thumb">
        <img src="${imgSrc}" alt="${title}" draggable="false" />
      </div>
      <div class="insp-entity-main">
        <div class="insp-head">
          <h4>${title}</h4>
          <span class="insp-cost" dir="ltr">${badge}</span>
          <button class="insp-close" type="button" aria-label="Close">${iconSvg('x', { size: 12, strokeWidth: 2.5 })}</button>
        </div>
        <div class="insp-hp-wrap">
          <div class="insp-hp-fill ${mode === 'vip' ? 'is-vip-bar' : ''}" style="width:${clampedPct}%"></div>
          <span class="insp-hp-text${mode === 'enemy' ? ' is-ltr-num' : ''}"${mode === 'enemy' ? ' dir="ltr"' : ''}>${barLabel}</span>
        </div>
      </div>
    </div>
    <div class="inspector-chips">${chipsHtml}</div>
    <div class="insp-tip-box">${tipText}</div>
  `;
  inspectorCard.classList.remove('hidden');
}

function renderEnemyInspector(enemy: Enemy): void {
  const lang = engine.lang;
  const name = t(lang, `enemy.${enemy.kind}.name`);
  const hpCur = Math.max(0, Math.ceil(enemy.hp));
  const hpMax = Math.max(1, Math.ceil(enemy.maxHp));
  const hpPct = (hpCur / hpMax) * 100;
  const armorPct = Math.round(enemy.armor * 100);
  const mrPct = Math.round(enemy.magicResist * 100);

  const chips: Array<{ text: string; cls?: string }> = [];
  if (armorPct >= 25) {
    chips.push({ text: `${iconSvg('shield', { size: 12 })} ${t(lang, 'inspect.armor')} <bdi dir="ltr">${armorPct}%</bdi>`, cls: 'chip-armor' });
  }
  if (mrPct >= 25) {
    chips.push({ text: `${iconSvg('sparkles', { size: 12 })} ${t(lang, 'inspect.mr')} <bdi dir="ltr">${mrPct}%</bdi>`, cls: 'chip-mr' });
  }
  chips.push(
    { text: `${iconSvg('gauge', { size: 12 })} ${t(lang, 'inspect.speed')} <bdi dir="ltr">${Math.round(enemy.baseSpeed)}</bdi>`, cls: enemy.baseSpeed >= 70 ? 'chip-speed' : '' },
    { text: `${iconSvg('heart', { size: 12, className: 'ico-crimson' })} ${t(lang, 'inspect.lifeCost')} <bdi dir="ltr">-${enemy.lifeCost}</bdi>` }
  );

  if (enemy.enraged) chips.push({ text: `${iconSvg('flame', { size: 12, className: 'ico-amber' })} ${t(lang, 'inspect.statusEnraged')}`, cls: 'chip-status' });
  if (enemy.stunTimer > 0) chips.push({ text: `${iconSvg('zap', { size: 12, className: 'ico-purple' })} ${t(lang, 'inspect.statusStunned')}`, cls: 'chip-special' });
  if (enemy.slowTimer > 0) chips.push({ text: `${iconSvg('snowflake', { size: 12, className: 'ico-cyan' })} ${t(lang, 'inspect.statusSlowed')}`, cls: 'chip-speed' });

  const badge = enemy.isBoss
    ? `${iconSvg('crown', { size: 12, className: 'ico-gold' })} +$${enemy.reward}`
    : `+$${enemy.reward}`;
  const dock: 'left' | 'right' = enemy.x > LOGICAL_W * 0.52 ? 'left' : 'right';

  renderEntityInspectorCard(
    'enemy',
    enemy.id,
    `./assets/enemy-${enemy.kind}.webp`,
    name,
    badge,
    hpPct,
    `HP ${hpCur} / ${hpMax}`,
    chips,
    t(lang, `enemy.${enemy.kind}.counter`),
    dock
  );
}

function renderVipInspector(vip: VipUnit): void {
  const lang = engine.lang;
  const totalLen = Math.max(1, engine.getStage().sampledPaths[vip.lane].totalLength);
  const progressPct = Math.max(0, Math.min(100, Math.round((vip.dist / totalLen) * 100)));
  const isEscorted = vip.escortedByHero || vip.escortTime >= 1.2;
  const escortBonus = VIP_ESCORT_PAYOUT - VIP_PAYOUT;
  const livePayout = isEscorted ? vip.payout + escortBonus : vip.payout;

  const chips: Array<{ text: string; cls?: string }> = [
    isEscorted
      ? { text: `${iconSvg('briefcase', { size: 12, className: 'ico-gold' })} ${t(lang, 'inspect.vipEscorted', { g: livePayout })}`, cls: 'chip-vip-safe' }
      : { text: `${iconSvg('briefcase', { size: 12, className: 'ico-gold' })} ${t(lang, 'inspect.vipSolo', { g: livePayout })}`, cls: 'chip-vip-safe' },
    { text: `${iconSvg('gauge', { size: 12 })} ${t(lang, 'inspect.speed')} <bdi dir="ltr">${Math.round(vip.baseSpeed)}</bdi>`, cls: 'chip-speed' },
    { text: `${iconSvg('alertTriangle', { size: 12, className: 'ico-crimson' })} ${t(lang, 'stat.vipAoe')}`, cls: 'chip-vip-warn' },
  ];
  if (vip.fleeing) {
    chips.unshift({ text: `${iconSvg('wind', { size: 12, className: 'ico-crimson' })} ${t(lang, 'inspect.fleeing')}`, cls: 'chip-vip-warn' });
  } else if (isEscorted) {
    chips.push({
      text: vip.aoeShieldUsed
        ? `${iconSvg('alertTriangle', { size: 12, className: 'ico-amber' })} ${t(lang, 'inspect.shieldUsed')}`
        : `${iconSvg('shieldCheck', { size: 12, className: 'ico-purple' })} ${t(lang, 'inspect.shieldReady')}`,
      cls: vip.aoeShieldUsed ? 'chip-status' : 'chip-special',
    });
  }

  const dock: 'left' | 'right' = vip.x > LOGICAL_W * 0.52 ? 'left' : 'right';

  renderEntityInspectorCard(
    'vip',
    vip.id,
    './assets/vip-exec.webp',
    t(lang, 'enemy.vip.name'),
    `+$${livePayout}`,
    progressPct,
    t(lang, 'inspect.progress', { p: progressPct }),
    chips,
    t(lang, 'enemy.vip.counter'),
    dock
  );
}

function refreshSelectedEntityInspector(): void {
  const sel = ui.selectedEntity;
  if (!sel) return;
  if (sel.kind === 'enemy') {
    const enemy = engine.enemies.find((e) => e.id === sel.id && e.hp > 0);
    if (!enemy) {
      clearSelectedEntity();
      return;
    }
    renderEnemyInspector(enemy);
  } else {
    const vip = engine.vips.find((v) => v.id === sel.id);
    if (!vip) {
      clearSelectedEntity();
      return;
    }
    renderVipInspector(vip);
  }
}

// ---- Smarter Edge-Clamped Kingdom Rush Radial Tower Menu ----

interface RadialBtnDef {
  dx: number;
  dy: number;
  ico: string;
  label: string;
  costText: string;
  cost?: number;
  towerId?: number;
  isPriorityBtn?: boolean;
  unaffordable: boolean;
  isMax?: boolean;
  extraClass: string;
  previewRange?: RenderUIState['previewRange'];
  onInspect: () => void;
  onClick: (btnEl: HTMLButtonElement) => void;
}

function triggerUnaffordableFeedback(btnEl: HTMLButtonElement, missingGold: number): void {
  audioExt.error?.();
  btnEl.classList.remove('is-shake');
  void btnEl.offsetWidth;
  btnEl.classList.add('is-shake');
  showToast(t(engine.lang, 'hud.notEnoughGold', { g: Math.max(1, missingGold) }), 'warn');
}

function buildRadialRenderKey(padId: string, existing: Tower | undefined, stageW: number, stageH: number): string {
  const towerSig = existing ? `${existing.id}:${existing.level}:${existing.branch}` : 'empty';
  return `${engine.stageId}:${padId}:${towerSig}:${engine.lang}:${Math.round(stageW)}x${Math.round(stageH)}`;
}

function syncOpenRadialMenu(): void {
  if (!ui.selectedPadId) return;
  const pad = engine.getStage().pads.find((p) => p.id === ui.selectedPadId);
  if (!pad) {
    closeRadialMenu();
    return;
  }
  const existing = engine.getTowerAtPad(ui.selectedPadId);
  const stageRect = stageWrap.getBoundingClientRect();
  const stageW = stageRect.width || LOGICAL_W;
  const stageH = stageRect.height || LOGICAL_H;
  const expectedKey = buildRadialRenderKey(ui.selectedPadId, existing, stageW, stageH);

  if (expectedKey !== radialMenuRenderKey) {
    renderRadialMenu(ui.selectedPadId);
    return;
  }

  // Update button affordability & priority badge in-place so hover / previewRange / active clicks are NEVER clobbered!
  radialMenu.querySelectorAll<HTMLButtonElement>('.radial-btn[data-cost]').forEach((btn) => {
    const cost = Number(btn.dataset.cost);
    if (!Number.isFinite(cost)) return;
    const isUnaffordable = engine.gold < cost;
    btn.classList.toggle('unaffordable', isUnaffordable);
    if (isUnaffordable) btn.setAttribute('aria-disabled', 'true');
    else btn.removeAttribute('aria-disabled');
  });

  if (existing) {
    syncPriorityUiInPlace(existing, false);
    if (!radialHoveringBtn) {
      refreshSelectedTowerCombatStats();
    }
  }
}

function renderRadialMenu(padId: string): void {
  const pad = engine.getStage().pads.find((p) => p.id === padId);
  if (!pad) return closeRadialMenu();

  ui.selectedPadId = padId;
  ui.previewRange = null;
  radialHoveringBtn = false;
  radialHoveringPriorityBtn = false;

  const stageRect = stageWrap.getBoundingClientRect();
  const stageW = stageRect.width || LOGICAL_W;
  const stageH = stageRect.height || LOGICAL_H;
  const scale = Math.max(0.66, Math.min(1.0, stageW / 1060));

  const padX = (pad.x / LOGICAL_W) * stageW;
  const padY = (pad.y / LOGICAL_H) * stageH;

  // Compute live HUD-safe clamping rectangle inside #stage-wrap
  const hudTopRect = hudTop.getBoundingClientRect();
  const hudBottomRect = hudBottom.getBoundingClientRect();
  const minY = Math.max(46 * scale, (hudTopRect.bottom > stageRect.top ? hudTopRect.bottom - stageRect.top : 52) + 8);
  const maxY = Math.min(stageH - 56 * scale, (hudBottomRect.top > stageRect.top ? hudBottomRect.top - stageRect.top : stageH - 72) - 8);
  const minX = 8;
  const maxX = stageW - 8;

  const nearTop = padY - 94 * scale < minY;
  const nearBottom = padY + 94 * scale > maxY;
  const dock: 'left' | 'right' = pad.x > LOGICAL_W * 0.52 ? 'left' : 'right';

  const existing: Tower | undefined = engine.getTowerAtPad(padId);
  radialMenuRenderKey = buildRadialRenderKey(padId, existing, stageW, stageH);

  radialMenu.style.setProperty('--radial-scale', scale.toFixed(3));
  radialMenu.style.left = `${padX}px`;
  radialMenu.style.top = `${padY}px`;
  radialMenu.innerHTML = '<div class="radial-ring"></div>';
  radialMenu.classList.remove('hidden');

  const defs: RadialBtnDef[] = [];

  const showDefaultPadInspector = () => {
    if (!existing) {
      showInspector(
        t(engine.lang, 'ui.chooseTower'),
        t(engine.lang, 'ui.chooseTowerDesc'),
        [],
        '',
        dock
      );
    } else {
      renderTowerInspector(existing, dock);
    }
  };

  if (!existing) {
    const icoBarracks = iconSvg('shield', { size: 17, className: 'ico-cyan' });
    const icoArcher = iconSvg('radio', { size: 17, className: 'ico-amber' });
    const icoMage = iconSvg('wand2', { size: 17, className: 'ico-purple' });
    const icoArtillery = iconSvg('bomb', { size: 17, className: 'ico-crimson' });
    const buildSlots: Array<{ type: TowerBaseType; ico: string; dx: number; dy: number }> = nearTop
      ? [
          { type: 'barracks', ico: icoBarracks, dx: -76, dy: 6 },
          { type: 'archer', ico: icoArcher, dx: 76, dy: 6 },
          { type: 'mage', ico: icoMage, dx: -48, dy: 74 },
          { type: 'artillery', ico: icoArtillery, dx: 48, dy: 74 },
        ]
      : nearBottom
        ? [
            { type: 'barracks', ico: icoBarracks, dx: -76, dy: -6 },
            { type: 'archer', ico: icoArcher, dx: 76, dy: -6 },
            { type: 'mage', ico: icoMage, dx: -48, dy: -74 },
            { type: 'artillery', ico: icoArtillery, dx: 48, dy: -74 },
          ]
        : [
            { type: 'barracks', ico: icoBarracks, dx: -68, dy: -50 },
            { type: 'archer', ico: icoArcher, dx: 68, dy: -50 },
            { type: 'mage', ico: icoMage, dx: -68, dy: 50 },
            { type: 'artillery', ico: icoArtillery, dx: 68, dy: 50 },
          ];

    for (const sp of buildSlots) {
      const stat = getTowerStat(sp.type, 1, 'none');
      const title = getTowerTitle(engine.lang, sp.type, 'none');
      const desc = getTowerDesc(engine.lang, sp.type, 'none');
      const chips = buildTowerChips(sp.type, stat, 'none');
      const previewRange: RenderUIState['previewRange'] = {
        x: pad.x,
        y: pad.y,
        range: stat.range,
        splashRadius: stat.splashRadius,
        isArtillery: sp.type === 'artillery',
      };
      defs.push({
        dx: sp.dx * scale,
        dy: sp.dy * scale,
        ico: sp.ico,
        label: title,
        costText: `$${stat.cost}`,
        cost: stat.cost,
        unaffordable: engine.gold < stat.cost,
        extraClass: sp.type === 'artillery' ? 'artillery-warn' : '',
        previewRange,
        onInspect: () => showInspector(title, desc, chips, `$${stat.cost}`, dock),
        onClick: (btnEl) => {
          if (engine.gold < stat.cost) {
            showInspector(title, desc, chips, `$${stat.cost}`, dock);
            triggerUnaffordableFeedback(btnEl, stat.cost - engine.gold);
            return;
          }
          if (engine.buildTower(padId, sp.type)) {
            closeRadialMenu();
            notifyTutorialEvent('build');
          }
        },
      });
    }

    showDefaultPadInspector();
  } else {
    const curStat = getTowerStat(existing.type, existing.level, existing.branch);
    const title = `${getTowerTitle(engine.lang, existing.type, existing.branch)} · Lv.${existing.level}`;
    const desc = getTowerDesc(engine.lang, existing.type, existing.branch);
    showDefaultPadInspector();

    const isBarracks = existing.type === 'barracks';

    if (existing.level === 1) {
      const st = getTowerStat(existing.type, 2, 'none');
      const upgChips = buildTowerChips(existing.type, st, 'none', curStat);
      const pos = nearTop
        ? { dx: -68, dy: 14 }
        : nearBottom
          ? { dx: 0, dy: -76 }
          : { dx: 0, dy: -68 };
      defs.push({
        dx: pos.dx * scale,
        dy: pos.dy * scale,
        ico: iconSvg('arrowUp', { size: 17, className: 'ico-gold', strokeWidth: 2.4 }),
        label: `${t(engine.lang, 'ui.upgrade')} Lv.2`,
        costText: `$${st.cost}`,
        cost: st.cost,
        unaffordable: engine.gold < st.cost,
        extraClass: existing.type === 'artillery' ? 'artillery-warn' : '',
        previewRange: {
          x: pad.x,
          y: pad.y,
          range: st.range,
          splashRadius: st.splashRadius,
          isArtillery: existing.type === 'artillery',
        },
        onInspect: () => showInspector(`${title} → Lv.2`, desc, upgChips, `$${st.cost}`, dock),
        onClick: (btnEl) => {
          if (engine.gold < st.cost) {
            showInspector(`${title} → Lv.2`, desc, upgChips, `$${st.cost}`, dock);
            triggerUnaffordableFeedback(btnEl, st.cost - engine.gold);
            return;
          }
          if (engine.upgradeTower(existing.id, 'none')) closeRadialMenu();
        },
      });
    } else if (existing.level === 2) {
      const stA = getTowerStat(existing.type, 3, 'a');
      const stB = getTowerStat(existing.type, 3, 'b');
      const nameA = getTowerTitle(engine.lang, existing.type, 'a');
      const descA = getTowerDesc(engine.lang, existing.type, 'a');
      const nameB = getTowerTitle(engine.lang, existing.type, 'b');
      const descB = getTowerDesc(engine.lang, existing.type, 'b');
      const chipsA = buildTowerChips(existing.type, stA, 'a', curStat);
      const chipsB = buildTowerChips(existing.type, stB, 'b', curStat);
      const posA = nearTop ? { dx: -74, dy: 8 } : nearBottom ? { dx: -74, dy: -70 } : { dx: -70, dy: -54 };
      const posB = nearTop ? { dx: 74, dy: 8 } : nearBottom ? { dx: 74, dy: -70 } : { dx: 70, dy: -54 };
      const brIcons = BRANCH_ICONS[existing.type];

      defs.push({
        dx: posA.dx * scale,
        dy: posA.dy * scale,
        ico: iconSvg(brIcons.a.ico, { size: 17, className: brIcons.a.cls }),
        label: nameA,
        costText: `$${stA.cost}`,
        cost: stA.cost,
        unaffordable: engine.gold < stA.cost,
        extraClass: existing.type === 'artillery' ? 'artillery-warn' : '',
        previewRange: {
          x: pad.x,
          y: pad.y,
          range: stA.range,
          splashRadius: stA.splashRadius,
          isArtillery: existing.type === 'artillery',
        },
        onInspect: () => showInspector(nameA, descA, chipsA, `$${stA.cost}`, dock),
        onClick: (btnEl) => {
          if (engine.gold < stA.cost) {
            showInspector(nameA, descA, chipsA, `$${stA.cost}`, dock);
            triggerUnaffordableFeedback(btnEl, stA.cost - engine.gold);
            return;
          }
          if (engine.upgradeTower(existing.id, 'a')) closeRadialMenu();
        },
      });
      defs.push({
        dx: posB.dx * scale,
        dy: posB.dy * scale,
        ico: iconSvg(brIcons.b.ico, { size: 17, className: brIcons.b.cls }),
        label: nameB,
        costText: `$${stB.cost}`,
        cost: stB.cost,
        unaffordable: engine.gold < stB.cost,
        extraClass: existing.type === 'artillery' ? 'artillery-warn' : '',
        previewRange: {
          x: pad.x,
          y: pad.y,
          range: stB.range,
          splashRadius: stB.splashRadius,
          isArtillery: existing.type === 'artillery',
        },
        onInspect: () => showInspector(nameB, descB, chipsB, `$${stB.cost}`, dock),
        onClick: (btnEl) => {
          if (engine.gold < stB.cost) {
            showInspector(nameB, descB, chipsB, `$${stB.cost}`, dock);
            triggerUnaffordableFeedback(btnEl, stB.cost - engine.gold);
            return;
          }
          if (engine.upgradeTower(existing.id, 'b')) closeRadialMenu();
        },
      });
    } else {
      const posMax = nearTop
        ? { dx: -68, dy: 14 }
        : nearBottom
          ? { dx: 0, dy: -76 }
          : { dx: 0, dy: -68 };
      const maxLabel = t(engine.lang, 'ui.max');
      defs.push({
        dx: posMax.dx * scale,
        dy: posMax.dy * scale,
        ico: iconSvg('star', { size: 17, className: 'ico-star-filled', fill: 'currentColor' }),
        label: maxLabel,
        costText: maxLabel,
        unaffordable: false,
        isMax: true,
        extraClass: 'is-max',
        previewRange: null,
        onInspect: () => renderTowerInspector(existing, dock, maxLabel),
        onClick: () => renderTowerInspector(existing, dock, maxLabel),
      });
    }

    const posLeftAction = nearTop
      ? existing.level === 2
        ? { dx: -52, dy: 76 }
        : { dx: 0, dy: 76 }
      : nearBottom
        ? { dx: -68, dy: -6 }
        : { dx: -68, dy: 56 };

    if (isBarracks) {
      defs.push({
        dx: posLeftAction.dx * scale,
        dy: posLeftAction.dy * scale,
        ico: iconSvg('flag', { size: 17, className: 'ico-cyan' }),
        label: t(engine.lang, 'ui.rally'),
        costText: '',
        unaffordable: false,
        extraClass: 'rally-btn',
        previewRange: null,
        onInspect: () => showInspector(t(engine.lang, 'ui.rally'), t(engine.lang, 'hint.rally'), [], '', dock),
        onClick: () => {
          ui.targetingMode = 'rally';
          ui.rallyTowerId = existing.id;
          closeRadialMenu();
          updateTargetingHint();
        },
      });
    } else {
      const pm = getPriorityMeta(existing.targetPriority, engine.lang);
      defs.push({
        dx: posLeftAction.dx * scale,
        dy: posLeftAction.dy * scale,
        ico: pm.icoHtml,
        label: t(engine.lang, 'prio.label'),
        costText: pm.label,
        towerId: existing.id,
        isPriorityBtn: true,
        unaffordable: false,
        extraClass: `priority-btn ${pm.cls}`,
        previewRange: null,
        onInspect: () => {
          const curPm = getPriorityMeta(existing.targetPriority, engine.lang);
          showInspector(
            `${curPm.icoSmallHtml} ${t(engine.lang, 'prio.label')} · ${curPm.label}`,
            curPm.desc,
            [],
            curPm.label,
            dock
          );
        },
        onClick: () => {
          cycleSelectedTowerPriority(existing.id, dock);
        },
      });
    }

    const refund = Math.round(existing.totalSpent * 0.72);
    const posSell = nearTop
      ? existing.level === 2
        ? { dx: 52, dy: 76 }
        : { dx: 68, dy: 14 }
      : nearBottom
        ? { dx: 68, dy: -6 }
        : { dx: 68, dy: 56 };

    defs.push({
      dx: posSell.dx * scale,
      dy: posSell.dy * scale,
      ico: iconSvg('coins', { size: 17, className: 'ico-gold' }),
      label: t(engine.lang, 'ui.sell'),
      costText: `+$${refund}`,
      unaffordable: false,
      extraClass: 'sell-btn',
      previewRange: null,
      onInspect: () => showInspector(`${t(engine.lang, 'ui.sell')} (+$${refund})`, title, [], `+$${refund}`, dock),
      onClick: () => {
        if (engine.sellTower(existing.id)) closeRadialMenu();
      },
    });
  }

  // Create elements, then strictly clamp every button inside HUD-safe stage bounds!
  const entries: Array<{ el: HTMLButtonElement; dx: number; dy: number }> = [];
  for (const def of defs) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `radial-btn ${def.extraClass} ${def.unaffordable ? 'unaffordable' : ''}`.trim();
    b.title = def.label;
    if (def.cost !== undefined) b.dataset.cost = String(def.cost);
    if (def.towerId !== undefined) b.dataset.towerId = String(def.towerId);
    if (def.unaffordable) b.setAttribute('aria-disabled', 'true');
    b.style.left = `${def.dx}px`;
    b.style.top = `${def.dy}px`;
    const warnBadgeHtml = def.extraClass.includes('artillery-warn')
      ? `<span class="radial-warn-badge" aria-hidden="true">${iconSvg('alertTriangle', { size: 11, strokeWidth: 2.5 })}</span>`
      : '';
    b.innerHTML = `${warnBadgeHtml}<span class="radial-ico">${def.ico}</span><span class="radial-lbl">${def.label}</span><span class="radial-cost">${def.costText}</span>`;

    const activatePreview = () => {
      radialHoveringBtn = true;
      radialHoveringPriorityBtn = Boolean(def.isPriorityBtn);
      ui.previewRange = def.previewRange ?? null;
      def.onInspect();
    };
    const clearPreview = () => {
      ui.previewRange = null;
      radialHoveringBtn = false;
      radialHoveringPriorityBtn = false;
      if (ui.selectedPadId === padId) {
        showDefaultPadInspector();
      }
    };

    b.addEventListener('pointerenter', activatePreview);
    b.addEventListener('focus', activatePreview);
    b.addEventListener('pointerleave', clearPreview);
    b.addEventListener('blur', (ev) => {
      // Skip redundant blur teardown after pointerleave or when focus moves into inspectorCard (prevents clobbering .insp-prio-btn mid-click)
      if (!radialHoveringBtn && !ui.previewRange) return;
      if (ev.relatedTarget instanceof Node && inspectorCard.contains(ev.relatedTarget)) {
        ui.previewRange = null;
        radialHoveringBtn = false;
        radialHoveringPriorityBtn = false;
        return;
      }
      clearPreview();
    });
    b.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation();
      lastUiPointerTs = performance.now();
    });
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      lastUiPointerTs = performance.now();
      def.onClick(b);
    });
    radialMenu.appendChild(b);
    entries.push({ el: b, dx: def.dx, dy: def.dy });
  }

  // Measure actual rendered button sizes, guarantee non-overlap, and group-shift inside HUD-safe bounds
  const boxes = entries.map((entry) => ({
    el: entry.el,
    cx: padX + entry.dx,
    cy: padY + entry.dy,
    bw: entry.el.offsetWidth || 84 * scale,
    bh: entry.el.offsetHeight || 52 * scale,
  }));

  // 1) Pairwise separation pass to guarantee >= 7px gap between any two buttons
  const minGap = 7;
  for (let iter = 0; iter < 6; iter++) {
    let moved = false;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlapX = (a.bw + b.bw) / 2 + minGap - Math.abs(a.cx - b.cx);
        const overlapY = (a.bh + b.bh) / 2 + minGap - Math.abs(a.cy - b.cy);
        if (overlapX > 0 && overlapY > 0) {
          moved = true;
          if (overlapY <= overlapX) {
            const dir = a.cy <= b.cy ? -1 : 1;
            const push = overlapY / 2 + 0.5;
            a.cy += dir * push;
            b.cy -= dir * push;
          } else {
            const dir = a.cx <= b.cx ? -1 : 1;
            const push = overlapX / 2 + 0.5;
            a.cx += dir * push;
            b.cx -= dir * push;
          }
        }
      }
    }
    if (!moved) break;
  }

  // 2) Compute whole-group bounding box and shift all buttons together into [minX..maxX] x [minY..maxY]
  if (boxes.length > 0) {
    let gMinX = Infinity;
    let gMaxX = -Infinity;
    let gMinY = Infinity;
    let gMaxY = -Infinity;
    for (const b of boxes) {
      gMinX = Math.min(gMinX, b.cx - b.bw / 2);
      gMaxX = Math.max(gMaxX, b.cx + b.bw / 2);
      gMinY = Math.min(gMinY, b.cy - b.bh / 2);
      gMaxY = Math.max(gMaxY, b.cy + b.bh / 2);
    }

    let shiftX = 0;
    let shiftY = 0;
    if (gMinX < minX) shiftX = minX - gMinX;
    else if (gMaxX > maxX) shiftX = maxX - gMaxX;

    if (gMinY < minY) shiftY = minY - gMinY;
    else if (gMaxY > maxY) shiftY = maxY - gMaxY;

    for (const b of boxes) {
      const finalX = Math.max(minX + b.bw / 2, Math.min(maxX - b.bw / 2, b.cx + shiftX));
      const finalY = Math.max(minY + b.bh / 2, Math.min(maxY - b.bh / 2, b.cy + shiftY));
      b.el.style.left = `${Math.round(finalX - padX)}px`;
      b.el.style.top = `${Math.round(finalY - padY)}px`;
    }
  }
}

// ---- Shareable Satirical Result Card + Clipboard Recap ----

function buildRunRecapText(kind: 'victory' | 'defeat' | 'endless_over'): string {
  const s = engine.stats;
  const lang = engine.lang;
  const stage = engine.getStage();
  const stageName = t(lang, `stage.${stage.id}.name`);
  const stars = engine.getStars();
  const diffLabel = t(lang, `diff.${engine.difficulty}`);
  const runTag = `${stageName} · ${diffLabel}`;
  const isSaint = kind === 'victory' && engine.isTrueMitSaint();
  const tags = [
    isSaint ? t(lang, 'result.saintShort') : '',
    kind === 'victory' && isTrilogyComplete() ? t(lang, 'result.trilogyShort') : '',
  ]
    .filter(Boolean)
    .map((tag) => ` | ${tag}`)
    .join('');

  const policyNames = engine.activePolicies
    .map((id) => {
      const def = getPolicyDef(id);
      return def ? getPolicyTitle(def, lang) : '';
    })
    .filter(Boolean);

  const header =
    kind === 'victory'
      ? t(lang, 'recap.victory', { run: runTag, w: engine.waveIndex, stars, tags })
      : kind === 'endless_over'
        ? t(lang, 'recap.endless', { run: runTag, w: engine.waveIndex })
        : t(lang, 'recap.defeat', { run: runTag, w: Math.max(1, engine.waveIndex) });

  const policies =
    policyNames.length > 0
      ? t(lang, 'recap.policies', { list: policyNames.join(' / ') })
      : '';
  const statsLine = t(lang, 'recap.stats', {
    vips: s.vipsEscorted,
    stolen: s.goldStolen,
    rugs: s.rugsBurst,
    policies,
  });
  const footer = t(lang, 'recap.footer');
  return `${header}\n${statsLine}\n${footer}`;
}

function renderResultModalContent(kind: 'victory' | 'defeat' | 'endless_over'): void {
  const lang = engine.lang;
  const stage = engine.getStage();
  const stageName = t(lang, `stage.${stage.id}.name`);
  const isSaint = kind === 'victory' && engine.isTrueMitSaint();
  resultRank.classList.toggle('rank-saint', isSaint);

  const stageIdx = STAGE_ORDER.indexOf(engine.stageId);
  const isFinalStage = stageIdx === STAGE_ORDER.length - 1;
  const nextStageId: StageId | null =
    kind === 'victory' && stageIdx >= 0 && stageIdx + 1 < STAGE_ORDER.length
      ? STAGE_ORDER[stageIdx + 1]
      : null;

  if (nextStageId) {
    const nextName = t(lang, `stage.${nextStageId}.name`);
    btnNextStage.dataset.nextStage = nextStageId;
    btnNextStage.innerHTML = `${iconSvg(STAGE_ICONS[nextStageId], { size: 16 })}<span>${escapeHtml(
      t(lang, 'stage.nextBtn', { n: stageIdx + 2, name: nextName })
    )}</span>`;
    btnNextStage.classList.remove('hidden');
  } else {
    delete btnNextStage.dataset.nextStage;
    btnNextStage.classList.add('hidden');
  }

  resultTrilogyBanner.className = 'result-trilogy-banner hidden';
  resultTrilogyBanner.innerHTML = '';

  if (kind === 'victory') {
    const stars = engine.getStars();
    const clearedCount = getTrilogyClearedCount();
    const totalStages = STAGE_ORDER.length;
    const trilogyDone = isTrilogyComplete();

    resultStars.innerHTML = renderStarsSvg(stars, 3, 32);
    if (isSaint) {
      resultRank.innerHTML = `${iconSvg('feather', { size: 15, className: 'ico-emerald' })}<span>${escapeHtml(t(lang, 'result.rankSaint'))}</span>`;
    } else {
      const rankIco: IconName = stars >= 3 ? 'crown' : stars === 2 ? 'award' : 'shield';
      resultRank.innerHTML = `${iconSvg(rankIco, { size: 15, className: 'ico-gold' })}<span>${escapeHtml(t(lang, `result.rank${stars}`))}</span>`;
    }

    if (trilogyDone) {
      resultTrilogyBanner.innerHTML = `${iconSvg('crown', { size: 15, className: 'ico-gold' })}<span>${escapeHtml(
        t(lang, 'result.trilogyCompleteBanner', { done: clearedCount, total: totalStages })
      )}</span>`;
      resultTrilogyBanner.className = 'result-trilogy-banner is-trilogy-complete';
      resultTitle.textContent = isFinalStage ? t(lang, 'result.trilogyTitle') : t(lang, 'result.victoryTitle');
      resultSubtitle.textContent = isFinalStage
        ? t(lang, 'result.victorySubTrilogy')
        : t(lang, 'result.victorySubStage', { stage: stageName, w: stage.waves.length });
    } else if (isFinalStage) {
      resultTrilogyBanner.innerHTML = `${iconSvg('flame', { size: 15, className: 'ico-amber' })}<span>${escapeHtml(
        t(lang, 'result.finalePartialBanner', { done: clearedCount, total: totalStages })
      )}</span>`;
      resultTrilogyBanner.className = 'result-trilogy-banner is-final-stage';
      resultTitle.textContent = t(lang, 'result.finaleTitle');
      resultSubtitle.textContent = t(lang, 'result.victorySubStage', {
        stage: stageName,
        w: stage.waves.length,
      });
    } else {
      resultTitle.textContent = t(lang, 'result.victoryTitle');
      resultSubtitle.textContent = t(lang, 'result.victorySubStage', {
        stage: stageName,
        w: stage.waves.length,
      });
    }
    btnEndless.classList.remove('hidden');
  } else if (kind === 'endless_over') {
    resultStars.innerHTML = `<span class="result-endless-badge">${iconSvg('infinity', { size: 30, className: 'ico-cyan' })}<span>${escapeHtml(t(lang, 'hud.callWave', { n: engine.waveIndex }))}</span></span>`;
    resultRank.innerHTML = `${iconSvg('infinity', { size: 15, className: 'ico-cyan' })}<span>${escapeHtml(t(lang, 'result.rankEndless', { w: engine.waveIndex }))}</span>`;
    resultTitle.textContent = t(lang, 'result.endlessOverTitle', { w: engine.waveIndex });
    resultSubtitle.textContent = t(lang, 'result.endlessOverSub');
    btnEndless.classList.add('hidden');
  } else {
    resultStars.innerHTML = `<span class="result-defeat-badge">${iconSvg('alertTriangle', { size: 28, className: 'ico-crimson' })}</span>`;
    resultRank.innerHTML = `${iconSvg('alertTriangle', { size: 14, className: 'ico-crimson' })}<span>${escapeHtml(t(lang, 'result.rankDefeat'))}</span>`;
    resultTitle.textContent = t(lang, 'result.defeatTitle');
    resultSubtitle.textContent = t(lang, 'result.defeatSub');
    btnEndless.classList.add('hidden');
  }

  const s = engine.stats;
  const rows: Array<[string, string]> = [
    [String(s.enemiesBlocked), t(lang, 'metric.blocked')],
    [String(s.vipsEscorted), t(lang, 'metric.vips')],
    [String(s.vipsScared), t(lang, 'metric.vipHit')],
    [`+$${s.goldStolen}`, t(lang, 'metric.stolen')],
    [String(s.rugsBurst), t(lang, 'metric.rugs')],
    [String(s.deletesDropped), t(lang, 'metric.deletes')],
  ];
  resultMetrics.innerHTML = rows
    .map(
      ([val, lbl]) => `
      <div class="metric-box">
        <div class="metric-val" dir="ltr">${val}</div>
        <div class="metric-lbl">${lbl}</div>
      </div>`
    )
    .join('');

  if (engine.activePolicies.length > 0) {
    resultPolicies.classList.remove('hidden');
    resultPolicies.innerHTML = engine.activePolicies
      .map((id) => {
        const def = getPolicyDef(id);
        if (!def) return '';
        return `<span class="result-policy-pill">${safeIconSvg(def.icon, { size: 13, className: 'ico-gold' })}<span>${getPolicyTitle(def, lang)}</span></span>`;
      })
      .join('');
  } else {
    resultPolicies.classList.add('hidden');
    resultPolicies.innerHTML = '';
  }

  resultRecap.textContent = buildRunRecapText(kind);
  btnCopyReport.classList.remove('copied');
  copyReportIco.innerHTML = iconSvg('copy', { size: 15 });
  copyReportLabel.textContent = t(lang, 'result.copy');
}

function showResultModal(kind: 'victory' | 'defeat' | 'endless_over'): void {
  lastResultKind = kind;
  disarmRestart();
  closeRadialMenu();
  cancelTargeting();
  clearSelectedEntity();
  closePolicyDraft();
  renderStagePicker();
  updateTitleBestRecord();
  updateAchievementIndicators();
  renderAchievementsWall();
  renderResultModalContent(kind);
  overlayResult.classList.remove('hidden');
  audioExt.stopBgm?.();
  lastAudioIntensity = 0;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// ---- Pointer & Touch Controls ----

function toLogicalCoords(ev: PointerEvent | MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - rect.left) / rect.width) * LOGICAL_W,
    y: ((ev.clientY - rect.top) / rect.height) * LOGICAL_H,
  };
}

function findPadAt(x: number, y: number, radius = 38): string | null {
  let bestId: string | null = null;
  let bestDist = radius;
  for (const pad of engine.getStage().pads) {
    const d = Math.hypot(x - pad.x, y - pad.y);
    if (d <= bestDist) {
      bestDist = d;
      bestId = pad.id;
    }
  }
  return bestId;
}

canvas.addEventListener('pointermove', (ev) => {
  const { x, y } = toLogicalCoords(ev);
  ui.mouseX = x;
  ui.mouseY = y;
  ui.hoveredPadId = findPadAt(x, y);
});

canvas.addEventListener('contextmenu', (ev) => {
  ev.preventDefault();
  cancelTargeting();
  closeRadialMenu();
  clearSelectedEntity();
});

canvas.addEventListener('pointerdown', (ev) => {
  if (!started || ev.button === 2) return;
  if (!overlayPolicy.classList.contains('hidden')) return;
  // Guard against synthetic touch spillover immediately after radial/HUD button taps
  if (performance.now() - lastUiPointerTs < 140) return;

  const isTouch = ev.pointerType === 'touch';
  const { x, y } = toLogicalCoords(ev);
  ui.mouseX = x;
  ui.mouseY = y;

  if (waveTooltipPinned) {
    waveTooltipPinned = false;
    wavePreviewTooltip.classList.add('hidden');
  }
  if (pinnedPolicyBadgeId !== null) {
    pinnedPolicyBadgeId = null;
    lastPoliciesCacheKey = '';
    refreshActivePolicyBadges();
  }

  // Handle active targeting modes first
  if (ui.targetingMode === 'rug') {
    const snapped = closestPointOnStageRoads(engine.stageId, x, y);
    const tx = snapped.distToRoad < 95 ? snapped.x : x;
    const ty = snapped.distToRoad < 95 ? snapped.y : y;
    engine.castFakeDeleteRug(tx, ty);
    cancelTargeting();
    return;
  }
  if (ui.targetingMode === 'delete') {
    engine.castFourAmDelete(x, y);
    cancelTargeting();
    return;
  }
  if (ui.targetingMode === 'rally' && ui.rallyTowerId !== null) {
    engine.setBarracksRally(ui.rallyTowerId, x, y);
    cancelTargeting();
    return;
  }

  // Check clickable on-map wave call badges at left entrances (stage-aware)
  if (engine.canCallNextWave()) {
    const stage = engine.getStage();
    const [badge0, badge1] = stage.entryBadges;
    const unlockWave1 = stage.entryMarkers[1]?.unlockWave ?? 3;
    const hitRadius = isTouch ? 36 : 28;
    const hitUpper = Math.hypot(x - badge0.x, y - badge0.y) <= hitRadius;
    const hitLower = engine.waveIndex + 1 >= unlockWave1 && Math.hypot(x - badge1.x, y - badge1.y) <= hitRadius;
    if (hitUpper || hitLower) {
      closeRadialMenu();
      clearSelectedEntity();
      engine.callNextWave();
      notifyTutorialEvent('wave');
      return;
    }
  }

  // Check tower pad click (generous hit radius on touch to avoid accidental hero moves)
  const padId = findPadAt(x, y, isTouch ? 46 : 38);
  if (padId) {
    ui.selectedEntity = null;
    if (ui.selectedPadId === padId) {
      closeRadialMenu();
    } else {
      audioExt.inspect?.();
      renderRadialMenu(padId);
    }
    return;
  }

  // If radial menu was open, tapping empty map simply closes it (no accidental hero move!)
  if (ui.selectedPadId) {
    closeRadialMenu();
    return;
  }

  // Check clicking on Lord Theo himself
  if (engine.hero.alive && Math.hypot(x - engine.hero.x, y - (engine.hero.y - 22)) <= (isTouch ? 38 : 32)) {
    ui.selectedEntity = null;
    pingAndInspectHero();
    return;
  }

  // Tap-to-inspect Enemy or Golden VIP on the road instead of moving Lord Theo
  const inspectable = engine.findInspectableAt(x, y);
  if (inspectable) {
    audioExt.inspect?.();
    ui.selectedEntity =
      inspectable.kind === 'enemy'
        ? { kind: 'enemy', id: inspectable.enemy.id }
        : { kind: 'vip', id: inspectable.vip.id };
    refreshSelectedEntityInspector();
    return;
  }

  // Empty ground/road tap: clear selection & dispatch Lord Theo seamlessly
  clearSelectedEntity();
  inspectorCard.classList.add('hidden');
  engine.moveHeroTo(x, y);
  notifyTutorialEvent('hero');
});

function pingAndInspectHero(): void {
  closeRadialMenu();
  cancelTargeting();
  ui.selectedEntity = null;
  audioExt.inspect?.();
  if (engine.hero.alive) {
    const bubbles = getHeroBubbles(engine.lang);
    const lines = engine.hero.stance === 'vip' ? bubbles.vip : bubbles.rage;
    engine.hero.bubbleText = lines[Math.floor(Math.random() * lines.length)];
    engine.hero.bubbleTimer = 2.2;
    engine.movePing = { x: engine.hero.x, y: engine.hero.y, timer: 0.7 };
    sfx.megaphone();
  }
  showHeroInspector();
}

// Right-click canvas shortcut: cancel targeting / close radial / move Theo directly (no browser context menu)
canvas.addEventListener('contextmenu', (ev) => {
  ev.preventDefault();
  if (!started || engine.gameOver) return;
  if (!overlayPolicy.classList.contains('hidden') || !overlayHelp.classList.contains('hidden') || !overlayPause.classList.contains('hidden')) {
    return;
  }
  if (ui.targetingMode !== 'none') {
    cancelTargeting();
    return;
  }
  if (ui.selectedPadId) {
    closeRadialMenu();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const x = ((ev.clientX - rect.left) / rect.width) * LOGICAL_W;
  const y = ((ev.clientY - rect.top) / rect.height) * LOGICAL_H;
  clearSelectedEntity();
  inspectorCard.classList.add('hidden');
  engine.moveHeroTo(x, y);
  notifyTutorialEvent('hero');
});

// Prevent pointerdown on HUD controls, tutorial coachmark & language popover from bleeding to canvas
for (const el of [hudTop, hudBottom, tutorialCard, langPopover]) {
  el.addEventListener('pointerdown', (ev) => {
    if (ev.target !== el || el === tutorialCard || el === langPopover) {
      lastUiPointerTs = performance.now();
    }
  });
}

document.addEventListener('click', (ev) => {
  if (pinnedPolicyBadgeId !== null && !(ev.target instanceof Element && ev.target.closest('.policy-badge'))) {
    pinnedPolicyBadgeId = null;
    lastPoliciesCacheKey = '';
    refreshActivePolicyBadges();
  }
});

// ---- Wave Preview Hover & Touch Toggle ----
waveCallWrap.addEventListener('pointerenter', (ev) => {
  if (ev.pointerType !== 'touch' && !waveCallWrap.classList.contains('hidden')) {
    refreshWavePreview();
    wavePreviewTooltip.classList.remove('hidden');
  }
});

waveCallWrap.addEventListener('pointerleave', (ev) => {
  if (ev.pointerType !== 'touch' && !waveTooltipPinned) {
    wavePreviewTooltip.classList.add('hidden');
  }
});

wavePreviewPill.addEventListener('click', (ev) => {
  ev.stopPropagation();
  lastUiPointerTs = performance.now();
  refreshWavePreview();
  waveTooltipPinned = !waveTooltipPinned;
  wavePreviewTooltip.classList.toggle('hidden', !waveTooltipPinned);
});

// ---- Portrait Rotate Hint Dismiss ----
try {
  if (sessionStorage.getItem('temu3_portrait_tip_dismissed') === '1') {
    portraitTip.classList.add('dismissed');
  }
} catch {
  // ignore
}

btnDismissPortrait.addEventListener('click', (ev) => {
  ev.stopPropagation();
  portraitTip.classList.add('dismissed');
  try {
    sessionStorage.setItem('temu3_portrait_tip_dismissed', '1');
  } catch {
    // ignore
  }
});

// ---- 3-Stage Trilogy Campaign Selector on Title Screen ----
stagePicker.addEventListener('click', (ev) => {
  if (!(ev.target instanceof Element)) return;
  const card = ev.target.closest<HTMLButtonElement>('.stage-card');
  const stageId = card?.dataset.stage as StageId | undefined;
  if (!stageId || !STAGE_ORDER.includes(stageId)) return;
  audioExt.inspect?.();
  applyStage(stageId, true);
});

// ---- Difficulty Selector on Title Screen ----
for (const btn of diffPillBtns) {
  const diff = btn.dataset.diff as Difficulty | undefined;
  if (!diff) continue;
  btn.addEventListener('click', () => applyDifficulty(diff, true));
  btn.addEventListener('pointerenter', () => updateDifficultyTip(diff));
  btn.addEventListener('focus', () => updateDifficultyTip(diff));
}
difficultyPicker.addEventListener('pointerleave', () => updateDifficultyTip(selectedDifficulty));

// ---- Help Modal 3-Tab Switcher + Title Achievements Trophy Pill ----
tabHelpGuide.addEventListener('click', () => setHelpTab('guide'));
tabHelpCodex.addEventListener('click', () => setHelpTab('codex'));
tabHelpAchievements.addEventListener('click', () => setHelpTab('achievements'));
btnTitleAchievements.addEventListener('click', () => {
  audioExt.inspect?.();
  openHelpModal('achievements');
});

btnTitleHelp.addEventListener('click', () => {
  audioExt.inspect?.();
  openHelpModal('guide');
});

achievementsContent.addEventListener('click', (ev) => {
  if (!(ev.target instanceof Element)) return;
  const resetBtn = ev.target.closest<HTMLButtonElement>('#btn-reset-save');
  if (!resetBtn) return;
  ev.stopPropagation();
  if (!resetSaveArmed) {
    resetSaveArmed = true;
    resetBtn.classList.add('is-armed');
    resetBtn.innerHTML = `${iconSvg('alertTriangle', { size: 13 })}<span>${escapeHtml(t(engine.lang, 'career.resetConfirm'))}</span>`;
    audioExt.inspect?.();
    if (resetSaveArmTimer !== null) window.clearTimeout(resetSaveArmTimer);
    resetSaveArmTimer = window.setTimeout(() => {
      disarmResetSave();
    }, 4000);
    return;
  }
  disarmResetSave();
  resetAllLocalProgress();
  engine.reloadLocalState();
  renderStagePicker();
  updateTitleBestRecord();
  updateAchievementIndicators();
  renderAchievementsWall();
  audioExt.inspect?.();
  showToast(t(engine.lang, 'career.resetDone'), 'info', 'trash2');
});

// Provide snappy error SFX if user clicks a disabled skill button on CD
skillsBar.addEventListener('pointerdown', (ev) => {
  if (!started || engine.gameOver || !overlayPolicy.classList.contains('hidden')) return;
  if (ev.target === skillsBar) {
    const btns = skillsBar.querySelectorAll<HTMLButtonElement>('.skill-btn:disabled');
    for (const btn of btns) {
      const r = btn.getBoundingClientRect();
      if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
        audioExt.error?.();
        break;
      }
    }
  }
});

// ---- Buttons ----
heroPill.addEventListener('click', (ev) => {
  ev.stopPropagation();
  if (!started || !overlayPolicy.classList.contains('hidden')) return;
  lastUiPointerTs = performance.now();
  pingAndInspectHero();
});

function launchSelectedStage(): void {
  disarmRestart();
  started = true;
  lastResultKind = null;
  overlayTitle.classList.add('hidden');
  overlayResult.classList.add('hidden');
  closePolicyDraft();
  closeRadialMenu();
  cancelTargeting();
  clearSelectedEntity();
  lastPreviewCacheKey = '';
  lastPoliciesCacheKey = '';
  engine.setDifficulty(selectedDifficulty);
  engine.setStage(selectedStageId);
  audioExt.startBgm?.();
  lastAudioIntensity = -1;
  applyLanguage();
  const welcomeTone =
    selectedStageId === 'furnace' ? 'purple' : selectedStageId === 'bridge' ? 'good' : 'info';
  const welcomeIco: IconName = STAGE_ICONS[selectedStageId] ?? 'trees';
  if (isTutorialCompleted()) {
    showToast(t(engine.lang, `stage.${selectedStageId}.welcome`), welcomeTone, welcomeIco);
  }
  startTutorial(false);
}

document.getElementById('btn-start-game')!.addEventListener('click', () => {
  closeLangPopover(false);
  launchSelectedStage();
});

btnLangTitle.addEventListener('click', (ev) => {
  ev.stopPropagation();
  toggleLangPopover(btnLangTitle);
});

btnLangHud.addEventListener('click', (ev) => {
  ev.stopPropagation();
  lastUiPointerTs = performance.now();
  toggleLangPopover(btnLangHud);
});

langPopover.addEventListener('click', (ev) => {
  if (!(ev.target instanceof Element)) return;
  const opt = ev.target.closest<HTMLButtonElement>('[data-lang]');
  if (!opt) return;
  ev.stopPropagation();
  const code = opt.dataset.lang;
  closeLangPopover(true);
  if (code) void setLanguage(code, { persist: true, syncUrl: true });
});

document.addEventListener('click', (ev) => {
  if (langPopover.classList.contains('hidden')) return;
  if (
    ev.target instanceof Node &&
    (langPopover.contains(ev.target) || btnLangHud.contains(ev.target) || btnLangTitle.contains(ev.target))
  ) {
    return;
  }
  closeLangPopover(false);
});

window.addEventListener('resize', () => {
  if (!langPopover.classList.contains('hidden') && langPopoverAnchor) {
    positionLangPopover(langPopoverAnchor);
  }
});

btnTutSkip.addEventListener('click', (ev) => {
  ev.stopPropagation();
  finishTutorial(false);
});

btnTutNext.addEventListener('click', (ev) => {
  ev.stopPropagation();
  if (tutorialStep === 2) {
    tutorialStep = 3;
    renderTutorialCard();
  } else {
    finishTutorial(true);
  }
});

btnReplayTutorial.addEventListener('click', (ev) => {
  ev.stopPropagation();
  closeHelpModal();
  if (!started) {
    launchSelectedStage();
  }
  startTutorial(true);
});

btnSpeed.addEventListener('click', () => {
  engine.speedMultiplier =
    engine.speedMultiplier === 1 ? 2 : engine.speedMultiplier === 2 ? 3 : 1;
  refreshHud();
});

function setPausedMenu(open: boolean): void {
  if (!started || engine.gameOver) {
    overlayPause.classList.add('hidden');
    return;
  }
  engine.paused = open;
  overlayPause.classList.toggle('hidden', !open);
  if (open) {
    closeLangPopover(false);
    closeRadialMenu();
    cancelTargeting();
  }
  refreshHud();
}

btnPause.addEventListener('click', () => {
  if (!started || engine.gameOver || !overlayPolicy.classList.contains('hidden')) return;
  setPausedMenu(!engine.paused);
});

btnPauseResume.addEventListener('click', () => {
  setPausedMenu(false);
});

btnPauseRestart.addEventListener('click', () => {
  overlayPause.classList.add('hidden');
  restartCurrentStage(true);
});

btnPauseStages.addEventListener('click', () => {
  overlayPause.classList.add('hidden');
  engine.paused = false;
  btnStageSelect.click();
});

btnPauseTutorial.addEventListener('click', () => {
  setPausedMenu(false);
  startTutorial(true);
});

btnRestart.addEventListener('click', () => {
  if (!started) return;
  if (!restartArmed) {
    restartArmed = true;
    btnRestart.classList.add('is-armed');
    audioExt.inspect?.();
    showToast(t(engine.lang, 'hud.restartConfirm'), 'warn', 'rotateCcw');
    if (restartArmTimer !== null) window.clearTimeout(restartArmTimer);
    restartArmTimer = window.setTimeout(() => {
      disarmRestart();
    }, 3200);
    return;
  }
  restartCurrentStage(true);
});

btnMusic.addEventListener('click', () => {
  const nextMuted = !isBgmMuted();
  setBgmMutedState(nextMuted);
  if (!nextMuted && started && !sfx.muted) {
    audioExt.startBgm?.();
  }
  refreshHud();
});

btnMute.addEventListener('click', () => {
  const nextMuted = !sfx.muted;
  if (typeof audioExt.setMuted === 'function') {
    audioExt.setMuted(nextMuted);
  } else {
    sfx.muted = nextMuted;
  }
  if (!sfx.muted && started && !isBgmMuted()) {
    audioExt.startBgm?.();
  }
  refreshHud();
});

btnHelp.addEventListener('click', () => {
  openHelpModal();
});

document.getElementById('btn-close-help')!.addEventListener('click', () => {
  closeHelpModal();
});

btnCallWave.addEventListener('click', () => {
  if (!overlayPolicy.classList.contains('hidden')) return;
  closeRadialMenu();
  waveTooltipPinned = false;
  wavePreviewTooltip.classList.add('hidden');
  engine.callNextWave();
  notifyTutorialEvent('wave');
});

btnSkillSteal.addEventListener('click', () => {
  if (!overlayPolicy.classList.contains('hidden')) return;
  cancelTargeting();
  closeRadialMenu();
  engine.castStealTelemetry();
  notifyTutorialEvent('skill');
});

btnSkillRug.addEventListener('click', () => {
  if (!overlayPolicy.classList.contains('hidden') || engine.skillCds.rug > 0) return;
  closeRadialMenu();
  ui.targetingMode = ui.targetingMode === 'rug' ? 'none' : 'rug';
  updateTargetingHint();
  refreshHud();
  notifyTutorialEvent('skill');
});

btnSkillDelete.addEventListener('click', () => {
  if (!overlayPolicy.classList.contains('hidden') || engine.skillCds.delete > 0) return;
  closeRadialMenu();
  ui.targetingMode = ui.targetingMode === 'delete' ? 'none' : 'delete';
  updateTargetingHint();
  refreshHud();
  notifyTutorialEvent('skill');
});

btnSkillHero.addEventListener('click', () => {
  if (!overlayPolicy.classList.contains('hidden')) return;
  cancelTargeting();
  closeRadialMenu();
  engine.castRingLightApology();
  notifyTutorialEvent('skill');
});

btnCopyReport.addEventListener('click', async () => {
  const text = resultRecap.textContent || buildRunRecapText(lastResultKind ?? 'victory');
  await copyTextToClipboard(text);
  btnCopyReport.classList.add('copied');
  copyReportIco.innerHTML = iconSvg('check', { size: 15, className: 'ico-emerald', strokeWidth: 2.5 });
  copyReportLabel.textContent = t(engine.lang, 'result.copied');
  showToast(t(engine.lang, 'toast.copied'), 'good', 'check');
  if (copyResetTimeout !== null) window.clearTimeout(copyResetTimeout);
  copyResetTimeout = window.setTimeout(() => {
    btnCopyReport.classList.remove('copied');
    copyReportIco.innerHTML = iconSvg('copy', { size: 15 });
    copyReportLabel.textContent = t(engine.lang, 'result.copy');
  }, 2200);
});

btnNextStage.addEventListener('click', () => {
  const nextId = btnNextStage.dataset.nextStage as StageId | undefined;
  if (!nextId || !STAGE_ORDER.includes(nextId)) return;
  applyStage(nextId, true);
  launchSelectedStage();
});

btnEndless.addEventListener('click', () => {
  disarmRestart();
  lastResultKind = null;
  overlayResult.classList.add('hidden');
  engine.enterEndlessMode();
  audioExt.startBgm?.();
  lastAudioIntensity = -1;
  refreshHud();
});

document.getElementById('btn-retry')!.addEventListener('click', () => {
  restartCurrentStage(false);
});

btnStageSelect.addEventListener('click', () => {
  disarmRestart();
  started = false;
  lastResultKind = null;
  overlayResult.classList.add('hidden');
  closePolicyDraft();
  closeRadialMenu();
  cancelTargeting();
  clearSelectedEntity();
  tutorialStep = -1;
  renderTutorialCard();
  audioExt.stopBgm?.();
  lastAudioIntensity = 0;
  engine.setDifficulty(selectedDifficulty);
  engine.setStage(selectedStageId);
  renderStagePicker();
  updateTitleBestRecord();
  updateAchievementIndicators();
  overlayTitle.classList.remove('hidden');
  refreshHud();
});

// ---- Keyboard Shortcuts (1/2/3 Policy Draft or 1/2/3/4 Skills, Space, F, N, R, M, Esc) ----
window.addEventListener('keydown', (ev) => {
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
  if (
    ev.target instanceof HTMLInputElement ||
    ev.target instanceof HTMLTextAreaElement ||
    ev.target instanceof HTMLSelectElement
  ) {
    return;
  }
  const key = ev.key;
  const lower = key.toLowerCase();

  // Allow Escape to close custom Language Popover or Help modal even on the Title screen
  if (key === 'Escape' && !langPopover.classList.contains('hidden')) {
    closeLangPopover(true);
    return;
  }
  if (key === 'Escape' && !overlayHelp.classList.contains('hidden')) {
    closeHelpModal();
    return;
  }

  if (!started || !overlayTitle.classList.contains('hidden')) return;

  // Guard all gameplay hotkeys while Boardroom Policy Draft modal is open; 1/2/3 picks policy!
  if (!overlayPolicy.classList.contains('hidden') && openPolicyChoices) {
    if (key === '1' || key === '2' || key === '3') {
      const idx = Number(key) - 1;
      const choice = openPolicyChoices[idx];
      if (choice) {
        ev.preventDefault();
        pickPolicyChoice(choice);
      }
    }
    return;
  }

  if (key === 'Escape') {
    if (!overlayPause.classList.contains('hidden')) {
      setPausedMenu(false);
      return;
    }
    disarmRestart();
    cancelTargeting();
    closeRadialMenu();
    clearSelectedEntity();
    waveTooltipPinned = false;
    wavePreviewTooltip.classList.add('hidden');
    if (pinnedPolicyBadgeId !== null) {
      pinnedPolicyBadgeId = null;
      lastPoliciesCacheKey = '';
      refreshActivePolicyBadges();
    }
    return;
  }

  // Ignore gameplay hotkeys while Help or Result modal is open
  if (!overlayHelp.classList.contains('hidden') || !overlayResult.classList.contains('hidden')) {
    return;
  }

  if (key === '1') {
    if (btnSkillSteal.disabled) audioExt.error?.();
    else btnSkillSteal.click();
  } else if (key === '2') {
    if (btnSkillRug.disabled) audioExt.error?.();
    else btnSkillRug.click();
  } else if (key === '3') {
    if (btnSkillDelete.disabled) audioExt.error?.();
    else btnSkillDelete.click();
  } else if (key === '4') {
    if (btnSkillHero.disabled) audioExt.error?.();
    else btnSkillHero.click();
  } else if (key === ' ') {
    if (!ev.repeat) {
      ev.preventDefault();
      setPausedMenu(!engine.paused);
    }
  } else if (lower === 'f') {
    if (!ev.repeat) {
      ev.preventDefault();
      btnSpeed.click();
    }
  } else if (lower === 'n') {
    if (!ev.repeat && engine.canCallNextWave()) {
      ev.preventDefault();
      btnCallWave.click();
    }
  } else if (lower === 'r') {
    if (!ev.repeat && !btnRestart.disabled) {
      ev.preventDefault();
      btnRestart.click();
    }
  } else if (lower === 'm') {
    if (!ev.repeat) {
      ev.preventDefault();
      btnMute.click();
    }
  }
});

// ---- Main Loop ----
let lastTs = performance.now();
let hudTick = 0;

function frame(ts: number): void {
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;

  if (started) {
    engine.update(dt);
    hudTick += dt;
    if (hudTick >= 0.12) {
      hudTick = 0;
      refreshHud();
    }
  }
  renderer.render(engine, ui);
  requestAnimationFrame(frame);
}

async function bootstrap(): Promise<void> {
  hydrateStaticIcons();
  void assets.loadAll();

  const initialLang = detectInitialLang();
  await loadLocale(initialLang);
  engine.lang = initialLang;

  applyDifficulty(selectedDifficulty, false);
  applyStage(selectedStageId, false);
  setHelpTab('guide');
  applyLanguage();

  overlayTitle.classList.remove('hidden');
  lastTs = performance.now();
  requestAnimationFrame(frame);
}

void bootstrap();
