import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpService } from '../../shared/services/http.service';
import { AuthService } from '../../shared/services/auth.service';
import { DataService } from '../../shared/services/data.service';
import { ScreenSizeService } from 'src/app/shared/services/screen-size.service';
import { Subscription } from 'rxjs';
import * as globals from 'src/app/shared/globals';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent implements OnInit, OnDestroy {

  public windowWidth: number;
  private windowWidthListener: Subscription;
  public BREAKPOINT = globals.BREAKPOINTS.MD;

  constructor(
    public router: Router,
    public http: HttpService,
    private auth: AuthService,
    public data: DataService,
    private screenSize: ScreenSizeService
  ) {
   this.windowWidth = this.screenSize.width;
   this.windowWidthListener =  this.screenSize.resize.subscribe( (newWidth: {width: number, height: number}) => {
     this.windowWidth = newWidth.width;
   });
  }


  ngOnInit() {
    if (this.auth.isRegistered) {
      this.router.navigate(['routes/list']);
    }
  }

  async onGuestClick() {
    await this.auth.login('guest', null);
    const redirect = this.data.get('redirect');
    if ( redirect ) {
      this.router.navigate([redirect]);
    } else {
      this.router.navigate(['routes/list']);
    }
  }

  onLoginClick() {
    this.router.navigate(['login/']);
  }

  ngOnDestroy() {
    if (this.windowWidthListener) { this.windowWidthListener.unsubscribe(); }
  }
}



