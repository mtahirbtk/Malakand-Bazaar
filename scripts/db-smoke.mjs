#!/usr/bin/env node
/**
 * Exercises the database logic that application code depends on but cannot
 * easily assert from TypeScript: ranking maths, counter bumps, aggregate
 * triggers, integrity guards and the rate limiter.
 *
 * Everything runs inside one transaction that is deliberately rolled back, so
 * the script is safe against a live database and leaves no rows behind.
 *
 *   node scripts/db-smoke.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const file of [".env.local", ".env"]) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    if (process.env[key] === undefined) {
      process.env[key] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
}

const sql = postgres(process.env.DIRECT_URL, { max: 1, onnotice: () => {} });

let passed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok    ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/**
 * Asserts that a statement is rejected.
 *
 * Wrapped in a savepoint: in Postgres a failed statement poisons the whole
 * transaction, so without one the first expected rejection would abort every
 * assertion after it.
 */
async function rejects(tx, name, run, expected) {
  try {
    await tx.savepoint(async (sp) => {
      await run(sp);
    });
    check(name, false, "expected a rejection, got success");
  } catch (err) {
    check(name, expected ? new RegExp(expected, "i").test(err.message) : true, err.message.slice(0, 90));
  }
}

class Rollback extends Error {}

try {
  await sql.begin(async (tx) => {
    // --- fixtures ---------------------------------------------------------
    const [user] = await tx`
      insert into users (phone, password_hash, display_name, role)
      values ('+923000000001', 'x', 'Smoke Seller', 'seller') returning id`;
    const [buyer] = await tx`
      insert into users (phone, password_hash, display_name)
      values ('+923000000002', 'x', 'Smoke Buyer') returning id`;
    const [buyer2] = await tx`
      insert into users (phone, password_hash, display_name)
      values ('+923000000003', 'x', 'Smoke Buyer Two') returning id`;

    const [slugOut] = await tx`select fn_unique_seller_slug('Khan Solar & Engineering') as slug`;
    const [seller] = await tx`
      insert into sellers (user_id, slug, name, phone, tehsil_slug, locality_slug, locality_label)
      values (${user.id}, ${slugOut.slug}, 'Khan Solar & Engineering', '+923000000001',
              'dargai', 'dargai-industrial-belt', 'Dargai Industrial Belt')
      returning id, slug`;

    console.log("\nslugs");
    check("seller slug is kebab-cased", seller.slug === "khan-solar-engineering", seller.slug);

    const [urdu] = await tx`select fn_slugify('سولر انورٹر', 'listing') as slug`;
    check("non-Latin name falls back rather than producing an empty slug", urdu.slug === "listing", urdu.slug);

    const [first] = await tx`select fn_unique_listing_slug('Honda CD70') as slug`;
    await tx`
      insert into listings (slug, seller_id, title, description, price, category_slug,
                            subcategory_slug, tehsil_slug, contact_phone)
      values (${first.slug}, ${seller.id}, 'Honda CD70', 'A running motorcycle in good condition.',
              120000, 'vehicles', 'vehicles-motorcycles', 'dargai', '+923000000001')`;
    const [second] = await tx`select fn_unique_listing_slug('Honda CD70') as slug`;
    check("colliding slug gets a numeric suffix", second.slug === "honda-cd70-2", second.slug);

    // --- integrity guards -------------------------------------------------
    console.log("\nintegrity guards");
    await rejects(
      tx,
      "taxonomy cannot nest three levels deep",
      (sp) => sp`insert into categories (slug, parent_slug, name_en, name_ur)
               values ('vehicles-cars-sedans', 'vehicles-cars', 'Sedans', 'Sedans')`,
      "two levels"
    );

    await rejects(
      tx,
      "a subcategory cannot be used as a listing's category",
      (sp) => sp`insert into listings (slug, seller_id, title, description, price, category_slug,
                                     tehsil_slug, contact_phone)
               values ('bad-1', ${seller.id}, 'Bad listing', 'This should not insert at all.',
                       100, 'vehicles-cars', 'dargai', '+923000000001')`,
      "subcategory"
    );

    await rejects(
      tx,
      "a subcategory from another branch is rejected",
      (sp) => sp`insert into listings (slug, seller_id, title, description, price, category_slug,
                                     subcategory_slug, tehsil_slug, contact_phone)
               values ('bad-2', ${seller.id}, 'Bad listing', 'This should not insert at all.',
                       100, 'vehicles', 'livestock-animals-cows', 'dargai', '+923000000001')`,
      "belongs to"
    );

    await rejects(
      tx,
      "compare-at price below the asking price is rejected",
      (sp) => sp`insert into listings (slug, seller_id, title, description, price, compare_at_price,
                                     category_slug, tehsil_slug, contact_phone)
               values ('bad-3', ${seller.id}, 'Bad listing', 'This should not insert at all.',
                       100, 50, 'vehicles', 'dargai', '+923000000001')`,
      "compare_at"
    );

    await rejects(
      tx,
      "a non-E.164 phone is rejected at the column",
      (sp) => sp`insert into users (phone, password_hash, display_name)
               values ('03001234567', 'x', 'Unnormalised')`,
      "e164"
    );

    // --- ranking ----------------------------------------------------------
    console.log("\nranking");
    const [fresh] = await tx`
      insert into listings (slug, seller_id, title, description, price, category_slug,
                            tehsil_slug, contact_phone, published_at)
      values ('rank-fresh', ${seller.id}, 'Fresh listing', 'Posted a moment ago, no views yet.',
              1000, 'vehicles', 'dargai', '+923000000001', now())
      returning id, rank_score`;
    const [older] = await tx`
      insert into listings (slug, seller_id, title, description, price, category_slug,
                            tehsil_slug, contact_phone, published_at, view_count)
      values ('rank-older', ${seller.id}, 'Older popular listing', 'Posted two days ago, widely viewed.',
              1000, 'vehicles', 'dargai', '+923000000001', now() - interval '2 days', 0)
      returning id`;

    check("a new listing starts with a small non-zero score", fresh.rank_score > 0 && fresh.rank_score < 1,
      String(fresh.rank_score));

    // 400 views on the two-day-old listing must beat the brand new one.
    for (let i = 0; i < 400; i += 1) await tx`select fn_bump_view(${older.id})`;

    const [ranked] = await tx`
      select (select rank_score from listings where id = ${older.id}) as older_score,
             (select rank_score from listings where id = ${fresh.id}) as fresh_score`;
    check(
      "views lift an older listing above a brand new one",
      Number(ranked.older_score) > Number(ranked.fresh_score),
      `older=${Number(ranked.older_score).toFixed(3)} fresh=${Number(ranked.fresh_score).toFixed(3)}`
    );

    const [counted] = await tx`select view_count from listings where id = ${older.id}`;
    check("every view is counted, none deduplicated", Number(counted.view_count) === 400,
      String(counted.view_count));

    const [daily] = await tx`
      select views from listing_view_daily where listing_id = ${older.id} and day = current_date`;
    check("daily aggregate matches the counter", Number(daily.views) === 400, String(daily?.views));

    const dailyCols = await tx`
      select column_name from information_schema.columns
       where table_schema = 'public' and table_name = 'listing_view_daily'`;
    check(
      "view analytics store nothing about the viewer",
      dailyCols.every((c) => ["listing_id", "day", "views"].includes(c.column_name)),
      dailyCols.map((c) => c.column_name).join(",")
    );

    // With age held equal, more views must rank higher.
    const [decay] = await tx`
      select fn_rank_score(0, now() - interval '2 days') as old_none,
             fn_rank_score(0, now()) as new_none`;
    check("with equal views, newer outranks older", Number(decay.new_none) > Number(decay.old_none));

    // --- reviews and aggregates ------------------------------------------
    console.log("\nreviews");
    await tx`insert into reviews (seller_id, buyer_id, rating, comment)
             values (${seller.id}, ${buyer.id}, 5, 'Excellent service.')`;
    const [afterOne] = await tx`select rating_avg, rating_count, rating_score from sellers where id = ${seller.id}`;
    check("rating aggregate updates on insert",
      Number(afterOne.rating_count) === 1 && Number(afterOne.rating_avg) === 5,
      `avg=${afterOne.rating_avg} count=${afterOne.rating_count}`);
    check(
      "a single five-star review does not score a perfect 5 (Bayesian prior)",
      Number(afterOne.rating_score) > 4 && Number(afterOne.rating_score) < 4.3,
      String(afterOne.rating_score)
    );

    await tx`insert into reviews (seller_id, buyer_id, rating) values (${seller.id}, ${buyer2.id}, 3)`;
    const [afterTwo] = await tx`select rating_avg, rating_count from sellers where id = ${seller.id}`;
    check("aggregate recomputes on a second review",
      Number(afterTwo.rating_count) === 2 && Number(afterTwo.rating_avg) === 4,
      `avg=${afterTwo.rating_avg}`);

    await tx`delete from reviews where seller_id = ${seller.id} and buyer_id = ${buyer2.id}`;
    const [afterDelete] = await tx`select rating_count from sellers where id = ${seller.id}`;
    check("aggregate recomputes on delete", Number(afterDelete.rating_count) === 1);

    await rejects(
      tx,
      "a seller cannot review their own storefront",
      (sp) => sp`insert into reviews (seller_id, buyer_id, rating) values (${seller.id}, ${user.id}, 5)`,
      "own storefront"
    );

    await rejects(
      tx,
      "a buyer cannot review the same seller twice",
      (sp) => sp`insert into reviews (seller_id, buyer_id, rating) values (${seller.id}, ${buyer.id}, 1)`,
      "duplicate key|unique"
    );

    await rejects(
      tx,
      "a rating outside 1..5 is rejected",
      (sp) => sp`insert into reviews (seller_id, buyer_id, rating) values (${seller.id}, ${buyer2.id}, 9)`,
      "rating_chk"
    );

    // --- listing_count ----------------------------------------------------
    console.log("\nlisting count");
    const [counts] = await tx`select listing_count from sellers where id = ${seller.id}`;
    check("listing_count tracks live listings", Number(counts.listing_count) === 3,
      String(counts.listing_count));

    await tx`update listings set status = 'sold' where id = ${fresh.id}`;
    const [afterSold] = await tx`select listing_count from sellers where id = ${seller.id}`;
    check("marking a listing sold drops it from the count", Number(afterSold.listing_count) === 2,
      String(afterSold.listing_count));

    // --- contact tracking -------------------------------------------------
    console.log("\ncontact tracking");
    await tx`select fn_bump_contact(${older.id}, 'whatsapp')`;
    await tx`select fn_bump_contact(${older.id}, 'whatsapp')`;
    await tx`select fn_bump_contact(${older.id}, 'call')`;
    const contacts = await tx`
      select channel, count from listing_contact_daily
       where listing_id = ${older.id} order by channel`;
    check("contact clicks split by channel",
      contacts.length === 2 && Number(contacts.find((c) => c.channel === "whatsapp").count) === 2,
      JSON.stringify(contacts));

    // --- rate limiter -----------------------------------------------------
    console.log("\nrate limiter");
    const key = `smoke:${Date.now()}`;
    let allowedCount = 0;
    for (let i = 0; i < 5; i += 1) {
      const [row] = await tx`select * from fn_rate_limit(${key}, 3, interval '1 minute')`;
      if (row.allowed) allowedCount += 1;
    }
    check("limiter allows exactly the configured number", allowedCount === 3, String(allowedCount));

    const [limitRow] = await tx`select * from fn_rate_limit(${key}, 3, interval '1 minute')`;
    check("limiter reports a reset time", Boolean(limitRow.reset_at));
    check("limiter reports zero remaining once blocked", Number(limitRow.remaining) === 0);

    // --- settings ---------------------------------------------------------
    console.log("\nsettings");
    const [exp] = await tx`select fn_setting_numeric('ranking.gravity_exponent', 0) as v`;
    check("ranking constants are readable from settings", Number(exp.v) === 1.4, String(exp.v));
    const [missing] = await tx`select fn_setting_numeric('does.not.exist', 42) as v`;
    check("a missing setting falls back rather than erroring", Number(missing.v) === 42);

    throw new Rollback();
  });
} catch (err) {
  if (!(err instanceof Rollback)) {
    console.error("\nsmoke run aborted:", err.message);
    process.exitCode = 1;
  }
} finally {
  await sql.end({ timeout: 5 });
}

console.log(`\n${passed} passed, ${failures.length} failed  (all changes rolled back)`);
if (failures.length) {
  for (const f of failures) console.error(`  - ${f}`);
  process.exitCode = 1;
}
