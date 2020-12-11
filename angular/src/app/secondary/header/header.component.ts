import { DataService } from 'src/app/shared/services/data.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from 'src/app/shared/services/auth.service';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Location } from '@angular/common';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})

export class HeaderComponent implements OnInit, OnDestroy {

  public showMenu: boolean;
  public isWelcomePageSubs: Subscription;

  constructor(
    public auth: AuthService,  // do not delete - used in html
    public router: Router,
    public data: DataService,
    public location: Location
  ) { }

  ngOnInit() {

    // this detects a route change so we know what page we are on and dynamically set header menu
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.showMenu = event.urlAfterRedirects !== '/welcome' && event.urlAfterRedirects !== '/login';
      }
    });

  }

  onLogoutClick() {
    this.auth.logout();
    this.router.navigate(['/welcome']);
  }

  onLoginClick() {
    this.router.navigate(['/login']);
  }

  onProfileClick() {
    // save url so profile knows where to navigate back to...
    const url = this.router.url;
    // dont do anything if already in profile
    if (url !== '/profile') {
      this.data.set({redirect: this.router.url});
      this.router.navigate(['/profile']);
    }

  }


  ngOnDestroy() {}

}
