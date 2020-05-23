import { Component, OnInit } from '@angular/core';
import { MapService } from 'src/app/shared/services/map.service';
import { DataService } from 'src/app/shared/services/data.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-routes-review',
  templateUrl: './routes-review.component.html',
  styleUrls: ['./routes-review.component.css']
})
export class RoutesReviewComponent implements OnInit {

  constructor(
    private mapService: MapService,
    private dataService: DataService,
    private router: Router,
  ) { }

  ngOnInit() {

    const geoJSON = this.dataService.getFromStore('activePath', true).pathAsGeoJSON;

    if (typeof geoJSON === 'undefined') {
      this.router.navigate(['routes/list']);
    } else {

      const cog = {
        lng: ( geoJSON.bbox[0] + geoJSON.bbox[2] ) / 2,
        lat: ( geoJSON.bbox[1] + geoJSON.bbox[3] ) / 2 };

      this.mapService.initialiseMap(cog, 10)
        .then( () => {
          const plotOptions = {booReplaceExisting: false, booResizeView: true, booSaveToStore: true};
          this.mapService.addLayerToMap(geoJSON, {}, plotOptions);
        })
        .catch( e => {
          throw new Error(e);
        });

    }
  }
}
