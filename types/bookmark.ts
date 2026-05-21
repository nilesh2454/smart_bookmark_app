export interface Bookmark {
  id: string;
  user_id: string;
  url: string;
  title: string;
  favicon_url: string | null;
  created_at: string;
  is_pinned: boolean;
}

export type BookmarkInsert = Omit<Bookmark, "id" | "user_id" | "created_at">;
