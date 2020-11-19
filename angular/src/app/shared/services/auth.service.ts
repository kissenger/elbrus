import { Injectable } from '@angular/core';
import { TsUser } from 'src/app/shared/interfaces';
import { HttpService } from './http.service';

@Injectable()

export class AuthService {

  constructor(
    private http: HttpService
  ) {

  }

  isToken() {
    // if there is a token then we are logged in as user or guest
    return !!sessionStorage.getItem('tsToken');
  }

  isGuestUser() {
    try {
      return JSON.parse(sessionStorage.getItem('user')).userName === 'guest';
    } catch {
      return false;
    }
  }

  isRegisteredUser() {
    return this.isToken() && !this.isGuestUser();
  }

  getToken() {
    return sessionStorage.getItem('tsToken');
  }

  setToken(token: string) {
    sessionStorage.setItem('tsToken', token);
  }

  setUser(user: TsUser) {
    sessionStorage.setItem('user', JSON.stringify(user));
  }

  getUser() {
    return JSON.parse(sessionStorage.getItem('user'));
  }

  deleteToken() {
    sessionStorage.removeItem('tsToken');
    sessionStorage.removeItem('user');
  }

  logout() {
    // actually just re-login as guest - unless sthat fails, in which case delete the token
    // try {
    //   this.login( 'guest', null );
    // } catch {
      this.deleteToken();
    // }
  }

  login( userName: string, password: string ) {

    return new Promise( (res, rej) => {

      this.http.login( {userName, password} ).subscribe( (result) => {

        this.setToken(result.token);
        this.setUser(result.user);
        res();

      }, (error) => {

        // throw new Error(error);
        rej(error);

      });
    });

  }


  register(user) {

    return new Promise( (res, rej) => {


      this.http.register(user).subscribe( (result) => {

        this.setToken(result.token);
        this.setUser(result.user);
        res();

      }, (error) => {

        rej(error);

      });

    });

  }



}
