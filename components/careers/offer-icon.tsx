import {
  CalendarDays,
  CalendarHeart,
  GraduationCap,
  type LucideIcon,
  Shirt,
  TrendingUp,
  Wallet,
} from "lucide-react"

import type { JobOfferIcon } from "@/lib/schemas/content/job"

/** The tile icon of a "What We Offer" item. */
export const OFFER_ICONS: Record<JobOfferIcon, LucideIcon> = {
  pay: Wallet,
  training: GraduationCap,
  uniform: Shirt,
  roster: CalendarDays,
  leave: CalendarHeart,
  career: TrendingUp,
}
