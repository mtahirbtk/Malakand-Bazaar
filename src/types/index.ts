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
  specialty: string;
  statLabel: string;
  statValue: string;
  phone: string;
  storefrontBanner?: string;
  coordinates?: { lat: number; lng: number };
  /** Storefront bio, set at registration. Absent on the 5 seed fixtures. */
  description?: string;
  avatarUrl?: string;
};

/**
 * What a listing detail page's seller card actually renders — a subset of
 * `Seller`, satisfied by both the full fixture `Seller` and the smaller
 * real-data shape `fn_get_listing_by_slug` returns.
 */
export type ListingSellerCard = Pick<Seller, "slug" | "name" | "coordinates">;

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
