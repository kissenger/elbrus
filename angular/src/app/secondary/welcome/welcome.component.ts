import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpService } from '../../shared/services/http.service';
import { AuthService } from '../../shared/services/auth.service';
import { DataService } from '../../shared/services/data.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent implements OnInit, OnDestroy {

  constructor(
    public router: Router,
    public http: HttpService,
    private auth: AuthService,
    public data: DataService,
  ) { }

  ngOnInit() {
  }

  async onGuestClick() {
    await this.auth.login('guest', null);
    const redirect = this.data.get('redirect');
    if ( redirect ) {
      this.router.navigate([redirect]);
    } else {
      this.router.navigate(['route/list']);
    }
  }

  onLoginClick() {
    this.router.navigate(['login/']);
  }

  ngOnDestroy() {

  }
}



