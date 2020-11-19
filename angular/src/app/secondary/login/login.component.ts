import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { TsUser } from '../../shared/interfaces';
import { AlertService } from '../../shared/services/alert.service';
import { AuthService } from '../../shared/services/auth.service';
import * as globals from '../../shared/globals';
import { Location } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})

export class LoginComponent implements OnInit, OnDestroy {

  public password = '';
  public passwordConfirm = '';
  public email = '';
  public userName = '';
  private isLoginTabActive = true;

  constructor(
    private auth: AuthService,
    private alert: AlertService,
    private router: Router,
    private location: Location
    ) {}

  ngOnInit() {}

  // Need to know which tab is active when the submit btn is pressed, so keep track of btn presses
  onSelectLoginTab() {
    this.isLoginTabActive = true;
  }

  onSelectRegisterTab() {
    this.isLoginTabActive = false;
  }

  onSubmit() {
    if (this.isLoginTabActive) {
      this.onLoginClick();
    } else {
      this.onRegisterClick();
    }
  }

  onCancel() {
    this.location.back();
  }

  async onLoginClick() {

    try {

      const userName = document.forms['login-form']['userName'].value;
      const password = document.forms['login-form']['password'].value;
      await this.auth.login(userName, password);
      this.router.navigate(['route/list']);

    } catch (error) {

      this.alert.showAsElement('Something went wrong :(', error + ': ' + error, true, false).subscribe( () => {});

    }

  }


  async onRegisterClick() {

    const userName = document.forms['register-form']['userName'].value;
    const email = document.forms['register-form']['email'].value;
    const password = document.forms['register-form']['password'].value;

    // basic form validation - TODO look into bootstrap form validation
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
        homeLngLat: globals.defaultMapView.centre,
        units: globals.defaultUnits
      };

      try {

        await this.auth.register(user);
        this.router.navigate(['route/list']);

      } catch (error) {
        this.alert.showAsElement('Something went wrong :(', error + ': ' + error, true, false).subscribe( () => {});
      }

    }

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
