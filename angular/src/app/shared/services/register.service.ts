import { Injectable } from '@angular/core';
import { NgElement, WithProperties } from '@angular/elements';
import { RegisterComponent } from 'src/app/shared/components/register/register.component';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RegisterService {

  private register: NgElement & WithProperties<RegisterComponent>;

  constructor() { }

  removeElement() {
    if (document.body.contains(this.register)) {
      document.body.removeChild(this.register);
    }
  }

  showAsElement() {

    this.register = document.createElement('register-box') as any;
    document.body.appendChild(this.register);

    return new Observable( (observer) => {

      // Listen to the close event
      this.register.addEventListener('close', () => {
        document.body.removeChild(this.register);
        return observer.next(false);
      });

      // Listen to the ok event
      this.register.addEventListener('ok', () => {
        document.body.removeChild(this.register);
        return observer.next(true);
      });
    });
  }
}
