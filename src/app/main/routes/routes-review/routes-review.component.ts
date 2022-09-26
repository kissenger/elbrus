import { TsPlotPathOptions } from 'src/app/shared/interfaces';
import { Component, OnInit } from '@angular/core';
import { MapService } from 'src/app/shared/services/map.service';
import { DataService } from 'src/app/shared/services/data.service';
import { Router } from '@angular/router';
import * as globals from 'src/app/shared/globals';
import { ScreenSizeService } from 'src/app/shared/services/screen-size.service';

@Component({
  selector: 'app-routes-review',
  templateUrl: './routes-review.component.html',
  styleUrls: ['./routes-review.component.css']
})
export class RoutesReviewComponent implements OnInit {

  public windowWidth: number;
  public BREAKPOINT = globals.BREAKPOINTS.MD;

  constructor(
    public map: MapService,
    private data: DataService,
    private router: Router,
    private screenSize: ScreenSizeService
  ) {
    this.windowWidth = this.screenSize.width;
    this.screenSize.resize.subscribe( (newWidth: {width: number, height: number}) => {
      this.windowWidth = newWidth.width;
    });
  }

  ngOnInit() {

    const geoJSON = this.data.getPath();

    if (typeof geoJSON === 'undefined') {
      this.router.navigate(['routes/list']);
    } else {

      const cog = {
        lng: ( geoJSON.bbox[0] + geoJSON.bbox[2] ) / 2,
        lat: ( geoJSON.bbox[1] + geoJSON.bbox[3] ) / 2 };

      this.map.newMap(cog)
        .then( () => {
          const plotOptions: TsPlotPathOptions = {resizeView: true};
          this.map.add(geoJSON, {}, plotOptions);
        })
        .catch( e => {
          throw new Error(e);
        });

    }
  }
}
