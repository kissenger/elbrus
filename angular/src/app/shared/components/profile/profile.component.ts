import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { TsUser, TsUnits, TsCoordinate } from '../../interfaces';
import { MapService } from '../../services/map.service';
import * as globals from 'src/app/shared/globals';
import { HttpService } from '../../services/http.service';
import { Subscription } from 'rxjs';
import { AlertService } from '../../services/alert.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {

  @Output()
  close = new EventEmitter();

  @Output()
  ok = new EventEmitter();

  public user: TsUser;
  // public homeLocation: any;
  public hideTemplate = false;
  // public units: TsUnits;
  public isChanged = false;
  public isElevChecked: boolean;
  public isDistChecked: boolean;
  private httpSubscription: Subscription;
  public locationString: string;
  public locationCoords: TsCoordinate;
  public locationUpdated = false;


  constructor(
    private auth: AuthService,
    private mapService: MapService,
    private http: HttpService,
    private alert: AlertService,
    private dataService: DataService
  ) { }

  ngOnInit(): void {
    this.user = this.auth.getUser();
    this.locationCoords = this.user.homeLngLat;
    this.locationString = this.user.isHomeLocSet ? this.coordToString(this.user.homeLngLat) : 'Not set';
    this.isDistChecked = this.user.units.distance === 'km';
    this.isElevChecked = this.user.units.elevation === 'ft';
  }

  coordToString(lngLat: TsCoordinate) {
    return '[' + lngLat.lng.toFixed(5) + ', ' + lngLat.lat.toFixed(5) + ']';
  }

  onSetLocationClick() {
    this.hideTemplate = true;
    this.mapService.getLocationOnClick().then( (loc) => {
      this.locationCoords = loc;
      this.locationString = '[' + loc.lng.toFixed(5) + ', ' + loc.lat.toFixed(5) + ']';
      this.locationUpdated = true;
      this.hideTemplate = false;
      this.isChanged = true;
    });
  }

  onToggleClick() {
    this.isChanged = true;
  }

  onSaveClick() {

    this.user.homeLngLat = this.locationCoords;
    this.user.isHomeLocSet = this.locationUpdated || this.user.isHomeLocSet;
    this.user.units = {
      distance: this.isDistChecked ? 'km' : 'mi',
      elevation: this.isElevChecked ? 'ft' : 'm'
    };

    this.httpSubscription = this.http.updateUserData(this.user).subscribe( (res) => {
      this.auth.setUser(this.user);
      this.dataService.unitsUpdateEmitter.emit();
      this.close.next();
      this.alert.showAsElement('Success!', 'User data updated', true, false).subscribe( (alertBoxResponse: boolean) => {
      });
    });


  }

  ngOnDestroy(): void {
    if (this.httpSubscription) { this.httpSubscription.unsubscribe(); }

  }

}
