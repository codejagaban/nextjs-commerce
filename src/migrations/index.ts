import * as migration_20260926_225747_initial_schema from './20260926_225747_initial_schema'
import * as migration_20260927_000901_r2_media_storage from './20260927_000901_r2_media_storage'

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
]
