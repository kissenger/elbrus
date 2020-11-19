import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './shared/services/auth.service';

/**
 *
 * returns true if route is allowed and false if not allowed
 *
 */

@Injectable()

export class AuthGuard implements CanActivate {

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(): any {
    if ( this.auth.isRegisteredUser() ) {
      return true;
    } else {
      return this.router.parseUrl('/');
    }
  }
}
