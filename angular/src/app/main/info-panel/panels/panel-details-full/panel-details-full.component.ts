import { AutoNamePipe } from '../../../../shared/pipes/auto-name.pipe';
import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import * as globals from 'src/app/shared/globals';
import { DataService } from 'src/app/shared/services/data.service';
import { Router } from '@angular/router';
import { HttpService } from 'src/app/shared/services/http.service';
import { Subscription } from 'rxjs';
import { TsUnits, TsFeature, TsFeatureCollection, TsPosition, TsCallingPageType } from 'src/app/shared/interfaces';
import { AuthService} from 'src/app/shared/services/auth.service';
import { Color, Label } from 'ng2-charts';
import { ChartDataSets, ChartOptions } from 'chart.js';
import 'chartjs-plugin-zoom';
import { UnitsConvertPipe } from 'src/app/shared/pipes/units-convert.pipe';
import { UnitsLongNamePipe } from 'src/app/shared/pipes/units-longname.pipe';

@Component({
  selector: 'app-panel-details-full',
  templateUrl: './panel-details-full.component.html',
  styleUrls: ['./panel-details-full.component.css']
})
export class PanelDetailsFullComponent implements OnInit, OnDestroy {

  // local variables
  // @Input() callingPage = 'list';
  @Input() callingPage: TsCallingPageType;

  // listeners
  private pathListener: Subscription;
  private unitsListener: Subscription;


  // charting variables
  public chartData: ChartDataSets[] = [];
  public chartLabels: Label[] = [];
  public chartOptions: ChartOptions = {};
  public chartColors: Color[] = [];
  public chartLegend = false;

  // geoJson variables
  public geoJson: TsFeatureCollection;
  public pathName: string;          // name of path provided with the incoming data, OR a created default if that is null
  public givenName: string = null;     // name given to the path in the details form; overrides the default name
  public pathDescription = '';
  public isElevations: boolean;
  public units: TsUnits;
  public pathType: string;
  public pathDirection: string;
  // public isData = false;

  constructor(
    public data: DataService,
    private http: HttpService,
    private router: Router,
    public auth: AuthService,
    private unitConvertPipe: UnitsConvertPipe,
    private unitLongNamePipe: UnitsLongNamePipe,
    private autoNamePipe: AutoNamePipe

  ) {}

  ngOnInit() {

    this.units = this.auth.isRegistered ? this.auth.user.units : globals.defaultUnits;
    this.unitsListener = this.data.unitsUpdateEmitter.subscribe( () => {
      this.units = this.auth.user.units;
    });

    // both created and imported paths data are sent from map-service when the geoJSON is plotted: listen for the broadcast
    // broadcast is only the path Id - listen for it, but dont save it, just go and pick up whats in the store
    this.pathListener = this.data.pathIdEmitter.subscribe( () => {

      if ( this.data.isPath() ) {

        this.geoJson = this.data.getPath();

        if (this.geoJson?.properties?.info?.name) {
          this.givenName = this.geoJson.properties.info.name;
        } else {
          this.givenName =
          this.autoNamePipe.transform(null, this.geoJson.properties.info.category, this.geoJson.properties.info.pathType);
        }

        this.updateChart();
      }

    });

  }


  updateChart() {

    this.isElevations = this.geoJson.properties.info.isElevations && !this.geoJson.properties.info.isLong;
    this.chartData = [];

    this.geoJson.features.forEach( (feature: TsFeature) => {

      // Get data for each feature/segment of graph...
      const localData =  [];
      for (let i = 0; i < feature.properties.params.elev.length; i++) {
        localData.push({
          x: this.unitConvertPipe.transform(feature.properties.params.cumDistance[i], 'distance', this.units.distance),
          y: this.unitConvertPipe.transform(feature.properties.params.elev[i], 'elevation', this.units.elevation)
        });
      }

      // ... and push into new array of objects that will define the graph
      this.chartData.push({
        data: localData,
        borderColor: feature.properties.lineColour,
        ...this.localChartOptions
      });

    });

    this.chartOptions = this.globalChartOptions;
    this.chartLegend = false;

  }


  onChartClick(e) {
    const featureIndex = e.active[0]._datasetIndex;
    const pointIndex = e.active[0]._index;
    const lngLat = <TsPosition>this.geoJson.features[featureIndex].geometry.coordinates[pointIndex];
    this.data.chartPointEmitter.emit({action: 'centre', point: [lngLat]});
  }

  onChartHover(e) {
    const featureIndex = e.active[0]._datasetIndex;
    const pointIndex = e.active[0]._index;
    const lngLat = <TsPosition>this.geoJson.features[featureIndex].geometry.coordinates[pointIndex];
    this.data.chartPointEmitter.emit({action: 'show', point: [lngLat]});
  }

  onChartOut() {
    this.data.chartPointEmitter.emit({action: 'show', point: []});
  }

  get localChartOptions() {
    return {
      showLine: true,
      lineTension: 0,
      pointRadius: 8,
      pointBackgroundColor: 'rgba(0, 0, 0, 0)',
      pointBorderColor: 'rgba(0, 0, 0, 0)',
      pointHoverBackgroundColor: 'rgba(0,0,0,0.3)',
      pointHoverBorderColor: 'rgba(0,0,0,0.8)',
      fill: false,
      borderWidth: 1
    };
  }

  get globalChartOptions() {
    return {
      title: {
        display: false,
        text: 'Elevation Profile',
        fontStyle: 'normal'
      },
      scales: {
        xAxes: [{
          scaleLabel: {
            display: true,
            labelString: this.unitLongNamePipe.transform(this.units.distance),
            lineHeight: 0.8,
            padding: 0,
            fontSize: 12
          },
          ticks: {
            fontSize: 10
          }
        }],
        yAxes: [{
          scaleLabel: {
            display: true,
            labelString: this.unitLongNamePipe.transform(this.units.elevation),
            lineHeight: 1.0,
            padding: 0,
            fontSize: 12
          },
          ticks: {
            fontSize: 10
          }
        }]
      },
      tooltips: {
        displayColors: false,
        // mode: 'nearest',
        intersect: true,
        callbacks: {
          label: (tooltipItems) => {
            return [
              'distance: ' + tooltipItems.xLabel + this.units.distance,
              'elevation: ' + tooltipItems.yLabel + this.units.elevation,
              '(Click to fly to point)',
            ];
          }
        }
      },
      plugins: {
        zoom: {
          pan: {
            enabled: true,
            mode: 'x'
          },
          zoom: {
            enabled: true,
            mode: 'x'
          }
        }
      }
    };
  }



  // FORM BUTTONS

  onSave() {

    // activePath is stored from two locations - both are full geoJSON descriptions of the path:
    // - when a route is created on the map,  mapCreateService saves each time a new chunk of path is added
    // - when a route is imported, the backend sends the geoJSON, which is in turned saved by panel-routes-list-options
    const newPath = this.data.getPath();
    const pathName = this.givenName ? this.givenName :
      this.autoNamePipe.transform(null, this.geoJson.properties.info.category, this.geoJson.properties.info.pathType);

    // path created on map, backend needs the whole shebang but as new path object will be created, we should only send it what it needs
    if ( this.callingPage === 'create' || this.callingPage === 'edit' ) {

      const sendObj = {
        pathId: newPath.properties.pathId,
        coords: newPath.features.reduce( (coords, feature ) => coords.concat(feature.geometry.coordinates), []),
        elevs: newPath.features.reduce( (elevs, feature) => elevs.concat(feature.properties.params.elev), []),
        name: pathName,
        description: this.pathDescription
      };

      this.http.saveRoute( sendObj ).subscribe(
        (response) => { this.router.navigate(['/routes/list/' + response.pathId]); },
        (error) => {
          // console.log(error);
          // this.alert.showAsElement(`${error.name}: ${error.name} `, error.message, true, false).subscribe( () => {});
        }
      );

    // path created during import
    } else {
      const sendObj = {
        pathId: newPath.properties.pathId,
        pathType: newPath.properties.info.pathType,
        name: pathName,
        description: this.pathDescription
      };
      this.http.saveImportedPath(sendObj).subscribe(
        (response) => { this.router.navigate(['/routes/list/' + response.pathId]); },
        (error) => { }
      );
    }

  }



  onCancel() {

    if (this.callingPage === 'review') {
      this.http.deletePath(this.data.getPath().properties.pathId).subscribe(
        (response) => { console.log(response); },
        (error) => {}
      );
    }
    this.data.clearPath();
    this.router.navigate(['/routes/list/']);
  }


  ngOnDestroy() {
    if (this.pathListener) { this.pathListener.unsubscribe(); }
    if (this.unitsListener) { this.unitsListener.unsubscribe(); }
  }

}
