import * as migration_20260926_225747_initial_schema from './20260926_225747_initial_schema';
import * as migration_20260927_000901_r2_media_storage from './20260927_000901_r2_media_storage';
import * as migration_20260927_103909_order_financial_breakdown from './20260927_103909_order_financial_breakdown';

export const migrations = [
  {
    up: migration_20260926_225747_initial_schema.up,
    down: migration_20260926_225747_initial_schema.down,
    name: '20260926_225747_initial_schema',
  },
  {
    up: migration_20260927_000901_r2_media_storage.up,
    down: migration_20260927_000901_r2_media_storage.down,
    name: '20260927_000901_r2_media_storage',
  },
  {
    up: migration_20260927_103909_order_financial_breakdown.up,
    down: migration_20260927_103909_order_financial_breakdown.down,
    name: '20260927_103909_order_financial_breakdown'
  },
];
