import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../shared/services/auth.service';
import { HttpService } from '../shared/services/http.service';
import { AlertService } from '../shared/services/alert.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit, OnDestroy {

  constructor(
    public auth: AuthService,   // dont remove, used in html
    public http: HttpService,
    private alert: AlertService,
    private router: Router
  ) { }

  async ngOnInit() {

    if ( this.auth.isToken() ) {
      // if a token exists, we are logged in either as guest or user from previous session

      if ( this.auth.isGuest() ) {
        // this.router.navigate(['welcome']);
      } else {
        this.router.navigate(['route/list']);
      }

    } else {
      // if we dont have a token, then log in as a guest

      try {
        await this.auth.login('guest', null);
      } catch (error) {
        console.log('failed to log in as guest');
      }
    }



  }

  ngOnDestroy() {
    // clearInterval(this.timer);
  }
}
