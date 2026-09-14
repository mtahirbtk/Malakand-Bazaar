import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireFreshUser } from "@/server/auth/guard";
import { listMyReviews } from "@/server/services/reviews";
import { Rating } from "@/components/ui/rating";
import { Link } from "@/i18n/routing";

export default async function MyReviewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");

  const user = await requireFreshUser();
  const { items } = await listMyReviews(user.id, { limit: 60 });

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-low p-8 text-center">
        <p className="font-bold text-on-surface">{t("reviewsEmptyTitle")}</p>
        <p className="text-sm text-on-surface-muted mt-1">{t("reviewsEmptyBody")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((review) => (
        <div key={review.id} className="rounded-xl border border-surface-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <Link href={`/seller/${review.sellerSlug}`} className="font-bold text-brand-700 hover:underline">
              {review.sellerName}
            </Link>
            <Rating value={review.rating} />
          </div>
          {review.comment && <p className="mt-1 text-sm text-on-surface-muted">{review.comment}</p>}
        </div>
      ))}
    </div>
  );
}
