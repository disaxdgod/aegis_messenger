import { AuthScreen } from "@/components/auth/AuthScreen";
import { MainApp } from "@/MainApp";
import { useSessionStore } from "@/stores/session-store";

export default function App() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  return isAuthenticated ? <MainApp /> : <AuthScreen />;
}
