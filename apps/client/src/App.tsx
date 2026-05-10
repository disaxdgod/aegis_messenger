import { AuthScreen } from "@/components/auth/AuthScreen";
import { LandingPage } from "@/components/landing/LandingPage";
import { MainApp } from "@/MainApp";
import { useAuthFormStore, type AuthMode } from "@/stores/auth-form-store";
import { useSessionStore } from "@/stores/session-store";
import { useEffect, useState } from "react";

type PublicRoute = "landing" | "auth";

function parsePublicRoute(pathname: string): {
  route: PublicRoute;
  mode: AuthMode;
} {
  const normalized = pathname.replace(/\/+$/u, "") || "/";
  if (
    normalized === "/auth/register" ||
    normalized === "/register"
  ) {
    return { route: "auth", mode: "sign-up" };
  }
  if (
    normalized === "/auth" ||
    normalized === "/auth/login" ||
    normalized === "/login"
  ) {
    return { route: "auth", mode: "sign-in" };
  }
  return { route: "landing", mode: "sign-up" };
}

function syncUrl(pathname: string, replace = false) {
  if (typeof window === "undefined") {
    return;
  }
  if (window.location.pathname === pathname) {
    return;
  }
  const next = `${pathname}${window.location.search}${window.location.hash}`;
  if (replace) {
    window.history.replaceState(null, "", next);
  } else {
    window.history.pushState(null, "", next);
  }
}

export default function App() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const mode = useAuthFormStore((s) => s.mode);
  const setMode = useAuthFormStore((s) => s.setMode);
  const [publicRoute, setPublicRoute] = useState<PublicRoute>(() =>
    parsePublicRoute(window.location.pathname).route,
  );

  useEffect(() => {
    if (isAuthenticated) {
      // После успешного входа/регистрации выводим пользователя в приложение.
      if (
        window.location.pathname === "/" ||
        window.location.pathname.startsWith("/auth") ||
        window.location.pathname === "/login" ||
        window.location.pathname === "/register"
      ) {
        syncUrl("/profile", true);
      }
      return;
    }

    const applyFromPath = () => {
      const parsed = parsePublicRoute(window.location.pathname);
      setPublicRoute(parsed.route);
      setMode(parsed.mode);
    };

    applyFromPath();
    window.addEventListener("popstate", applyFromPath);
    return () => window.removeEventListener("popstate", applyFromPath);
  }, [isAuthenticated, setMode]);

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }
    if (publicRoute === "landing") {
      syncUrl("/");
      return;
    }
    syncUrl(mode === "sign-up" ? "/auth/register" : "/auth/login");
  }, [isAuthenticated, publicRoute, mode]);

  if (isAuthenticated) {
    return <MainApp />;
  }

  if (publicRoute === "landing") {
    return (
      <LandingPage
        onOpenWebVersion={() => {
          setMode("sign-in");
          setPublicRoute("auth");
        }}
      />
    );
  }

  return <AuthScreen />;
}
