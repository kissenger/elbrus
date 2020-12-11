import { DataService } from './shared/services/data.service';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
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
    private router: Router,
    private data: DataService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if ( this.auth.isToken() ) {
      return true;

    } else {

      const url: string = state.url;
      this.data.set({redirect: url});
      this.router.navigate(['/welcome']);
      return false;

    }
  }
}
