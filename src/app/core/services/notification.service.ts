import { Injectable, signal } from '@angular/core';

export type NotificationKind = 'success' | 'error';

export interface Notification {
  id: number;
  kind: NotificationKind;
  message: string;
}

/**
 * Tiny in-memory notification bus. Sufficient for a take-home;
 * a real app would use a dedicated toast library or CDK overlays.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 1;
  readonly current = signal<Notification | null>(null);

  show(kind: NotificationKind, message: string, ttlMs = 3500): void {
    const id = this.nextId++;
    this.current.set({ id, kind, message });
    setTimeout(() => {
      if (this.current()?.id === id) this.current.set(null);
    }, ttlMs);
  }

  success(message: string): void { this.show('success', message); }
  error(message: string): void { this.show('error', message); }
}
