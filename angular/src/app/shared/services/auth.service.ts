import { Injectable } from '@angular/core';
import { TsUser } from 'src/app/shared/interfaces';

@Injectable()

export class AuthService {

  constructor() {

  }

  isLoggedIn() {
    return !!sessionStorage.getItem('tsToken');   // double ! casts result to boolean
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

}
