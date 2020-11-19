
import { Subscription } from 'rxjs';
import { AuthService } from '../../shared/services/auth.service';
import { TsCoordinate, TsUser } from '../../shared/interfaces';
import { Router } from '@angular/router';
import { DataService } from '../../shared/services/data.service';
import { Component, OnInit, OnDestroy} from '@angular/core';
import { MapService } from 'src/app/shared/services/map.service';

@Component({
  selector: 'app-map-select-location',
  templateUrl: './map-select-location.component.html',
  styleUrls: ['./map-select-location.component.css']
})

export class MapSelectLocationComponent implements OnInit, OnDestroy {

  private user: TsUser;
  private locationSubscription: Subscription;
  public location: TsCoordinate;

  constructor(
    private mapService: MapService,
    private data: DataService,
    private router: Router,
    private auth: AuthService
    ) { }

  async ngOnInit() {

    this.user = this.auth.getUser();
    this.location = this.user.homeLngLat;
    await this.mapService.newMap(this.location);
    this.mapService.plotMarker(this.user.homeLngLat);

    this.mapService.getLocationOnClick();
    this.locationSubscription = this.data.locationEmitter.subscribe( (loc: TsCoordinate) => {
      this.location = loc;
    });

  }

  onOK () {
    this.data.saveToStore('newLocation', this.location);
    this.router.navigate(['profile']);
  }

  onCancel () {
    this.router.navigate(['profile']);
  }

  ngOnDestroy() {
    if (this.locationSubscription) { this.locationSubscription.unsubscribe(); }
    console.log(this.location);
  }

}
