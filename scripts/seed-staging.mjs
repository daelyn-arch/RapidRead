#!/usr/bin/env node
/**
 * One-shot staging seed — provisions a permanent test account with
 * realistic state so the audit can exercise multi-session sync paths.
 *
 * Reads STAGING_SUPABASE_URL + STAGING_SUPABASE_SERVICE_ROLE_KEY from
 * .env.local. Fails loudly if either is missing.
 *
 * Run:    node scripts/seed-staging.mjs
 * Idempotent — re-run any time to reset the seed account.
 */

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPA_URL = process.env.STAGING_SUPABASE_URL;
const SERVICE_KEY = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
const SEED_EMAIL = process.env.STAGING_SEED_EMAIL ?? 'daelyn+staging@thex1.com';
const SEED_PASSWORD = process.env.STAGING_SEED_PASSWORD ?? 'StagingSeed1!RR';

if (!SUPA_URL || !SERVICE_KEY) {
  console.error(
    'STAGING_SUPABASE_URL and STAGING_SUPABASE_SERVICE_ROLE_KEY must be set in .env.local',
  );
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function rest(path, init = {}) {
  const res = await fetch(`${SUPA_URL}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status}: ${await res.text()}`);
  }
  return res;
}

async function findOrCreateUser() {
  // GoTrue admin: list users by email
  const listRes = await fetch(
    `${SUPA_URL}/auth/v1/admin/users?email=${encodeURIComponent(SEED_EMAIL)}`,
    { headers },
  );
  const listed = await listRes.json();
  const existing = (listed.users ?? [])[0];
  if (existing) {
    // Reset password so the seed remains usable.
    await fetch(`${SUPA_URL}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ password: SEED_PASSWORD, email_confirm: true }),
    });
    return existing;
  }
  const createRes = await fetch(`${SUPA_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: SEED_EMAIL, password: SEED_PASSWORD, email_confirm: true }),
  });
  if (!createRes.ok) {
    throw new Error(`createUser failed: ${createRes.status} ${await createRes.text()}`);
  }
  return await createRes.json();
}

async function setPro(userId) {
  await rest(`/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ plan: 'pro', plan_status: 'active' }),
  });
}

async function clearExistingData(userId) {
  // Cascade order: bookmarks → books (FK cascade handles progress).
  await rest(`/rest/v1/bookmarks?user_id=eq.${userId}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
  await rest(`/rest/v1/books?user_id=eq.${userId}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
  await rest(`/rest/v1/user_settings?user_id=eq.${userId}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
}

async function seedBooks(userId) {
  const books = [
    { title: 'Pride and Prejudice', author: 'Jane Austen', total_words: 121000, chapter_count: 61 },
    { title: 'Frankenstein', author: 'Mary Shelley', total_words: 75000, chapter_count: 24 },
    { title: 'Treasure Island', author: 'Robert Louis Stevenson', total_words: 67000, chapter_count: 34 },
  ];
  const rows = [];
  for (const b of books) {
    const res = await rest('/rest/v1/books?select=id', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: userId,
        client_id: crypto.randomUUID(),
        title: b.title,
        author: b.author,
        format: 'epub',
        total_words: b.total_words,
        chapter_count: b.chapter_count,
      }),
    });
    const [row] = await res.json();
    rows.push({ ...row, ...b });
  }
  return rows;
}

async function seedBookmarks(userId, books) {
  // 2 bookmarks per book at distinct positions
  for (const book of books) {
    for (const pos of [{ ch: 1, w: 25 }, { ch: 3, w: 140 }]) {
      await rest('/rest/v1/bookmarks', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id: userId,
          book_id: book.id,
          client_id: crypto.randomUUID(),
          chapter_index: pos.ch,
          word_index: pos.w,
          label: `${book.title} ch${pos.ch}`,
        }),
      });
    }
  }
}

(async () => {
  console.log(`Seeding ${SEED_EMAIL} on ${SUPA_URL}…`);
  const user = await findOrCreateUser();
  console.log(`  user.id = ${user.id}`);
  await setPro(user.id);
  await clearExistingData(user.id);
  const books = await seedBooks(user.id);
  await seedBookmarks(user.id, books);
  console.log(`  ${books.length} books, ${books.length * 2} bookmarks seeded`);
  console.log('Done. Sign in with:');
  console.log(`  email:    ${SEED_EMAIL}`);
  console.log(`  password: ${SEED_PASSWORD}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
