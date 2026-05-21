"use client";

import { createClient } from "@/lib/supabase/client";
import { Bookmark, ArrowRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${globalThis.location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "400px",
          background:
            "radial-gradient(ellipse at center, rgba(200,169,126,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="animate-fade-in"
        style={{
          width: "100%",
          maxWidth: "400px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "52px",
              height: "52px",
              background: "var(--accent-dim)",
              border: "1px solid rgba(200,169,126,0.2)",
              borderRadius: "14px",
              marginBottom: "20px",
            }}
          >
            <Bookmark size={22} color="var(--accent)" strokeWidth={1.5} />
          </div>
          <h1
            className="font-display"
            style={{
              fontSize: "36px",
              fontWeight: 400,
              color: "var(--text-primary)",
              margin: "0 0 8px 0",
              letterSpacing: "-0.5px",
            }}
          >
            Markd
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "15px",
              fontWeight: 300,
              margin: 0,
            }}
          >
            Your bookmarks. Everywhere, instantly.
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "32px",
          }}
        >
          <h2
            style={{
              fontSize: "17px",
              fontWeight: 500,
              color: "var(--text-primary)",
              margin: "0 0 6px 0",
            }}
          >
            Welcome back
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "var(--text-secondary)",
              margin: "0 0 28px 0",
            }}
          >
            Sign in to access your personal bookmark collection.
          </p>

          {error && (
            <div
              className="animate-slide-down"
              style={{
                background: "var(--danger-dim)",
                border: "1px solid rgba(196,96,96,0.2)",
                borderRadius: "var(--radius)",
                padding: "12px 14px",
                fontSize: "13px",
                color: "var(--danger)",
                marginBottom: "20px",
              }}
            >
              Authentication failed. Please try again.
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: "13px 20px",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: "pointer",
              transition: "background-color 0.15s ease, border-color 0.15s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-elevated)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--bg-card)")
            }
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.608 14.078 17.64 11.84 17.64 9.2z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
            <ArrowRight size={15} strokeWidth={2} />
          </button>

          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              textAlign: "center",
              margin: "20px 0 0 0",
            }}
          >
            Your bookmarks are private and secured by Row Level Security.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
