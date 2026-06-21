interface LockInfo {
  ownerId: string;
  expiresAt: number;
}

const DEFAULT_LOCK_TIMEOUT = 10000;
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_INTERVAL = 100;

export class LockManager {
  private locks: Map<string, LockInfo> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, lock] of this.locks.entries()) {
        if (lock.expiresAt <= now) {
          this.locks.delete(key);
        }
      }
    }, 1000);
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private cleanExpired(key: string): void {
    const lock = this.locks.get(key);
    if (lock && lock.expiresAt <= Date.now()) {
      this.locks.delete(key);
    }
  }

  async acquireLock(
    key: string,
    timeout: number = DEFAULT_LOCK_TIMEOUT
  ): Promise<boolean> {
    const ownerId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    for (let attempt = 0; attempt < DEFAULT_RETRY_COUNT; attempt++) {
      this.cleanExpired(key);

      if (!this.locks.has(key)) {
        this.locks.set(key, {
          ownerId,
          expiresAt: Date.now() + timeout,
        });
        return true;
      }

      if (attempt < DEFAULT_RETRY_COUNT - 1) {
        await new Promise((resolve) => setTimeout(resolve, DEFAULT_RETRY_INTERVAL));
      }
    }

    return false;
  }

  releaseLock(key: string): void {
    this.locks.delete(key);
  }

  isLocked(key: string): boolean {
    this.cleanExpired(key);
    return this.locks.has(key);
  }

  getLockOwner(key: string): string | null {
    this.cleanExpired(key);
    const lock = this.locks.get(key);
    return lock ? lock.ownerId : null;
  }
}
