import { Injectable } from '@angular/core';
import { NgElement, WithProperties } from '@angular/elements';
import { LoginComponent } from 'src/app/shared/components/login/login.component';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private login: NgElement & WithProperties<LoginComponent>;

  constructor() { }

  removeElement() {
    if (document.body.contains(this.login)) {
      document.body.removeChild(this.login);
    }
  }

  showAsElement() {

    // Add to the DOM
    this.login = document.createElement('login-box') as any;
    document.body.appendChild(this.login);

    return new Observable( (observer) => {

      // Listen to the close event
      this.login.addEventListener('close', () => {
        document.body.removeChild(this.login);
        return observer.next(false);
      });

      // Listen to the ok event
      this.login.addEventListener('ok', () => {
        document.body.removeChild(this.login);
        return observer.next(true);
      });
    });
  }

}
