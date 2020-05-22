import { Injectable } from '@angular/core';
import { HttpInterceptor } from '@angular/common/http';
import { AuthService } from './auth.service';

/**
 * puts the authorisation token in the header of all outgoing requests
 * https://medium.com/@ryanchenkie_40935/angular-authentication-using-the-http-client-and-http-interceptors-2f9d1540eb8
 */

@Injectable()
export class TokenInterceptorService implements HttpInterceptor {

  constructor(
    private authService: AuthService,
  ) { }

  intercept(req, next) {
    const token = this.authService.getToken();
    if ( token ) {
      const tokenizedReq = req.clone({
        setHeaders: {
          Authorization: this.authService.getToken()
        }
      });
      return next.handle(tokenizedReq);
    } else {
      return next.handle(req);
    }
  }
}
