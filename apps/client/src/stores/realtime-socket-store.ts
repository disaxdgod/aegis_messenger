import { create } from "zustand";
import { io, type Socket } from "socket.io-client";

import { isBackendEnabled } from "@/config/backend";

function socketOrigin(): string {
  const o = import.meta.env.VITE_SOCKET_ORIGIN?.trim();
  if (o?.length) return o;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

type RealtimeState = {
  socket: Socket | null;
};

let lastToken: string | null = null;

export const useRealtimeSocketStore = create<RealtimeState>(() => ({
  socket: null,
}));

/** Подключить Socket.IO с JWT или отключить при выходе. */
export function syncRealtimeSocket(accessToken: string | null): void {
  if (!isBackendEnabled()) {
    const cur = useRealtimeSocketStore.getState().socket;
    cur?.disconnect();
    useRealtimeSocketStore.setState({ socket: null });
    lastToken = null;
    return;
  }

  const cur = useRealtimeSocketStore.getState().socket;

  if (!accessToken?.trim()) {
    cur?.disconnect();
    useRealtimeSocketStore.setState({ socket: null });
    lastToken = null;
    return;
  }

  if (cur?.connected && lastToken === accessToken) {
    return;
  }

  cur?.disconnect();
  lastToken = accessToken;

  const socket = io(socketOrigin(), {
    autoConnect: true,
    transports: ["websocket", "polling"],
    path: "/socket.io",
    auth: { token: accessToken },
    withCredentials: true,
  });

  useRealtimeSocketStore.setState({ socket });
}
