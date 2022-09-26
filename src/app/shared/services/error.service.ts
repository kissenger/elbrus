
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { throwError } from 'rxjs';
import { AlertService } from './alert.service';

@Injectable({
  providedIn: 'root'
})

export class ErrorService {

  constructor(
    private alert: AlertService
  ) {}


  // note arrow function preserves 'this' inside observable
  public handleError = (error: HttpErrorResponse) => {
    // https://angular.io/guide/http#handling-request-errors
    if (error.error instanceof ProgressEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('Error:', error);
      this.alert.showAsElement(`${error.status}: ${error.name} `, error.message, true, false).subscribe( () => {});
    } else {
      // The backend returned an unsuccessful response code.
      console.error('Error from backend: ', error);
      this.alert.showAsElement(`${error.status}: ${error.name} `, error.error, true, false).subscribe( () => {});
    }

    // Return an observable with a user-facing error message.
    return throwError('');
  }

}

