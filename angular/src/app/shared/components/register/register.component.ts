
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

  public password = '';
  public passwordConfirm = '';
  public email = '';
  public userName = '';

  constructor(
    private login: LoginService,
    private http: HttpService,
    private alert: AlertService,
    private auth: AuthService,
    private router: Router
  ) { }

  ngOnInit() {

  }

  onRegisterClick() {

    // get form data
    const userName = document.forms['register-form']['userName'].value;
    const email = document.forms['register-form']['email'].value;
    const password = document.forms['register-form']['password'].value;

    // console.log(this.isValidEmail(), this.isValidPassword(), this.isValidPasswordConfirm(), this.isValidUserName());

    // basic form validation
    if (userName === '' || email === '' || password === '') {
      this.alert.showAsElement('Incomplete form', 'Make sure all fields are completed', true, false).subscribe( () => {});

    } else if (this.notValidEmail() || this.notValidPassword() || this.notValidPasswordConfirm() || this.notValidUserName() ) {
      this.alert.showAsElement('Form error', 'Ensure all fields are valid', true, false).subscribe( () => {});

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
        console.log(error);
        this.alert.showAsElement('Something went wrong :(', error.status + ': ' + error.error, true, false).subscribe( () => {
        });

      });
    }


  }

  onLoginClick() {
    this.close.next();
    this.login.showAsElement(false).subscribe( (response) => {
      console.log(response);
    });
  }

  notValidEmail() {
    return !this.email.match(/[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,6}/);
  }

  notValidUserName() {
    return this.userName.length < 2;
  }

  notValidPassword() {
    return this.password.length < 6;
  }

  notValidPasswordConfirm() {
    return this.password !== this.passwordConfirm;
  }


  ngOnDestroy() {}

}
