import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  CreateProductInput,
  Product,
  ProductSearchParams,
  ProductSearchResult,
  UpdateProductInput,
} from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/products`;

  /**
   * Emits whenever a product is created or updated. Consumers (e.g. the list
   * view) subscribe to refresh themselves without resorting to a global store.
   */
  private readonly changedSubject = new Subject<void>();
  readonly productsChanged$ = this.changedSubject.asObservable();

  search(params: ProductSearchParams = {}): Observable<ProductSearchResult> {
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return this.http.get<ProductSearchResult>(`${this.baseUrl}/search`, { params: httpParams });
  }

  getById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }

  create(input: CreateProductInput): Observable<Product> {
    return this.http
      .post<Product>(`${this.baseUrl}/add`, input)
      .pipe(tap(() => this.changedSubject.next()));
  }

  update(id: number, input: UpdateProductInput): Observable<Product> {
    return this.http
      .put<Product>(`${this.baseUrl}/${id}`, input)
      .pipe(tap(() => this.changedSubject.next()));
  }
}
