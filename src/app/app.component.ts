import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="app-header">
      <div class="container app-header__inner">
        <a routerLink="/products" class="brand">InsiderCX · Products</a>
        <nav>
          <a routerLink="/products" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Browse</a>
          <a routerLink="/products/new" routerLinkActive="active">+ New product</a>
        </nav>
      </div>
    </header>

    <main class="container">
      <router-outlet />
    </main>

    @if (notifications.current(); as toast) {
      <div class="toast" [class.toast--error]="toast.kind === 'error'">{{ toast.message }}</div>
    }
  `,
  styles: [
    `
      .app-header { background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
      .app-header__inner { display: flex; align-items: center; justify-content: space-between; padding-block: var(--space-3); }
      .brand { font-weight: 600; color: var(--color-text); }
      nav a { margin-left: var(--space-4); color: var(--color-muted); }
      nav a.active { color: var(--color-primary); font-weight: 600; }

      .toast {
        position: fixed; bottom: 24px; right: 24px;
        background: var(--color-success); color: #fff;
        padding: var(--space-3) var(--space-4); border-radius: var(--radius);
        box-shadow: var(--shadow-md); max-width: 360px;
      }
      .toast--error { background: var(--color-danger); }
    `,
  ],
})
export class AppComponent {
  protected readonly notifications = inject(NotificationService);
}
