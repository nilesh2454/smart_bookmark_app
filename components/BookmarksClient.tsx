"use client";

/* eslint-disable sonarjs/cognitive-complexity */

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Bookmark } from "@/types/bookmark";
import {
  Bookmark as BookmarkIcon,
  Plus,
  Trash2,
  Pin,
  LogOut,
  Search,
  ExternalLink,
  X,
  CheckCircle2,
  Link2,
  PinOff,
} from "lucide-react";

interface Props {
  readonly user: User;
  readonly initialBookmarks: Bookmark[];
}

function getFavicon(url: string): string {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return "";
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function sortBookmarks(bookmarks: Bookmark[]): Bookmark[] {
  return [...bookmarks].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function bookmarkIdExists(bookmarks: Bookmark[], bookmarkId: string): boolean {
  return bookmarks.some((bookmark) => bookmark.id === bookmarkId);
}

function upsertBookmark(bookmarks: Bookmark[], bookmark: Bookmark): Bookmark[] {
  return sortBookmarks([
    bookmark,
    ...bookmarks.filter((item) => item.id !== bookmark.id),
  ]);
}

function removeBookmark(bookmarks: Bookmark[], bookmarkId: string): Bookmark[] {
  return bookmarks.filter((bookmark) => bookmark.id !== bookmarkId);
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export default function BookmarksClient({ user, initialBookmarks }: Props) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [urlError, setUrlError] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  // Real-time subscription
  useEffect(() => {
    const handleBookmarkChange = (payload: any) => {
      if (payload.eventType === "INSERT" && payload.new) {
        const newBookmark = payload.new as Bookmark;
        setBookmarks((previousBookmarks) => {
          if (bookmarkIdExists(previousBookmarks, newBookmark.id)) {
            return previousBookmarks;
          }

          return sortBookmarks([newBookmark, ...previousBookmarks]);
        });
        return;
      }

      if (payload.eventType === "DELETE" && payload.old) {
        const deletedBookmarkId = payload.old.id;
        setBookmarks((previousBookmarks) =>
          removeBookmark(previousBookmarks, deletedBookmarkId)
        );
        return;
      }

      if (payload.eventType === "UPDATE" && payload.new) {
        const updatedBookmark = payload.new as Bookmark;
        setBookmarks((previousBookmarks) =>
          upsertBookmark(previousBookmarks, updatedBookmark)
        );
      }
    };

    const channel = supabase
      .channel("bookmarks-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${user.id}`,
        },
        handleBookmarkChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async () => {
    const cleanUrl = normalizeUrl(url);
    if (!isValidUrl(cleanUrl)) {
      setUrlError("Please enter a valid URL");
      return;
    }
    if (!title.trim()) {
      setUrlError("Title is required");
      return;
    }
    setUrlError("");
    setAdding(true);

    const bookmarkToCreate = {
      user_id: user.id,
      url: cleanUrl,
      title: title.trim(),
      favicon_url: getFavicon(cleanUrl),
      is_pinned: false,
    };

    const { data, error } = await supabase
      .from("bookmarks")
      .insert(bookmarkToCreate)
      .select()
      .single();

    setAdding(false);
    if (error) {
      showToast("Failed to add bookmark", "error");
    } else {
      if (data) {
        setBookmarks((previousBookmarks) =>
          upsertBookmark(previousBookmarks, data)
        );
      }
      setUrl("");
      setTitle("");
      setShowForm(false);
      showToast("Bookmark added");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("bookmarks").delete().eq("id", deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (error) showToast("Failed to delete", "error");
    else showToast("Bookmark removed");
  };

  const handleTogglePin = async (bm: Bookmark) => {
    const { error } = await supabase
      .from("bookmarks")
      .update({ is_pinned: !bm.is_pinned })
      .eq("id", bm.id);
    if (error) showToast("Failed to update", "error");
    else showToast(bm.is_pinned ? "Unpinned" : "Pinned to top");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    location.href = "/login";
  };

  const filtered = bookmarks.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      getDomain(b.url).toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filtered.filter((b) => b.is_pinned);
  const unpinned = filtered.filter((b) => !b.is_pinned);

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* Background gradient */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "800px",
          height: "300px",
          background:
            "radial-gradient(ellipse at top, rgba(200,169,126,0.05) 0%, transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          padding: "0 20px 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "28px 0 32px",
            borderBottom: "1px solid var(--border-subtle)",
            marginBottom: "32px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "var(--accent-dim)",
                border: "1px solid rgba(200,169,126,0.15)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BookmarkIcon size={15} color="var(--accent)" strokeWidth={1.5} />
            </div>
            <span
              className="font-display"
              style={{ fontSize: "20px", fontWeight: 400, letterSpacing: "-0.3px" }}
            >
              Markd
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src={user.user_metadata?.avatar_url}
              alt={user.user_metadata?.full_name ?? "User"}
              title={user.user_metadata?.full_name ?? user.email}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                border: "1.5px solid var(--border)",
                objectFit: "cover",
              }}
            />
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "6px 8px",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--text-muted)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <LogOut size={14} strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Page title + controls */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "24px",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              className="font-display"
              style={{
                fontSize: "30px",
                fontWeight: 400,
                margin: "0 0 4px",
                letterSpacing: "-0.5px",
              }}
            >
              Your Bookmarks
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>
              {bookmarks.length} saved
            </p>
          </div>

          <button
            onClick={() => setShowForm((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 16px",
              background: showForm ? "var(--accent-dim)" : "var(--accent)",
              color: showForm ? "var(--accent)" : "#ffffff",
              border: showForm ? "1px solid rgba(200,169,126,0.3)" : "1px solid var(--accent)",
              borderRadius: "var(--radius)",
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: "pointer",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            {showForm ? <X size={14} strokeWidth={2} /> : <Plus size={14} strokeWidth={2} />}
            {showForm ? "Cancel" : "Add Bookmark"}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div
            className="animate-slide-down"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "20px",
              marginBottom: "24px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label
                  htmlFor="bookmark-url"
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    marginBottom: "6px",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  URL
                </label>
                <div style={{ position: "relative" }}>
                  <Link2
                    size={15}
                    color="var(--text-muted)"
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />
                  <input
                    id="bookmark-url"
                    type="url"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setUrlError("");
                    }}
                    placeholder="https://example.com"
                    style={{
                      width: "100%",
                      background: "var(--bg-input)",
                      border: `1px solid ${urlError ? "var(--danger)" : "var(--border)"}`,
                      borderRadius: "var(--radius)",
                      padding: "10px 12px 10px 36px",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                      fontFamily: "'DM Sans', sans-serif",
                      outline: "none",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) =>
                      !urlError &&
                      (e.target.style.borderColor = "rgba(200,169,126,0.4)")
                    }
                    onBlur={(e) =>
                      !urlError && (e.target.style.borderColor = "var(--border)")
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="bookmark-title"
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    marginBottom: "6px",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Title
                </label>
                <input
                  id="bookmark-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give it a memorable name"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  style={{
                    width: "100%",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "10px 12px",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    fontFamily: "'DM Sans', sans-serif",
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "rgba(200,169,126,0.4)")
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = "var(--border)")
                  }
                />
              </div>

              {urlError && (
                <p style={{ color: "var(--danger)", fontSize: "13px", margin: 0 }}>
                  {urlError}
                </p>
              )}

              <button
                onClick={handleAdd}
                disabled={adding || !url.trim() || !title.trim()}
                style={{
                  padding: "10px 20px",
                  background:
                    adding || !url.trim() || !title.trim()
                      ? "var(--bg-elevated)"
                      : "var(--accent)",
                  color:
                    adding || !url.trim() || !title.trim()
                      ? "var(--text-muted)"
                      : "#ffffff",
                  border: adding || !url.trim() || !title.trim() ? "1px solid var(--border)" : "1px solid var(--accent)",
                  borderRadius: "var(--radius)",
                  fontSize: "14px",
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor:
                    adding || !url.trim() || !title.trim()
                      ? "not-allowed"
                      : "pointer",
                  transition: "all 0.15s",
                  alignSelf: "flex-start",
                }}
              >
                {adding ? "Saving..." : "Save Bookmark"}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        {bookmarks.length > 2 && (
          <div style={{ position: "relative", marginBottom: "24px" }}>
            <Search
              size={15}
              color="var(--text-muted)"
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bookmarks..."
              style={{
                width: "100%",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "10px 12px 10px 36px",
                color: "var(--text-primary)",
                fontSize: "14px",
                fontFamily: "'DM Sans', sans-serif",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(200,169,126,0.3)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--border)")
              }
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "2px",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {bookmarks.length === 0 && (
          <div
            className="animate-fade-in"
            style={{
              textAlign: "center",
              padding: "80px 20px",
              color: "var(--text-secondary)",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <BookmarkIcon size={24} strokeWidth={1} color="var(--text-muted)" />
            </div>
            <p
              className="font-display"
              style={{ fontSize: "20px", margin: "0 0 8px", color: "var(--text-primary)" }}
            >
              No bookmarks yet
            </p>
            <p style={{ fontSize: "14px", margin: "0 0 24px" }}>
              Add your first bookmark and it will appear here instantly.
            </p>
            <button
              onClick={() => setShowForm(true)}
              style={{
                padding: "9px 20px",
                background: "var(--accent)",
                border: "1px solid var(--accent)",
                color: "#ffffff",
                borderRadius: "var(--radius)",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer",
              }}
            >
              Add your first bookmark →
            </button>
          </div>
        )}

        {/* No search results */}
        {bookmarks.length > 0 && filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "48px 20px",
              color: "var(--text-secondary)",
            }}
          >
            <p style={{ fontSize: "15px", margin: 0 }}>
              No results for &ldquo;{search}&rdquo;
            </p>
          </div>
        )}

        {/* Pinned section */}
        {pinned.length > 0 && (
          <div style={{ marginBottom: "28px" }}>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--text-muted)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              Pinned
            </p>
            <BookmarkList
              bookmarks={pinned}
              onDelete={setDeleteId}
              onPin={handleTogglePin}
            />
          </div>
        )}

        {/* All bookmarks */}
        {unpinned.length > 0 && (
          <div>
            {pinned.length > 0 && (
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "12px",
                }}
              >
                All
              </p>
            )}
            <BookmarkList
              bookmarks={unpinned}
              onDelete={setDeleteId}
              onPin={handleTogglePin}
            />
          </div>
        )}
      </div>

      {/* Delete modal */}
      {deleteId && (
        <>
          <button
            type="button"
            aria-label="Close delete dialog"
            onClick={() => setDeleteId(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              border: "none",
              padding: 0,
              cursor: "default",
              zIndex: 50,
            }}
          />
          <div
            style={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 51,
              padding: "20px",
            }}
          >
            <div
              className="animate-slide-down"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "28px",
                maxWidth: "360px",
                width: "100%",
              }}
            >
            <div
              style={{
                width: "42px",
                height: "42px",
                background: "var(--danger-dim)",
                border: "1px solid rgba(196,96,96,0.2)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <Trash2 size={18} color="var(--danger)" strokeWidth={1.5} />
            </div>
            <h3
              style={{
                fontSize: "17px",
                fontWeight: 600,
                margin: "0 0 8px",
                color: "var(--text-primary)",
              }}
            >
              Delete bookmark?
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "var(--text-secondary)",
                margin: "0 0 24px",
              }}
            >
              This action cannot be undone. The bookmark will be permanently removed.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setDeleteId(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  color: "var(--text-secondary)",
                  fontSize: "14px",
                  fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "var(--danger)",
                  border: "none",
                  borderRadius: "var(--radius)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="animate-slide-down"
          style={{
            position: "fixed",
            bottom: "28px",
            left: "50%",
            transform: "translateX(-50%)",
            background: toast.type === "success" ? "var(--bg-elevated)" : "var(--danger-dim)",
            border: `1px solid ${toast.type === "success" ? "var(--border)" : "rgba(196,96,96,0.3)"}`,
            borderRadius: "100px",
            padding: "10px 18px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            zIndex: 100,
            whiteSpace: "nowrap",
          }}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={14} color="var(--success)" strokeWidth={2} />
          ) : (
            <X size={14} color="var(--danger)" strokeWidth={2} />
          )}
          <span
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: toast.type === "success" ? "var(--text-primary)" : "var(--danger)",
            }}
          >
            {toast.msg}
          </span>
        </div>
      )}
    </div>
  );
}

function BookmarkList({
  bookmarks,
  onDelete,
  onPin,
}: {
  readonly bookmarks: Bookmark[];
  readonly onDelete: (id: string) => void;
  readonly onPin: (bm: Bookmark) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
      {bookmarks.map((bm, i) => (
        <BookmarkRow
          key={bm.id}
          bookmark={bm}
          index={i}
          onDelete={onDelete}
          onPin={onPin}
        />
      ))}
    </div>
  );
}

function BookmarkRow({
  bookmark: bm,
  index,
  onDelete,
  onPin,
}: {
  readonly bookmark: Bookmark;
  readonly index: number;
  readonly onDelete: (id: string) => void;
  readonly onPin: (bm: Bookmark) => void;
}) {
  return (
    <div
      className="animate-fade-in"
      style={{
        animationDelay: `${index * 30}ms`,
        opacity: 0,
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "14px 16px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        boxShadow: "0 1px 2px rgba(26, 24, 21, 0.03)",
        borderRadius: "var(--radius)",
        transition: "all 0.15s",
        cursor: "default",
      }}
    >
      {/* Favicon */}
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {bm.favicon_url ? (
          <img
            src={bm.favicon_url}
            alt=""
            width={16}
            height={16}
            style={{ borderRadius: "2px" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <BookmarkIcon size={14} color="var(--text-muted)" strokeWidth={1.5} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {bm.title}
          </span>
          {bm.is_pinned && (
            <Pin size={11} color="var(--accent)" strokeWidth={2} style={{ flexShrink: 0 }} />
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {getDomain(bm.url)}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>·</span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", flexShrink: 0 }}>
            {formatDate(bm.created_at)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          opacity: 1,
          transition: "opacity 0.15s",
          flexShrink: 0,
        }}
      >
        <IconBtn
          title={bm.is_pinned ? "Unpin" : "Pin to top"}
          onClick={() => onPin(bm)}
        >
          {bm.is_pinned ? (
            <PinOff size={14} strokeWidth={1.5} />
          ) : (
            <Pin size={14} strokeWidth={1.5} />
          )}
        </IconBtn>
        <a
          href={bm.url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open link"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "30px",
            height: "30px",
            borderRadius: "7px",
            color: "var(--text-secondary)",
            background: "transparent",
            border: "1px solid transparent",
            transition: "all 0.15s",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-elevated)";
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <ExternalLink size={14} strokeWidth={1.5} />
        </a>
        <IconBtn
          title="Delete bookmark"
          onClick={() => onDelete(bm.id)}
          danger
        >
          <Trash2 size={14} strokeWidth={1.5} />
        </IconBtn>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  danger,
}: {
  readonly children: React.ReactNode;
  readonly title: string;
  readonly onClick: () => void;
  readonly danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "30px",
        height: "30px",
        borderRadius: "7px",
        color: "var(--text-secondary)",
        background: "transparent",
        border: "1px solid transparent",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? "var(--danger-dim)"
          : "var(--bg-elevated)";
        e.currentTarget.style.borderColor = danger
          ? "rgba(196,96,96,0.2)"
          : "var(--border)";
        e.currentTarget.style.color = danger
          ? "var(--danger)"
          : "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "transparent";
        e.currentTarget.style.color = "var(--text-secondary)";
      }}
    >
      {children}
    </button>
  );
}
