import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import type { MediaRef } from "@/lib/schemas/common"
import { getDb } from "@/server/db/client"
import { tag } from "@/server/lib/cache-tags"

import {
  listCategoryRows,
  listClientRows,
  listGroupCompanyRows,
  listTeamRows,
  listTestimonialRows,
} from "./repo"

// Small collections publish immediately (spec §5.3): no draft mode.

export type CategoryRecord = {
  id: string
  slug: string
  name: string
  showInFilter: boolean
}
export type TeamMemberRecord = {
  id: string
  name: string
  role: string
  bio: string
  photo: MediaRef | null
}
export type ClientRecord = {
  id: string
  name: string
  logo: MediaRef
  url: string | null
}
export type TestimonialRecord = {
  id: string
  name: string
  initials: string
  quote: string
  rating: number
}
export type GroupCompanyRecord = {
  id: string
  name: string
  phone: string
  site: string
  logo: MediaRef
}

export async function listCategories(): Promise<CategoryRecord[]> {
  "use cache"
  cacheLife("max")
  cacheTag(tag.categories)
  const rows = await listCategoryRows(getDb())
  return rows.map(({ id, slug, name, showInFilter }) => ({
    id,
    slug,
    name,
    showInFilter,
  }))
}

export async function listTeam(): Promise<TeamMemberRecord[]> {
  "use cache"
  cacheLife("max")
  cacheTag(tag.team)
  const rows = await listTeamRows(getDb())
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    bio: r.bio,
    photo: r.photoId ? { mediaId: r.photoId } : null,
  }))
}

export async function listClients(): Promise<ClientRecord[]> {
  "use cache"
  cacheLife("max")
  cacheTag(tag.clients)
  const rows = await listClientRows(getDb())
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    logo: { mediaId: r.logoId },
    url: r.url,
  }))
}

export async function listGroupCompanies(): Promise<GroupCompanyRecord[]> {
  "use cache"
  cacheLife("max")
  cacheTag(tag.groupCompanies)
  const rows = await listGroupCompanyRows(getDb())
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    site: r.site,
    logo: { mediaId: r.logoId },
  }))
}

/** Testimonials in display order (`sort_order`). */
export async function listTestimonials(): Promise<TestimonialRecord[]> {
  "use cache"
  cacheLife("max")
  cacheTag(tag.testimonials)
  const rows = await listTestimonialRows(getDb())
  return rows.map(({ id, name, initials, quote, rating }) => ({
    id,
    name,
    initials,
    quote,
    rating,
  }))
}
