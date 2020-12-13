import { DataService } from './shared/services/data.service';
import { Injectable } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
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
    private activatedRoute: ActivatedRoute,
    private data: DataService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {

    const url: string = state.url;

    if ( this.auth.isToken() ) {

      // If the last query parameter in the url is a mongo object id, store it and redirect to routes/list
      const lastQueryParam = url.split('/').slice(-1)[0];
      const isMongoObjectId = (/^[a-f\d]{24}$/i).test(lastQueryParam);
      if ( isMongoObjectId ) {
        this.data.set({pathId: lastQueryParam});
        this.router.navigate(['/routes/list']);
      }

      return true;

    } else {

      // if not logged in, store the url and redirect to login

      this.data.set({redirect: url});
      this.router.navigate(['/welcome']);
      return false;

    }
  }
}
