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
    public dataService: DataService,
    public location: Location
  ) { }

  ngOnInit() {

    // this detects a route change so we know what page we are on and dynamically set header menu
    console.log('hiof');
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
    this.router.navigate(['/profile']);
  }


  ngOnDestroy() {}

}
