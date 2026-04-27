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
import type {
  Product,
  ProductSearchResult,
  ProductSortField,
  SortOrder,
} from '../../../core/types/product.types';

interface SortOption {
  readonly field: ProductSortField;
  readonly label: string;
  /** Direction picked the first time this field is selected. */
  readonly defaultOrder: SortOrder;
}

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
  protected readonly sortBy = signal<ProductSortField>('id');
  protected readonly order = signal<SortOrder>('asc');

  protected readonly currentPage = computed(() => Math.floor(this.skip() / this.pageSize) + 1);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  // Dates default to newest-first; text/number to ascending. Picked once when
  // the user switches fields; subsequent clicks on the same field toggle it.
  protected readonly sortOptions: readonly SortOption[] = [
    { field: 'title',     label: 'Name',    defaultOrder: 'asc' },
    { field: 'price',     label: 'Price',   defaultOrder: 'asc' },
    { field: 'createdAt', label: 'Created', defaultOrder: 'desc' },
    { field: 'updatedAt', label: 'Updated', defaultOrder: 'desc' },
  ];

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

  /** Click handler for a sort button: toggles direction or switches field. */
  protected setSort(option: SortOption): void {
    if (this.sortBy() === option.field) {
      this.order.set(this.order() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(option.field);
      this.order.set(option.defaultOrder);
    }
    this.skip.set(0);
    this.fetch(this.searchControl.value, 0).subscribe();
  }

  private fetch(q: string, skip: number): Observable<ProductSearchResult | null> {
    this.loading.set(true);
    this.error.set(null);
    return this.productService
      .search({ q, skip, limit: this.pageSize, sortBy: this.sortBy(), order: this.order() })
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
