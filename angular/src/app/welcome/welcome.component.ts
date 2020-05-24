import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoginService } from '../shared/services/login.service';
import { Subscription } from 'rxjs';
import { HttpService } from '../shared/services/http.service';
import { AlertService } from '../shared/services/alert.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent implements OnInit, OnDestroy {

  // private verificationString;
  private httpSubscription: Subscription;
  private paramsSubscription: Subscription;

  constructor(
    private route: ActivatedRoute,
    public login: LoginService,
    public httpService: HttpService,
    private alert: AlertService
  ) { }

  ngOnInit() {

    this.paramsSubscription = this.route.params.subscribe( params => {
      const verificationString = params.verificationString;
      const userId = params.userId;

      // if this is a verification action we will have a userId
      if (userId) {

        this.httpSubscription = this.httpService.verifyAccount(userId, verificationString).subscribe( result => {
          if (result.success) { this.login.showAsElement(true).subscribe( () => {} ); }

        }, (error) => {
          this.alert.showAsElement('Something went wrong :(', error.status + ': ' + error.error, true, false).subscribe( () => {});
        });

      }
    });

  }


  /**
   * Actions to do when component is destroyed
   */
  ngOnDestroy() {
    if (this.httpSubscription) { this.httpSubscription.unsubscribe(); }
    if (this.paramsSubscription) { this.paramsSubscription.unsubscribe(); }
  }


}



