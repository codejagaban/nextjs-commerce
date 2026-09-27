import * as migration_20260926_225747_initial_schema from './20260926_225747_initial_schema';
import * as migration_20260927_000901_r2_media_storage from './20260927_000901_r2_media_storage';
import * as migration_20260927_103909_order_financial_breakdown from './20260927_103909_order_financial_breakdown';
import * as migration_20260927_105055_store_timezone from './20260927_105055_store_timezone';
import * as migration_20260927_110027_dashboard_reporting_indexes from './20260927_110027_dashboard_reporting_indexes';

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
    name: '20260927_103909_order_financial_breakdown',
  },
  {
    up: migration_20260927_105055_store_timezone.up,
    down: migration_20260927_105055_store_timezone.down,
    name: '20260927_105055_store_timezone',
  },
  {
    up: migration_20260927_110027_dashboard_reporting_indexes.up,
    down: migration_20260927_110027_dashboard_reporting_indexes.down,
    name: '20260927_110027_dashboard_reporting_indexes'
  },
];
