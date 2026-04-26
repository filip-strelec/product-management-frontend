import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, of, tap } from 'rxjs';
import { ProductService } from '../../../core/services/product.service';
import type { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetailComponent implements OnInit {
  /** Bound from the route param via `withComponentInputBinding()`. */
  @Input() id?: string;

  private readonly productService = inject(ProductService);
  private readonly router = inject(Router);

  protected readonly product = signal<Product | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const numericId = Number(this.id);
    if (!this.id || !Number.isInteger(numericId) || numericId <= 0) {
      this.error.set('Invalid product id.');
      this.loading.set(false);
      return;
    }

    this.productService
      .getById(numericId)
      .pipe(
        tap((p) => {
          this.product.set(p);
          this.loading.set(false);
        }),
        catchError((err: { status?: number }) => {
          this.error.set(err.status === 404 ? 'Product not found.' : 'Failed to load product.');
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe();
  }

  protected back(): void {
    this.router.navigate(['/products']);
  }
}
