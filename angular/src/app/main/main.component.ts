import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../shared/services/auth.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit, OnDestroy {

  constructor(
    private auth: AuthService   // dont remove, used in html
  ) { }

  ngOnInit() {

    // gets the url - delay needed to ensure page has loaded - not neat but can't find a better way
    // this.timer = setInterval( () => {
    //   if (this.router.url !== '/') { 
    //     this.page = this.router.url.split('/')[2];
    //     clearInterval(this.timer); 
    //   } 
    // }, 1);

  }

  ngAfterViewInit() {
    // console.log(this.router.url);
    // console.log(window.location.href);

  }

  ngOnDestroy() {
    // clearInterval(this.timer);
  }
}
