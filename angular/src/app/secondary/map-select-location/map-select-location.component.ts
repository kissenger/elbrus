import { Subscription } from 'rxjs';
import { AuthService } from '../../shared/services/auth.service';
import { TsCoordinate } from '../../shared/interfaces';
import { Router } from '@angular/router';
import { DataService } from '../../shared/services/data.service';
import { Component, OnInit, OnDestroy} from '@angular/core';
import { MapService } from 'src/app/shared/services/map.service';
import { TsMarkers } from 'src/app/shared/classes/ts-markers';

@Component({
  selector: 'app-map-select-location',
  templateUrl: './map-select-location.component.html',
  styleUrls: ['./map-select-location.component.css']
})

export class MapSelectLocationComponent implements OnInit, OnDestroy {

  private newLocationListener: Subscription;
  public home: TsCoordinate;
  private markers = new TsMarkers();

  constructor(
    private map: MapService,
    private data: DataService,
    private router: Router,
    private auth: AuthService
    ) { }

  async ngOnInit() {

    this.home = this.auth.user.homeLngLat;
    await this.map.newMap(this.home, 12);

    this.newLocationListener = this.data.clickedCoordsEmitter.subscribe( (newHome: TsCoordinate) => {
      this.home = newHome;
      this.map.updateHomeMarker(newHome);
    });

    this.map.getLocationOnClick();

  }

  onOK () {
    this.data.set({newHomeLocation: this.home});
    this.router.navigate(['profile']);
  }

  onCancel () {
    this.router.navigate(['profile']);
  }

  ngOnDestroy() {
    if (this.newLocationListener) { this.newLocationListener.unsubscribe(); }
  }

}
