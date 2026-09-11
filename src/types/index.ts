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

export type ListingStatus = "active" | "reserved" | "sold";

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
  /** Storefront banner shown atop the seller's page. */
  storefrontBanner?: string;
  /** Store location, shown on the listing detail page's map. */
  coordinates?: { lat: number; lng: number };
};
