import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/** Table for the "npc" entity (NPC) */
export const npc = sqliteTable("npc", {
  id: text("id").primaryKey(),
  hextri: text("hextri").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

/** Type registry mapping slugs to row types */
export type EntityRegistry = {
  "npc": typeof npc.$inferSelect;
};

/** Foreign keys per table: camelCase column → the referenced table's slug (from `x-ref`) */
export type EntityRefs = {
  "npc": {};
};

