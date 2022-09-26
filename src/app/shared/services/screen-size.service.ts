import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class ScreenSizeService {

  constructor() {
  }

  get width() {
    return window.innerWidth;
  }

  get height() {
    return window.innerHeight;
  }

  public resize = new Observable((observer) => {
    window.addEventListener('resize', () => {
      observer.next({
        width: window.innerWidth,
        height: window.innerHeight
      });
    });

    // bit wierd, but cant see a way to do it without repetition
    return {
      unsubscribe() {
        window.removeEventListener('resize', () => {
          observer.next({
            width: window.innerWidth,
            height: window.innerHeight
          });
        });
      }
    };

  });

}

