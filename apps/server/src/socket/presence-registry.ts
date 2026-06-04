/** Считает активные соединения на пользователя (несколько вкладок). */
export class PresenceSocketRegistry {
  private readonly socketsByUserId = new Map<string, Set<string>>();

  addSocket(userId: string, socketId: string): void {
    let set = this.socketsByUserId.get(userId);
    if (!set) {
      set = new Set<string>();
      this.socketsByUserId.set(userId, set);
    }
    set.add(socketId);
  }

  removeSocket(userId: string, socketId: string): void {
    const set = this.socketsByUserId.get(userId);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) this.socketsByUserId.delete(userId);
  }

  socketCount(userId: string): number {
    return this.socketsByUserId.get(userId)?.size ?? 0;
  }

  /** Все активные пользователи (хоть одно подключение). */
  connectedUserIds(): string[] {
    return [...this.socketsByUserId.keys()];
  }
}

/** Один экземпляр на процесс Node. */
export const socketPresenceRegistry = new PresenceSocketRegistry();
