export type AssetKey =
  | 'map-meadow'
  | 'map-bridge'
  | 'map-furnace'
  | 'castle-t3'
  | 'tower-barracks'
  | 'tower-archer'
  | 'tower-mage'
  | 'tower-artillery'
  | 'hero-rage'
  | 'hero-vip'
  | 'guard-fan'
  | 'vip-exec'
  | 'enemy-dev'
  | 'enemy-fork'
  | 'enemy-auditor'
  | 'enemy-veteran'
  | 'enemy-gdpr'
  | 'hero-rage-walk'
  | 'hero-vip-walk'
  | 'guard-fan-walk'
  | 'vip-exec-walk'
  | 'enemy-dev-walk'
  | 'enemy-fork-walk'
  | 'enemy-auditor-walk'
  | 'enemy-veteran-walk'
  | 'enemy-gdpr-walk';

const ALL_KEYS: AssetKey[] = [
  'map-meadow',
  'map-bridge',
  'map-furnace',
  'castle-t3',
  'tower-barracks',
  'tower-archer',
  'tower-mage',
  'tower-artillery',
  'hero-rage',
  'hero-vip',
  'guard-fan',
  'vip-exec',
  'enemy-dev',
  'enemy-fork',
  'enemy-auditor',
  'enemy-veteran',
  'enemy-gdpr',
  'hero-rage-walk',
  'hero-vip-walk',
  'guard-fan-walk',
  'vip-exec-walk',
  'enemy-dev-walk',
  'enemy-fork-walk',
  'enemy-auditor-walk',
  'enemy-veteran-walk',
  'enemy-gdpr-walk',
];

class AssetStore {
  private images = new Map<AssetKey, HTMLImageElement>();
  public loadedCount = 0;
  public totalCount = ALL_KEYS.length;

  loadAll(): Promise<void> {
    return Promise.all(
      ALL_KEYS.map(
        (key) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => {
              this.images.set(key, img);
              this.loadedCount++;
              resolve();
            };
            img.onerror = () => {
              this.loadedCount++;
              resolve();
            };
            img.src = `./assets/${key}.webp`;
          })
      )
    ).then(() => undefined);
  }

  get(key: AssetKey): HTMLImageElement | null {
    return this.images.get(key) ?? null;
  }
}

export const assets = new AssetStore();
