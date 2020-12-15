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
    private map: MapService,
    private data: DataService,
    private router: Router,
  ) { }

  ngOnInit() {

    const geoJSON = this.data.getPath().pathAsGeoJSON;

    if (typeof geoJSON === 'undefined') {
      this.router.navigate(['routes/list']);
    } else {

      const cog = {
        lng: ( geoJSON.bbox[0] + geoJSON.bbox[2] ) / 2,
        lat: ( geoJSON.bbox[1] + geoJSON.bbox[3] ) / 2 };

      this.map.newMap(cog)
        .then( () => {
          const plotOptions = {booReplaceExisting: false, resizeView: true, booSaveToStore: true};
          this.map.add(geoJSON, {}, plotOptions);
        })
        .catch( e => {
          throw new Error(e);
        });

    }
  }
}
