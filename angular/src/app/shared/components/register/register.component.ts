
import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { LoginService } from 'src/app/shared/services/login.service';
import { HttpService } from 'src/app/shared/services/http.service';
import { AlertService } from 'src/app/shared/services/alert.service';
import { AuthService } from 'src/app/shared/services/auth.service';
import { Router } from '@angular/router';
import { TsUser, TsUnits } from '../../interfaces';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit, OnDestroy {

  @Output()
  close = new EventEmitter();

  @Output()
  ok = new EventEmitter();

  constructor(
    private login: LoginService,
    private http: HttpService,
    private alert: AlertService,
    private auth: AuthService,
    private router: Router
  ) { }

  ngOnInit() {}

  onRegisterClick() {

    // get form data
    const userName = document.forms['register-form']['userName'].value;
    const email = document.forms['register-form']['email'].value;
    const password = document.forms['register-form']['password'].value;

    // basic form validation
    if (userName === '' || email === '' || password === '') {
      this.alert.showAsElement('Incomplete form', 'Make sure all fields are completed', true, false).subscribe( () => {});

    } else {

      const user: TsUser = {
        userName,
        email,
        password,
        isHomeLocSet: false,
        units: <TsUnits>{
          distance: 'mi',
          elevation: 'm'
        }
      };
      this.http.registerUser(user).subscribe( (res) => {

        // success
        this.close.next();
        this.auth.setToken(res.token);
        this.auth.setUser(res.user);
        this.router.navigate(['route/list']);

      }, (error) => {

        // failure
        this.close.next();
        this.alert.showAsElement('Something went wrong :(', error.status + ': ' + error.error, true, false).subscribe( () => {
        });

      });
    }


  }

  onLoginClick() {
    this.close.next();
    this.login.showAsElement().subscribe( (response) => {
      console.log(response);
    });
  }


  ngOnDestroy() {}

}
