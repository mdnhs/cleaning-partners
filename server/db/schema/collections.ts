import "server-only"

import { sql } from "drizzle-orm"
import { check, integer, pgTable, text, uuid } from "drizzle-orm/pg-core"

import { id, timestamps } from "./_shared"
import { media } from "./media"

// Small collections publish immediately (spec §5.3); names are the natural
// keys the seed upserts on.

export const teamMembers = pgTable("team_members", {
  id: id(),
  name: text("name").notNull().unique(),
  role: text("role").notNull(),
  bio: text("bio").notNull(),
  photoId: uuid("photo_id").references(() => media.id, {
    onDelete: "restrict",
  }),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps(),
})

export const clients = pgTable("clients", {
  id: id(),
  name: text("name").notNull().unique(),
  logoId: uuid("logo_id")
    .notNull()
    .references(() => media.id, { onDelete: "restrict" }),
  url: text("url"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps(),
})

export const groupCompanies = pgTable("group_companies", {
  id: id(),
  name: text("name").notNull().unique(),
  phone: text("phone").notNull(),
  site: text("site").notNull(),
  logoId: uuid("logo_id")
    .notNull()
    .references(() => media.id, { onDelete: "restrict" }),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps(),
})

export const testimonials = pgTable(
  "testimonials",
  {
    id: id(),
    name: text("name").notNull().unique(),
    initials: text("initials").notNull(),
    quote: text("quote").notNull(),
    rating: integer("rating").notNull().default(5),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => [check("testimonials_rating_check", sql`${t.rating} between 1 and 5`)]
)
