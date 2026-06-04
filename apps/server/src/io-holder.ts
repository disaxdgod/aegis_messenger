import type { Server as SocketIOServer } from "socket.io";

let cached: SocketIOServer | undefined;

/** Устанавливается один раз при старте HTTP-сервера. */
export function setSocketIo(io: SocketIOServer): void {
  cached = io;
}

export function getSocketIo(): SocketIOServer | undefined {
  return cached;
}
