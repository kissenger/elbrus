import { Injectable } from '@angular/core';
import { NgElement, WithProperties } from '@angular/elements';
import { LoginComponent } from '../components/login/login.component';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

private profile: NgElement & WithProperties<LoginComponent>;

constructor() { }

isActive() {
  return document.body.contains(this.profile);
}

removeElement() {
  if (document.body.contains(this.profile)) {
    document.body.removeChild(this.profile);
  }
}

showAsElement() {

  // Add to the DOM
  this.profile = document.createElement('profile-box') as any;
  document.body.appendChild(this.profile);

  return new Observable( (observer) => {

    // Listen to the close event
    this.profile.addEventListener('close', () => {
      document.body.removeChild(this.profile);
      return observer.next(false);
    });

    // Listen to the ok event
    this.profile.addEventListener('ok', () => {
      document.body.removeChild(this.profile);
      return observer.next(true);
    });
  });
}

}

