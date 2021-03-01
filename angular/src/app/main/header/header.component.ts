import { DataService } from 'src/app/shared/services/data.service';
import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { AuthService } from 'src/app/shared/services/auth.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Location } from '@angular/common';
import { ScreenSizeService } from 'src/app/shared/services/screen-size.service';
import * as globals from 'src/app/shared/globals';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})

export class HeaderComponent implements OnInit, OnDestroy {

  public showProfileIcon: boolean;
  public isWelcomePageSubs: Subscription;
  public windowWidth: number;
  private windowWidthListener: Subscription;
  public BREAKPOINT = globals.BREAKPOINTS.MD;

  constructor(
    public auth: AuthService,  // do not delete - used in html
    public router: Router,
    public data: DataService,
    public location: Location,
    private screenSize: ScreenSizeService
  ) {
   this.windowWidth = this.screenSize.width;
   this.windowWidthListener =  this.screenSize.resize.subscribe( (newWidth: {width: number, height: number}) => {
     this.windowWidth = newWidth.width;
   });
  }

  ngOnInit() {}

  onLoginClick() {
    this.router.navigate(['/login']);
  }

  onLogoClick() {
    this.router.navigate(['/welcome']);
  }

  onProfileClick() {
    if (this.auth.isGuest) {
      // this.router.navigate(['/login']);
      this.auth.logout();
      this.router.navigate(['/welcome']);

    } else {
      // save url so profile knows where to navigate back to...
      const url = this.router.url;
      // dont do anything if already in profile
      if (url !== '/profile') {
        this.data.set({redirect: this.router.url});
        this.router.navigate(['/profile']);
      }
    }

  }


  ngOnDestroy() {
    if (this.windowWidthListener) { this.windowWidthListener.unsubscribe(); }
  }

}
