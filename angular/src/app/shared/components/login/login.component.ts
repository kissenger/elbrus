import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { HttpService } from 'src/app/shared/services/http.service';
import { Router } from '@angular/router';
import { RegisterService } from 'src/app/shared/services/register.service';
import { AuthService } from 'src/app/shared/services/auth.service';
import { AlertService } from 'src/app/shared/services/alert.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {

  @Output()
  close = new EventEmitter();

  @Output()
  ok = new EventEmitter();

  constructor(
    private http: HttpService,
    private register: RegisterService,
    private auth: AuthService,
    private alert: AlertService,
    private router: Router
    ) {}

  ngOnInit() {}

  onLoginClick() {

    const userName = document.forms['login-form']['userName'].value;
    const password = document.forms['login-form']['password'].value;

    this.http.loginUser( {userName, password}).subscribe( (res) => {

      // success
      this.close.next();
      this.auth.setToken(res.token);
      this.auth.setUser(res.user);
      // console.log(res.user);
      // this.auth.setUser(res.user);
      // this.dataService.loginUserEmitter.emit(res.user);
      this.router.navigate(['route/list']);

    }, (error) => {

      // failure
      this.close.next();
      this.alert.showAsElement('Something went wrong :(', error.status + ': ' + error.error, true, false).subscribe( () => {
      });

    });
  }

  onRegisterClick() {
    this.close.next();
    this.register.showAsElement().subscribe( (response) => {
      console.log(response);
    });
  }

  ngOnDestroy() {}
}
