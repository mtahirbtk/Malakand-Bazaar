"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/routing";
import { useAuth } from "@/lib/auth/auth-context";
import { api, ApiClientError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Rating } from "@/components/ui/rating";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { Seller } from "@/types";

type ReviewItem = { id: string; buyerId: string; buyerName: string; rating: number; comment: string | null; createdAt: string };

export function SellerReviews({ seller }: { seller: Seller }) {
  const t = useTranslations("reviews");
  const common = useTranslations("common");
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const { show } = useToast();

  const [reviews, setReviews] = React.useState<ReviewItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showSignInPrompt, setShowSignInPrompt] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const items = await api.get<ReviewItem[]>(`/api/sellers/${seller.slug}/reviews?limit=24`);
      setReviews(items);
    } catch {
      // A failed reviews load shouldn't blank the rest of the storefront.
    } finally {
      setLoading(false);
    }
  }, [seller.slug]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const isOwnStore = user?.sellerId === seller.id;
  const myReview = user ? reviews.find((r) => r.buyerId === user.id) : undefined;

  function openWriteForm() {
    if (!user) {
      setShowSignInPrompt(true);
      return;
    }
    setRating(myReview?.rating ?? 5);
    setComment(myReview?.comment ?? "");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      if (myReview) {
        await api.patch(`/api/reviews/${myReview.id}`, { rating, comment });
      } else {
        await api.post(`/api/sellers/${seller.slug}/reviews`, { rating, comment });
      }
      setShowForm(false);
      await refresh();
      show({ title: t("title"), tone: "success" });
    } catch (err) {
      show({ title: err instanceof ApiClientError ? err.message : common("genericError"), tone: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!myReview) return;
    try {
      await api.delete(`/api/reviews/${myReview.id}`);
      setShowDeleteConfirm(false);
      await refresh();
    } catch (err) {
      show({ title: err instanceof ApiClientError ? err.message : common("genericError"), tone: "error" });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold tracking-tight text-on-surface">{t("title")}</h2>
        {ready && user?.role !== "admin" && !isOwnStore && !myReview && (
          <Button variant="subtle" size="sm" onClick={openWriteForm}>
            {t("writeReviewCta")}
          </Button>
        )}
      </div>

      {showForm && (
        <form className="space-y-3 rounded-xl border border-surface-border bg-surface-low p-4" onSubmit={handleSubmit}>
          <Rating value={rating} editable onChange={setRating} ariaLabel={t("yourRatingAria")} />
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("commentPlaceholder")} />
          <Button type="submit" size="sm" disabled={submitting}>
            {myReview ? t("saveCta") : t("submitReviewCta")}
          </Button>
        </form>
      )}

      {!loading && reviews.length === 0 && <p className="text-sm text-on-surface-muted">{t("noReviewsYet")}</p>}

      {reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => {
            const isMine = user?.id === review.buyerId;
            return (
              <div key={review.id} className="rounded-xl border border-surface-border bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-on-surface">{review.buyerName}</p>
                  <Rating value={review.rating} />
                </div>
                {review.comment && <p className="mt-1 text-xs text-on-surface-muted">{review.comment}</p>}
                {isMine && (
                  <div className="mt-2 flex gap-3">
                    <button type="button" onClick={openWriteForm} className="text-xs font-bold text-brand-700 hover:underline">
                      {t("editReviewCta")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-xs font-bold text-danger hover:underline"
                    >
                      {t("deleteReviewCta")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showSignInPrompt} onOpenChange={setShowSignInPrompt} title={t("signInPromptTitle")} description={t("signInPromptBody")}>
        <div className="flex justify-end">
          <Button asChild size="sm">
            <Link href={`/sign-in?next=${encodeURIComponent(pathname ?? "/")}`}>{t("signInPromptCta")}</Link>
          </Button>
        </div>
      </Modal>

      <Modal open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} title={t("deleteConfirmTitle")} description={t("deleteConfirmBody")}>
        <div className="flex justify-end gap-2">
          <Button variant="subtle" size="sm" onClick={() => setShowDeleteConfirm(false)}>
            {t("cancelCta")}
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            {t("deleteConfirmCta")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
