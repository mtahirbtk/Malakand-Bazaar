export type TehsilSlug = "batkhela" | "dargai" | "thana-baizai";

export type Locality = {
  slug: string;
  nameEn: string;
  nameUr: string;
};

export type Tehsil = {
  slug: TehsilSlug;
  nameEn: string;
  nameUr: string;
  /** The revenue tehsil this local government corresponds to. */
  revenueTehsil: string;
  localities: Locality[];
};

export type Subcategory = {
  slug: string;
  nameEn: string;
  nameUr: string;
};

export type Category = {
  slug: string;
  nameEn: string;
  nameUr: string;
  /** Material Symbols Outlined glyph name. */
  icon: string;
  sort: number;
  subcategories: Subcategory[];
};

export type ListingStatus = "active" | "reserved" | "sold" | "removed";

export type BadgeTone = "primary" | "sand" | "green" | "neutral" | "danger";

export type Listing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  categorySlug: string;
  subcategorySlug: string;
  tehsilSlug: TehsilSlug;
  localitySlug: string;
  localityLabel: string;
  images: string[];
  /** Material Symbols glyph shown when the listing has no photograph. */
  iconFallback?: string;
  badge?: { label: string; tone: BadgeTone };
  contactPhone: string;
  sellerId: string;
  status: ListingStatus;
  createdAt: string;
  coordinates?: { lat: number; lng: number };
};

export type Seller = {
  id: string;
  slug: string;
  name: string;
  initials: string;
  tehsilSlug: TehsilSlug;
  localityLabel: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  responseMinutes: number;
  /**
   * Marketing copy the fixture sellers carry ("Deals Done", "142 Systems",
   * a specialty blurb). There's no such field on a real seller — nothing in
   * the data model backs it, and CLAUDE.md rules out inventing one — so it's
   * optional and `SellerCard` falls back to `listingCount` when absent.
   */
  specialty?: string;
  statLabel?: string;
  statValue?: string;
  listingCount?: number;
  phone: string;
  storefrontBanner?: string;
  coordinates?: { lat: number; lng: number };
  /** Storefront bio, set at registration. Absent on the 5 seed fixtures. */
  description?: string;
  avatarUrl?: string;
  /** ISO date the storefront was created. Absent only for the 5 seed fixtures. */
  memberSince?: string;
};

/**
 * What a listing detail page's seller card actually renders — a subset of
 * `Seller`, satisfied by both the full fixture `Seller` and the smaller
 * real-data shape `fn_get_listing_by_slug` returns.
 */
export type ListingSellerCard = Pick<Seller, "slug" | "name" | "coordinates">;

/**
 * One photo, as the seller dashboard needs it (id + sort for drag-reorder and
 * delete-by-id). Public reads only ever see `Listing.images: string[]` — this
 * shape exists for the owner-only endpoints in Phase 6.
 */
export type ListingImage = {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  sort: number;
};

export type UserRole = "customer" | "seller" | "admin";

export type User = {
  id: string;
  /** E.164, e.g. "+923001234567" — the login identity. */
  phone: string;
  /** Mock only: plain text, never a real security boundary. */
  password: string;
  role: UserRole;
  displayName: string;
  /** Present once role === "seller". */
  sellerId?: string;
};

export type Review = {
  id: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  rating: number;
  comment: string;
  createdAt: string;
};
