import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { ProductService } from '../../../core/services/product.service';
import type { Product, ProductSearchResult } from '../../../core/types/product.types';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
})
export class ProductListComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pageSize = 12;
  protected readonly searchControl = new FormControl<string>('', { nonNullable: true });

  protected readonly products = signal<Product[]>([]);
  protected readonly total = signal(0);
  protected readonly skip = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly currentPage = computed(() => Math.floor(this.skip() / this.pageSize) + 1);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.skip.set(0)),
        switchMap((q) => this.fetch(q, 0)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    // Refresh the list whenever a product is created or updated elsewhere.
    this.productService.productsChanged$
      .pipe(
        switchMap(() => this.fetch(this.searchControl.value, this.skip())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.fetch('', 0).subscribe();
  }

  protected goToPage(nextSkip: number): void {
    if (nextSkip < 0 || nextSkip >= this.total()) return;
    this.skip.set(nextSkip);
    this.fetch(this.searchControl.value, nextSkip).subscribe();
  }

  private fetch(q: string, skip: number): Observable<ProductSearchResult | null> {
    this.loading.set(true);
    this.error.set(null);
    return this.productService
      .search({ q, skip, limit: this.pageSize, sortBy: 'id', order: 'asc' })
      .pipe(
        tap((result) => {
          this.products.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        }),
        catchError(() => {
          this.error.set('Failed to load products.');
          this.loading.set(false);
          return of(null);
        }),
      );
  }
}
