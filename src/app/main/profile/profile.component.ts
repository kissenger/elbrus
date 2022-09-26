import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
import { TsCoordinate, TsUser } from '../../shared/interfaces';
import { HttpService } from '../../shared/services/http.service';
import { Subscription } from 'rxjs';
import { DataService } from '../../shared/services/data.service';
import { SpinnerService } from '../../shared/services/spinner.service';
import { Router } from '@angular/router';
import { MapService } from 'src/app/shared/services/map.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {

  private httpSubscription: Subscription;
  private newLocationListener: Subscription;
  public home: TsCoordinate;

  constructor(
    public auth: AuthService,
    private http: HttpService,
    private map: MapService,
    private data: DataService,
    private spinner: SpinnerService,
    private router: Router
  ) {  }


  async ngOnInit() {

    // initialise map with home location
    this.home = this.auth.user.homeLngLat;
    await this.map.newMap(this.home, 12);

    // set up listener to catch response from map
    this.newLocationListener = this.data.clickedCoordsEmitter.subscribe( async (newHome: TsCoordinate) => {
      const user = this.auth.user;
      user.homeLngLat = newHome;
      await this.updateUser(user);
      this.map.updateHomeMarker(newHome);
    });

    // request map to catch location clicks
    this.map.getLocationOnClick();

  }

  onOK () {
    this.data.set({newHomeLocation: this.home});
    this.router.navigate(['profile']);
  }

  onCancel () {
    this.router.navigate(['profile']);
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
    if (this.newLocationListener) { this.newLocationListener.unsubscribe(); }
  }

}
