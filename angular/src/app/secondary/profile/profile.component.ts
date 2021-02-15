import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
import { TsUser } from '../../shared/interfaces';
import { HttpService } from '../../shared/services/http.service';
import { Subscription } from 'rxjs';
import { DataService } from '../../shared/services/data.service';
import { SpinnerService } from '../../shared/services/spinner.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {

  public isChanged = false;
  private httpSubscription: Subscription;

  constructor(
    private auth: AuthService,
    private http: HttpService,
    private data: DataService,
    private spinner: SpinnerService,
    private router: Router
  ) { }

  /**
   * We can arrive here from menu, or after use has selected new home location, so
   * we check for data stored in dataService and if its there then thats the new location
   * and we use it, otherwise use the location stored in auth.user
   */
  async ngOnInit() {

    const newLocation = this.data.get('newHomeLocation');
    this.data.clearKey('newHomeLocation');

    if ( !!newLocation ) {
      const user = this.auth.user;
      user.homeLngLat = newLocation;
      await this.updateUser(user);
    }

  }

  onChangeLocationClick() {
    this.router.navigate(['profile/select-home']);
  }

  async onChangeDistanceUnits() {
    const user = this.auth.user;
    user.units.distance = user.units.distance === 'mi' ? 'km' : 'mi';
    await this.updateUser(user);
  }

  async onChangeElevationUnits() {
    const user = this.auth.user;
    user.units.elevation = user.units.elevation === 'ft' ? 'm' : 'ft';
    await this.updateUser(user);
  }


  updateUser(user: TsUser) {

    return new Promise<boolean>( (resolve, reject) => {

      this.spinner.showAsElement();

      this.httpSubscription = this.http.updateUserData(user).subscribe( () => {
        this.spinner.removeElement();
        this.auth.user = user;
        resolve(true);
      },

      (error) => {
        this.spinner.removeElement();
        console.log(error);
        resolve(false);
      });
    });

  }

  onLogoutClick() {
    this.auth.logout();
    this.router.navigate(['/welcome']);
  }

  onClose() {
    const redirect = this.data.get('redirect');
    if (redirect) {
      this.router.navigate([redirect]);
    } else {
      this.router.navigate(['/routes/list']);
    }
  }


  ngOnDestroy(): void {
    this.data.unitsUpdateEmitter.emit();
    if (this.httpSubscription) { this.httpSubscription.unsubscribe(); }

  }

}
