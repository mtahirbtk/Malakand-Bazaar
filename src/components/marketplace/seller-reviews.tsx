"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/routing";
import { useAuth } from "@/lib/mock-db/auth-context";
import { getReviewsForSeller, getMyReviewForSeller, upsertReview } from "@/lib/mock-db/reviews";
import { Rating } from "@/components/ui/rating";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { Review, Seller } from "@/types";

export function SellerReviews({ seller }: { seller: Seller }) {
  const t = useTranslations("reviews");
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [showSignInPrompt, setShowSignInPrompt] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");

  const refresh = React.useCallback(() => {
    setReviews(getReviewsForSeller(seller.id));
  }, [seller.id]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const isOwnStore = user?.sellerId === seller.id;

  React.useEffect(() => {
    if (user && !isOwnStore) {
      const mine = getMyReviewForSeller(seller.id, user.id);
      if (mine) {
        setRating(mine.rating);
        setComment(mine.comment);
      }
    }
  }, [user, isOwnStore, seller.id]);

  function handleWriteReviewClick() {
    if (!user) {
      setShowSignInPrompt(true);
      return;
    }
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    upsertReview({ sellerId: seller.id, buyerId: user.id, buyerName: user.displayName, rating, comment });
    setShowForm(false);
    refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold tracking-tight text-on-surface">{t("title")}</h2>
        {ready && user?.role !== "admin" && !isOwnStore && (
          <Button variant="subtle" size="sm" onClick={handleWriteReviewClick}>
            {t("writeReviewCta")}
          </Button>
        )}
      </div>

      {showForm && (
        <form className="space-y-3 rounded-xl border border-surface-border bg-surface-low p-4" onSubmit={handleSubmit}>
          <Rating value={rating} editable onChange={setRating} ariaLabel={t("yourRatingAria")} />
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("commentPlaceholder")} />
          <Button type="submit" size="sm">
            {t("submitReviewCta")}
          </Button>
        </form>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-on-surface-muted">{t("noReviewsYet")}</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-surface-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-on-surface">{review.buyerName}</p>
                <Rating value={review.rating} />
              </div>
              <p className="mt-1 text-xs text-on-surface-muted">{review.comment}</p>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showSignInPrompt}
        onOpenChange={setShowSignInPrompt}
        title={t("signInPromptTitle")}
        description={t("signInPromptBody")}
      >
        <div className="flex justify-end">
          <Button asChild size="sm">
            <Link href={`/sign-in?next=${encodeURIComponent(pathname ?? "/")}`}>{t("signInPromptCta")}</Link>
          </Button>
        </div>
      </Modal>
    </div>
  );
}
