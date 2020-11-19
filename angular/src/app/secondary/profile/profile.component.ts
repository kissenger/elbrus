import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
import { TsUser } from '../../shared/interfaces';
import { HttpService } from '../../shared/services/http.service';
import { Subscription } from 'rxjs';
import { AlertService } from '../../shared/services/alert.service';
import { DataService } from '../../shared/services/data.service';
import { SpinnerService } from '../../shared/services/spinner.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {

  public user: TsUser;
  public isChanged = false;
  private httpSubscription: Subscription;
  private CLEAR_KEY = true;

  constructor(
    private auth: AuthService,
    private http: HttpService,
    private alert: AlertService,
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
    console.log('enter profile');
    this.user = this.auth.getUser();
    const newLocation = this.data.getFromStore('newLocation', this.CLEAR_KEY);
    const oldLocation = this.user.homeLngLat; // needed in case new location cannot be saved, revert back to old

    if ( !!newLocation ) {
      this.user.homeLngLat = newLocation;
      if (!await this.updateUser()) {
        this.user.homeLngLat = oldLocation;
      }
    }

  }

  onChangeLocation() {
    this.router.navigate(['profile/select-home']);
  }

  async onChangeDistanceUnits() {
    this.toggleDistanceUnits();
    // if unsuccessful, re-toggle units
    if (!await this.updateUser()) {
      this.toggleDistanceUnits();
    }
  }

  async onChangeElevationUnits() {
    this.toggleElevationUnits();
    // only update screen if operation was successful, otherwise reset units to original
    if (!await this.updateUser()) {
      this.toggleElevationUnits();
    }
  }

  toggleDistanceUnits() {
    this.user.units.distance = this.user.units.distance === 'mi' ? 'km' : 'mi';
  }

  toggleElevationUnits() {
    this.user.units.elevation = this.user.units.elevation === 'ft' ? 'm' : 'ft';
  }


  updateUser() {

    return new Promise<boolean>( (resolve, reject) => {

      this.spinner.showAsElement();

      this.httpSubscription = this.http.updateUserData(this.user).subscribe( (res) => {
        this.spinner.removeElement();
        this.auth.setUser(this.user);
        resolve(true);
      },

      (err) => {
        this.spinner.removeElement();
        this.alert.showAsElement('Something went wrong!', 'Could not update user data: ' + err.message, true, false)
          .subscribe( () => {});
        resolve(false);
      });
    });

  }

  onClose() {
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    console.log('leave profile');
    this.data.unitsUpdateEmitter.emit();
    if (this.httpSubscription) { this.httpSubscription.unsubscribe(); }

  }

}
