import * as migration_20260926_225747_initial_schema from './20260926_225747_initial_schema';
import * as migration_20260927_000901_r2_media_storage from './20260927_000901_r2_media_storage';
import * as migration_20260927_103909_order_financial_breakdown from './20260927_103909_order_financial_breakdown';
import * as migration_20260927_105055_store_timezone from './20260927_105055_store_timezone';
import * as migration_20260927_110027_dashboard_reporting_indexes from './20260927_110027_dashboard_reporting_indexes';
import * as migration_20260927_112155_inventory_restock_tracking from './20260927_112155_inventory_restock_tracking';
import * as migration_20261024_221336_order_state_separation from './20261024_221336_order_state_separation';
import * as migration_20261024_221726_order_shipments from './20261024_221726_order_shipments';
import * as migration_20261024_221914_shipment_notifications from './20261024_221914_shipment_notifications';
import * as migration_20261104_174956_refunds_and_returns from './20261104_174956_refunds_and_returns';

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
    name: '20260927_110027_dashboard_reporting_indexes',
  },
  {
    up: migration_20260927_112155_inventory_restock_tracking.up,
    down: migration_20260927_112155_inventory_restock_tracking.down,
    name: '20260927_112155_inventory_restock_tracking',
  },
  {
    up: migration_20261024_221336_order_state_separation.up,
    down: migration_20261024_221336_order_state_separation.down,
    name: '20261024_221336_order_state_separation',
  },
  {
    up: migration_20261024_221726_order_shipments.up,
    down: migration_20261024_221726_order_shipments.down,
    name: '20261024_221726_order_shipments',
  },
  {
    up: migration_20261024_221914_shipment_notifications.up,
    down: migration_20261024_221914_shipment_notifications.down,
    name: '20261024_221914_shipment_notifications',
  },
  {
    up: migration_20261104_174956_refunds_and_returns.up,
    down: migration_20261104_174956_refunds_and_returns.down,
    name: '20261104_174956_refunds_and_returns'
  },
];
