
import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import * as globals from 'src/app/shared/globals';
import { DataService } from 'src/app/shared/services/data.service';
import { Router } from '@angular/router';
import { HttpService } from 'src/app/shared/services/http.service';
import { Subscription } from 'rxjs';
import { TsUnits, TsPathStats, TsFeature, TsFeatureCollection, TsPosition } from 'src/app/shared/interfaces';
import { AuthService} from 'src/app/shared/services/auth.service';
import { AlertService } from 'src/app/shared/services/alert.service';
import { Color, Label } from 'ng2-charts';
import { ChartDataSets, ChartOptions } from 'chart.js';
import { UnitsConvertPipe } from 'src/app/shared/pipes/units-convert.pipe';

@Component({
  selector: 'app-panel-details',
  templateUrl: './panel-details.component.html',
  styleUrls: ['./panel-details.component.css']
})
export class PanelDetailsComponent implements OnInit, OnDestroy {

  // local variables
  @Input() callingPage = 'list';
  private pathListener: Subscription;

  /* panel is minimised for thinner screens; also happens in info-panel component so changes need to be reflected there also */
  public isMinimised = window.innerWidth < 900 ? true : false;
  private minimisePanelSubscription: Subscription;

  public chartData: ChartDataSets[] = [];
  chartLabels: Label[] = [];
  chartOptions: ChartOptions = {};
  chartColors: Color[] = [];
  chartLegend = false;


  private colourArray: Array<string>;
  public geoJson: TsFeatureCollection;

  public pathName: string;          // name of path provided with the incoming data, OR a created default if that is null
  public givenPathName: string;     // name given to the path in the details form; overrides the default nam
  public pathDescription = '';
  public isLong: boolean;
  public isPublic: boolean;
  public createdBy: string;
  public isElevations: boolean;
  public isHills: boolean;
  public isData = false;
  public units: TsUnits;
  public pathCategory: string;
  public pathType: string;
  public pathStats: TsPathStats = globals.emptyStats;
  public pathDirection: string;
  public nRoutes = 0;

  constructor(
    private data: DataService,
    private httpService: HttpService,
    private router: Router,
    private auth: AuthService,
    private alert: AlertService,
    private unitConvertPipe: UnitsConvertPipe

  ) {}

  ngOnInit() {

    this.units = this.auth.isRegisteredUser() ? this.auth.getUser().units : globals.defaultUnits;

    // subscribe to any changes in the minimised status of the panel
    this.minimisePanelSubscription = this.data.minimisePanelEmitter.subscribe( (minimise: boolean) => {
      this.isMinimised = minimise;
      if (this.isMinimised) {
        this.nRoutes = this.data.get('nRoutes', false);
      }
    });

    this.data.unitsUpdateEmitter.subscribe( () => {
      this.units = this.auth.getUser().units;
    });

    // both created and imported paths data are sent from map-service when the geoJSON is plotted: listen for the broadcast
    this.pathListener = this.data.pathIdEmitter.subscribe( () => {

      this.geoJson = this.data.get('activePath', false);

      // note this is a boolean to tell tempplate whether there is data to display or not
      this.isData = this.geoJson.features[0].geometry.coordinates.length > 1;

      this.isLong = this.geoJson.properties.info.isLong;
      this.isElevations = this.geoJson.properties.info.isElevations && !this.isLong;
      console.log(this.isElevations);
      if (this.pathStats.hills) {
        this.isHills = this.pathStats.hills.length > 0;
      } else {
        this.isHills = false;
      }

      this.chartData = [];

      this.geoJson.features.forEach( (feature: TsFeature) => {

        const localData =  [];
        for (let i = 0; i < feature.properties.params.elev.length; i++) {
          localData.push({
            x: this.unitConvertPipe.transform(feature.properties.params.cumDist[i], 'distance', this.units.distance),
            y: this.unitConvertPipe.transform(feature.properties.params.elev[i], 'elevation', this.units.elevation)
          });
        }
        this.chartData.push({
          data: localData,
          showLine: true,
          lineTension: 0,
          pointRadius: 0,
          fill: false,
          borderColor: feature.properties.lineColour,
          borderWidth: 1
        });

      });

      console.log(this.chartData);

      this.chartLabels = [];
      this.chartOptions = {
      };
      this.chartColors = [];
      this.chartLegend = false;


    });



  }

  onChartHover(e) {
    const featureIndex = e.active[0]._datasetIndex;
    const pointIndex = e.active[0]._index;
    const lngLat = <TsPosition>this.geoJson.features[featureIndex].geometry.coordinates[pointIndex];
    this.data.chartPointEmitter.emit([lngLat]);
  }

  onChartOut() {
    this.data.chartPointEmitter.emit();
  }

  // ngAfterViewInit() {


  //   const canvas = <HTMLCanvasElement> document.getElementById('chart_div');
  //   let elevationChart = new Chart(canvas.getContext('2d'), {
  //     type: 'line',
  //     data: [{x: 1, y: 2}];
  // });
  // }


  onSave() {


    // activePath is stored from two locations - both are full geoJSON descriptions of the path:
    // - when a route is created on the map,  mapCreateService saves each time a new chunk of path is added
    // - when a route is imported, the backend sends the geoJSON, which is in turned saved by panel-routes-list-options
    const newPath = this.data.get('activePath', false);
    const pathName = !!this.givenPathName ? this.givenPathName : this.pathName;


    // path created on map, backend needs the whole shebang but as new path object will be created, we should only send it what it needs
    // if (newPath.properties.pathId === '0000') {    // pathId for created route is set to 0000 in the backend
    console.log(this.callingPage);
    if ( this.callingPage === 'create' || this.callingPage === 'edit' ) {

      const sendObj = {
        pathId: newPath.properties.pathId,
        coords: newPath.features.reduce( (coords, feature ) => coords.concat(feature.geometry.coordinates), []),
        elevs: newPath.features.reduce( (elevs, feature) => elevs.concat(feature.properties.params.elev), []),
        name: pathName,
        description: this.pathDescription
      };

      this.httpService.saveRoute( sendObj ).subscribe( () => {

        this.router.navigate(['/route/list/']);

      }, (error) => {

        this.alert
          .showAsElement('Something went wrong :(', error, true, false)
          .subscribe( () => {} );

      });

    // } else if ( this.callingPage === 'edit' ) {

    //     this.httpService.updateEditedRoute( getSendObj() ).subscribe( () => {

    //       this.router.navigate(['/route/list/']);

    //     }, (error) => {

    //       this.alert
    //         .showAsElement('Something went wrong :(', error, true, false)
    //         .subscribe( () => {} );

    //     });

    // imported file, backend only needs to knw the pathType, pathId, name and description, so create theis object and call http
    } else {

      const sendObj = {
        pathId: newPath.properties.pathId,
        pathType: newPath.properties.info.pathType,
        name: pathName,
        description: this.pathDescription
      };
      this.httpService.saveImportedPath(sendObj).subscribe( () => {
        this.router.navigate(['/route/list/']);
      });
    }

    // const getSendObj = () => {

    //   return {
    //     pathId: newPath.properties.pathId,
    //     coords: newPath.features.reduce( (coords, feature ) => coords.concat(feature.geometry.coordinates), []),
    //     elevs: newPath.features.reduce( (elevs, feature) => elevs.concat(feature.properties.params.elev), []),
    //     name: pathName,
    //     description: this.pathDescription
    //   };

    // }

  }

  onCancel() {
    this.router.navigate(['/route/list/']);

  }
  // onClick() {
  //   this.isMinimised = !this.isMinimised;
  //   this.icon = this.isMinimised ? '+' : '-';
  // }


  ngOnDestroy() {
    this.pathListener.unsubscribe();
    this.minimisePanelSubscription.unsubscribe();

    // this.httpService.flushDatabase().subscribe( () => {
    //   console.log('db flushed');
    // });
  }

}
