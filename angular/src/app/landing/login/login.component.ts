import { DataService } from '../../shared/services/data.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { TsUser } from '../../shared/interfaces';
import { AlertService } from '../../shared/services/alert.service';
import { AuthService } from '../../shared/services/auth.service';
import * as globals from '../../shared/globals';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { ScreenSizeService } from 'src/app/shared/services/screen-size.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})

export class LoginComponent implements OnInit, OnDestroy {

  public windowWidth: number;
  private windowWidthListener: Subscription;
  public BREAKPOINT = globals.BREAKPOINTS.MD;

  public password = '';
  public passwordConfirm = '';
  public email = '';
  public userName = '';
  private isLoginTabActive = true;

  constructor(
    private auth: AuthService,
    private alert: AlertService,
    private router: Router,
    private location: Location,
    private data: DataService,
    private screenSize: ScreenSizeService
  ) {
   this.windowWidth = this.screenSize.width;
   this.windowWidthListener =  this.screenSize.resize.subscribe( (newWidth: {width: number, height: number}) => {
     this.windowWidth = newWidth.width;
   });
  }

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
      const redirect = this.data.get('redirect');
      // this.data.clearKey('reDirect');
      this.data.clearAll(); // new login so clear all stored data
      if ( redirect ) {
        this.router.navigate([redirect]);
      } else {
        this.router.navigate(['routes/list']);
      }


    } catch (error) {

      // console.log(error);
      // this.alert.showAsElement(`${error.name}: ${error.name} `, error.message, true, false).subscribe( () => {});

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
        this.data.clearAll(); // new login so clear all stored data
        this.router.navigate(['routes/list']);

      } catch (error) {
        // console.log(error);
        // this.alert.showAsElement(`${error.name}: ${error.name} `, error.message, true, false).subscribe( () => {});
      }

    }

  }

  notValidEmail() {
    return !this.email.match(/[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,6}/);
  }

  notValidUserName() {
    // regex matches whitespace at front or end to avoid username typo - disallow all spaces, aids search by username
    // return this.userName.length < 4 || this.userName.match(/(^\s)|(\s$)/);
    return this.userName.length < 4 || this.userName.match(/\s/);
  }

  notValidPassword() {
    return this.password.length < 6;
  }

  notValidPasswordConfirm() {
    return this.password !== this.passwordConfirm;
  }

  ngOnDestroy() {
    if (this.windowWidthListener) { this.windowWidthListener.unsubscribe(); }
  }

}
