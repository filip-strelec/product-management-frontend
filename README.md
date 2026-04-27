# Product Management – Frontend (Angular 18)

User interface for the Product Management take-home task.

## Stack

- **Angular 18** – standalone components, new control-flow (`@if`, `@for`)
- **Reactive Forms** with strongly typed `FormGroup<...>`
- **HttpClient** + functional `HttpInterceptorFn` for transport-level error toasts
- **Signals** for component state, **RxJS** for HTTP streams
- **SCSS** with a tiny set of design tokens (CSS custom properties), no UI lib

## Setup

```bash
cd frontend
npm install
npm start                  # dev server on http://localhost:4200
```

The dev server points at the backend at `http://localhost:3000` via
[`src/environments/environment.development.ts`](./src/environments/environment.development.ts).
Make sure the backend is running and seeded first:

```bash
cd ../backend && npm install && npm run seed && npm run dev
```

Other scripts:

| Script           | Purpose                          |
| ---------------- | -------------------------------- |
| `npm run build`  | Production build to `dist/`      |
| `npm run watch`  | Continuous dev build             |

## Architecture

```text
src/app/
├── app.component.ts            # shell: header, router-outlet, toast host
├── app.config.ts               # providers: router, http client, interceptors
├── app.routes.ts               # lazy-loaded standalone routes
├── core/
│   ├── models/                         # shared types (no `any` anywhere)
│   ├── services/product.service.ts     # typed HTTP wrapper around the API
│   ├── services/category.service.ts    # cached category lookup
│   ├── services/upload.service.ts      # thumbnail upload + GET /uploads/config
│   ├── services/notification.service.ts # tiny signal-based toast bus
│   └── interceptors/error.interceptor.ts # surfaces 5xx / network errors
└── features/products/
    ├── product-list/           # paginated grid + debounced search
    ├── product-detail/         # single product, handles invalid/missing ids
    └── product-form/           # reactive form, used for create AND edit
```

**Routing & inputs.** `withComponentInputBinding()` lets components receive
route params as `@Input()` (e.g. `:id` → `@Input() id?: string`), which keeps
detail / edit components free of `ActivatedRoute` boilerplate.

**Forms.** A single `ProductFormComponent` handles both `Create` and `Update`.
The presence of a route `:id` toggles edit mode. Validation is declarative:
- `title`: `required`, `maxLength(200)`
- `price`: `required`, `min(0.01)`
- `description`: `maxLength(2000)`
Errors are only displayed once a control is `touched`.

**State.** Local UI state lives in **signals** (`loading`, `error`, `products`).
HTTP responses come back as **observables** and are pushed into those signals
inside `tap()`. There is no global store — overkill for 4 screens.

**Change detection.** Every component uses `ChangeDetectionStrategy.OnPush`.

## Key decisions

- **Standalone components** everywhere — no `NgModule`, smaller mental model,
  cleaner lazy-load boundaries.
- **One form component for create & edit** — DRYs up validation rules, labels
  and submit logic; the only branch is the choice of HTTP verb.
- **Functional interceptor** (Angular 15+ style) for error handling — composable
  and easy to unit test, no DI gymnastics.
- **Signals + RxJS together**: signals for *what the template renders*,
  RxJS for *how data arrives*. `takeUntilDestroyed()` replaces manual
  `Subject<void>` teardown.
- **No UI library**. A handful of CSS custom properties keep the surface
  consistent; bringing in Material/PrimeNG would dwarf the actual code.
- **Comma-separated tags input** instead of a custom chip-list — fewer moving
  parts, still ergonomic.
