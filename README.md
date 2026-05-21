# Markd — Smart Bookmark App

A polished bookmark manager with Google OAuth, Supabase-backed private bookmarks, realtime sync, and a clean light UI. Built for the Abstrabit Fullstack Engineer take-home assessment.

**Live Demo:** replace with your deployed Vercel URL  
**Repo:** replace with your GitHub repository URL

---

## Tech Stack

- **Next.js 16** (App Router)
- **Supabase** — Auth, PostgreSQL, Realtime
- **Tailwind CSS v4** + custom CSS variables
- **Vercel** — deployment

## What’s Implemented

- Google OAuth login only, no email/password flow.
- Add bookmark form with URL validation and success/error feedback.
- Private bookmarks enforced with Supabase Row Level Security.
- Realtime sync across tabs using Supabase `postgres_changes` subscriptions.
- Delete flow with confirmation modal.
- Pin/unpin bonus feature to keep important bookmarks at the top.
- Responsive, light-themed UI with empty state and toast feedback.

---

## Local Setup

```bash
git clone https://github.com/you/markd
cd markd
npm install
cp .env.local.example .env.local
# fill in your Supabase credentials
npm run dev
```

---

## Supabase Configuration

### 1. Auth — Google OAuth

1. Go to **Supabase Dashboard → Authentication → Providers → Google**
2. Enable Google and add your **Client ID** and **Client Secret** from [Google Cloud Console](https://console.cloud.google.com)
3. In Google Cloud: create OAuth credentials, set **Authorized redirect URIs** to:
   - `https://<your-project>.supabase.co/auth/v1/callback`
4. Add your production domain to **Supabase → Auth → URL Configuration → Redirect URLs**:
   - `https://your-app.vercel.app/**`

### 2. Database — Row Level Security

Run `supabase-setup.sql` in the Supabase SQL Editor. Here's what it does and why it's correct:

```sql
-- RLS is enabled at the table level
alter table public.bookmarks enable row level security;

-- SELECT policy: auth.uid() must equal user_id
create policy "Users can view their own bookmarks"
  on public.bookmarks for select
  using (auth.uid() = user_id);
```

**Why these policies are correct:**

- `auth.uid()` is a Supabase built-in that reads the JWT of the currently authenticated user — it's evaluated **server-side inside PostgreSQL**, not in the client, so it cannot be spoofed from the frontend.
- The `using` clause on SELECT/DELETE and `with check` on INSERT ensures that **even if someone bypasses the frontend**, they would need a valid JWT for that `user_id` to read or modify rows. The DB simply returns 0 rows or rejects the write.
- Every CRUD operation has a corresponding policy. Without a matching policy, RLS denies by default.

### 3. Realtime

1. Go to **Database → Replication** and add `public.bookmarks` to the `supabase_realtime` publication (or the SQL script does this automatically).
2. The client subscribes using `postgres_changes` filtered by `user_id`:

```typescript
supabase
  .channel("bookmarks-realtime")
  .on("postgres_changes", {
    event: "*",          // INSERT | UPDATE | DELETE
    schema: "public",
    table: "bookmarks",
    filter: `user_id=eq.${user.id}`,   // server-side filter
  }, (payload) => {
    // update local state without a refetch
  })
  .subscribe();
```

**Subscription cleanup:** The `useEffect` returns `() => supabase.removeChannel(channel)` — this runs when the component unmounts, preventing memory leaks and duplicate listeners across tab navigations.

---

## Bonus Feature — Pin to Top

I added **pin/unpin** for bookmarks. Users can pin their most-visited bookmarks to keep them at the top of the list regardless of when they were added. Pinned bookmarks are visually distinguished with a pin icon and a separate section header.

**Why I chose this:** It's a small but meaningful productivity upgrade. Frequent bookmarks stay visible without changing the base sorting behavior, so the feature improves everyday use with minimal complexity.

---

## Problems & How I Solved Them

**1. Realtime duplicate events on tab focus**  
When a tab regained focus, Supabase sometimes replayed the last event. Fixed by deduplicating INSERTs with `prev.find((b) => b.id === payload.new.id)` before updating state.

**2. `cookies()` async in Next.js 15**  
Next.js 15 made `cookies()` return a Promise. Fixed by `await`ing it in the server Supabase client utility.

**3. Favicon fallback**  
Google's favicon service occasionally returns a blank 16×16 image instead of an error, making `onError` unreliable. Left as-is for now — the placeholder icon covers it gracefully.

**4. Contrast on the light UI**  
Several primary buttons originally used dark text on warm accent backgrounds, which looked muddy against the light theme. I normalized the CTA colors so primary actions use clear contrast and secondary actions stay visually quieter.

---

## One Thing I'd Improve

**Automatic title fetching from URL.** Right now users must type a title manually. I'd add a small API route that fetches the page's `<title>` tag server-side when the user pastes a URL, pre-filling the title field. This eliminates friction for the most common add flow while still letting users override it.

---

## Loom Walkthrough

[Link to Loom video](https://loom.com/share/...)
