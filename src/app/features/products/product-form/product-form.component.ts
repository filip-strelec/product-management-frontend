import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of, tap } from 'rxjs';
import { CategoryService } from '../../../core/services/category.service';
import { ProductService } from '../../../core/services/product.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  ALLOWED_THUMBNAIL_TYPES,
  MAX_THUMBNAIL_BYTES,
  UploadService,
} from '../../../core/services/upload.service';
import type { Category } from '../../../core/models/category.model';
import type { CreateProductInput, Product } from '../../../core/models/product.model';

interface ProductForm {
  title: FormControl<string>;
  price: FormControl<number | null>;
  description: FormControl<string>;
  category: FormControl<string>;
  thumbnail: FormControl<string>;
  tags: FormControl<string>;
}

/** Lightweight URL check (not exhaustive) used only to give early UX feedback. */
const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-form.component.html',
  styleUrl: './product-form.component.scss',
})
export class ProductFormComponent implements OnInit {
  /** Bound from `/products/:id/edit` via `withComponentInputBinding()`. */
  @Input() id?: string;

  private readonly fb = inject(FormBuilder);
  private readonly productService = inject(ProductService);
  private readonly categoryService = inject(CategoryService);
  private readonly uploadService = inject(UploadService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Comma-separated list of accepted image MIME types for the file input. */
  protected readonly acceptedTypes = ALLOWED_THUMBNAIL_TYPES.join(',');
  /** Friendly cap, used in the helper text under the file picker. */
  protected readonly maxThumbnailKb = Math.round(MAX_THUMBNAIL_BYTES / 1024);

  protected readonly editingId = signal<number | null>(null);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly uploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);

  protected readonly form = this.fb.group<ProductForm>({
    title: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    price: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    description: this.fb.nonNullable.control('', [Validators.maxLength(2000)]),
    category: this.fb.nonNullable.control('', [Validators.maxLength(100)]),
    thumbnail: this.fb.nonNullable.control('', [Validators.pattern(URL_PATTERN)]),
    tags: this.fb.nonNullable.control(''),
  });

  ngOnInit(): void {
    this.loadCategories();
    this.wireServerErrorReset();
    if (this.id) this.loadProduct(this.id);
  }

  /** Clears the synthetic `server` error on any control once the user edits it. */
  private wireServerErrorReset(): void {
    for (const control of Object.values(this.form.controls)) {
      control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        const errors = control.errors;
        if (errors && 'server' in errors) {
          const { server: _server, ...rest } = errors;
          control.setErrors(Object.keys(rest).length === 0 ? null : rest);
        }
      });
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const input = this.toInput();
    const editingId = this.editingId();
    this.submitting.set(true);

    const request$ = editingId === null
      ? this.productService.create(input)
      : this.productService.update(editingId, input);

    request$
      .pipe(
        tap((saved) => {
          this.submitting.set(false);
          this.notifications.success(editingId === null ? 'Product created.' : 'Product updated.');
          this.router.navigate(['/products', saved.id]);
        }),
        catchError((err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.handleSaveError(err);
          return of(null);
        }),
      )
      .subscribe();
  }

  protected cancel(): void {
    const editingId = this.editingId();
    this.router.navigate(editingId ? ['/products', editingId] : ['/products']);
  }

  /** True when the control has been touched/dirtied AND has the given error key. */
  protected hasError(controlName: keyof ProductForm, errorKey: string): boolean {
    const control = this.form.controls[controlName];
    return (control.touched || control.dirty) && control.hasError(errorKey);
  }

  /** Returns the server-provided message for a control, if any. */
  protected serverError(controlName: keyof ProductForm): string | null {
    const errors = this.form.controls[controlName].errors;
    const server = errors?.['server'];
    return typeof server === 'string' ? server : null;
  }

  private loadCategories(): void {
    this.categoryService
      .list()
      .pipe(
        tap((list) => this.categories.set(list)),
        catchError(() => {
          // The dropdown will be empty; the field stays usable as plain input
          // for typing a slug (validation happens on the server).
          return of([] as Category[]);
        }),
      )
      .subscribe();
  }

  private loadProduct(rawId: string): void {
    const numericId = Number(rawId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      this.loadError.set('Invalid product id.');
      return;
    }

    this.editingId.set(numericId);
    this.loading.set(true);
    this.productService
      .getById(numericId)
      .pipe(
        tap((product) => {
          this.patchFromProduct(product);
          this.loading.set(false);
        }),
        catchError((err: HttpErrorResponse) => {
          this.loadError.set(err.status === 404 ? 'Product not found.' : 'Failed to load product.');
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe();
  }

  /** Maps a server `400` with `{ details: { fieldErrors: {...} } }` onto the form. */
  private handleSaveError(err: HttpErrorResponse): void {
    if (err.status === 400 && err.error?.details?.fieldErrors) {
      const fieldErrors = err.error.details.fieldErrors as Record<string, string[]>;
      let mapped = 0;
      for (const [field, messages] of Object.entries(fieldErrors)) {
        const control = this.form.get(field);
        if (control && messages.length > 0) {
          control.setErrors({ ...(control.errors ?? {}), server: messages[0] });
          control.markAsTouched();
          mapped++;
        }
      }
      this.notifications.error(
        mapped > 0 ? 'Please fix the highlighted fields.' : 'The server rejected the request.',
      );
      return;
    }

    if (err.status === 404) {
      this.notifications.error('This product no longer exists.');
      return;
    }

    this.notifications.error('Could not save the product. Please try again.');
  }

  /** File-input change handler: validates client-side, then uploads. */
  protected onThumbnailSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validationError = this.validateThumbnail(file);
    if (validationError) {
      this.uploadError.set(validationError);
      input.value = '';
      return;
    }

    this.uploadError.set(null);
    this.uploading.set(true);

    this.uploadService
      .uploadThumbnail(file)
      .pipe(
        tap((res) => {
          this.form.controls.thumbnail.setValue(res.url);
          this.form.controls.thumbnail.markAsDirty();
          this.uploading.set(false);
          this.notifications.success('Thumbnail uploaded.');
        }),
        catchError((err: HttpErrorResponse) => {
          this.uploading.set(false);
          const serverMsg = typeof err.error?.error === 'string' ? err.error.error : null;
          this.uploadError.set(serverMsg ?? 'Upload failed. Please try again.');
          return of(null);
        }),
      )
      .subscribe();

    // Allow re-selecting the same file later (browser would otherwise ignore it).
    input.value = '';
  }

  protected clearThumbnail(): void {
    this.form.controls.thumbnail.setValue('');
    this.form.controls.thumbnail.markAsDirty();
    this.uploadError.set(null);
  }

  /** Returns a user-facing error string, or null when the file is acceptable. */
  private validateThumbnail(file: File): string | null {
    if (!ALLOWED_THUMBNAIL_TYPES.includes(file.type as (typeof ALLOWED_THUMBNAIL_TYPES)[number])) {
      return `Unsupported file type (${file.type || 'unknown'}). Use JPEG, PNG, WebP, or GIF.`;
    }
    if (file.size > MAX_THUMBNAIL_BYTES) {
      const sizeKb = Math.round(file.size / 1024);
      return `File is too large (${sizeKb} KB). Max ${this.maxThumbnailKb} KB.`;
    }
    return null;
  }

  private patchFromProduct(product: Product): void {
    this.form.patchValue({
      title: product.title,
      price: product.price,
      description: product.description,
      category: product.category,
      thumbnail: product.thumbnail,
      tags: product.tags.join(', '),
    });
  }

  private toInput(): CreateProductInput {
    const v = this.form.getRawValue();
    return {
      title: v.title.trim(),
      price: v.price ?? 0,
      description: v.description.trim(),
      category: v.category.trim(),
      thumbnail: v.thumbnail.trim(),
      tags: v.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    };
  }
}
