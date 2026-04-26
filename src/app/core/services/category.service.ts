import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Category } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/categories`;

  /** Categories rarely change; cache the first successful response. */
  private cache$: Observable<Category[]> | null = null;

  list(): Observable<Category[]> {
    if (!this.cache$) {
      this.cache$ = this.http.get<Category[]>(this.url).pipe(
        tap({ error: () => (this.cache$ = null) }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.cache$;
  }
}
