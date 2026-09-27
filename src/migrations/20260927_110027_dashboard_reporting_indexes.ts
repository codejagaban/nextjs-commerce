import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");
  CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "orders_status_idx";
  DROP INDEX "transactions_status_idx";`)
}
