import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

/**
 * Surfaces unexpected (5xx / network) errors as a toast.
 * 4xx responses are passed through so component code can handle them
 * (e.g. validation messages, "not found" routing).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 0) {
        notifications.error('Cannot reach the API. Is the backend running?');
      } else if (err.status >= 500) {
        notifications.error('Something went wrong on the server. Please try again.');
      }
      return throwError(() => err);
    }),
  );
};
