import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BookmarksClient from "@/components/BookmarksClient";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <BookmarksClient
      user={user}
      initialBookmarks={bookmarks ?? []}
    />
  );
}
