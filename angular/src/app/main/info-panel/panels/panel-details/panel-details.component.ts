import { Component, OnInit, OnDestroy, Input, ViewChild, TemplateRef } from '@angular/core';
import * as globals from 'src/app/shared/globals';
import { DataService } from 'src/app/shared/services/data.service';
import { Router } from '@angular/router';
import { HttpService } from 'src/app/shared/services/http.service';
import { Subscription } from 'rxjs';
import { ChartsService } from 'src/app/shared/services/charts-service';
import { TsUnits, TsPathStats, TsUser } from 'src/app/shared/interfaces';
import { AuthService} from 'src/app/shared/services/auth.service';
import { AlertService } from 'src/app/shared/services/alert.service';

@Component({
  selector: 'app-panel-details',
  templateUrl: './panel-details.component.html',
  styleUrls: ['./panel-details.component.css']
})
export class PanelDetailsComponent implements OnInit, OnDestroy {

  // local variables
  @Input() callingPage: string;
  private activePathSubscription: Subscription;
  private chartData: Array<Array<number>>;
  private colourArray: Array<string>;

  public pathName: string;          // name of path provided with the incoming data, OR a created default if that is null
  public givenPathName: string;     // name given to the path in the details form; overrides the default name

  public pathDescription = '';
  // public isListPage: boolean;
  public isLong: boolean;
  public isPublic: boolean;
  public createdBy: string;
  public isElevations: boolean;
  public isHills: boolean;
  public isData = false;
  // public units: TsUnits = this.auth.getUser().units;
  // private user: TsUser = this.auth.getUser();
  public units: TsUnits;
  // public wikiLink: string = globals.links.wiki.elevations;
  public pathCategory: string;
  public pathType: string;
  public pathStats: TsPathStats = globals.emptyStats;
  public pathDirection: string;


  constructor(
    private dataService: DataService,
    private httpService: HttpService,
    private router: Router,
    private chartsService: ChartsService,
    private auth: AuthService,
    private alert: AlertService
  ) {}

  ngOnInit() {

    // show form inputs and buttons only for review or create pages, not for list
    // this.isListPage = this.callingPage === 'list';
    // console.log(this.callingPage)
    // this.units = this.auth.getUser() ? this.auth.getUser().units : globals.defaultUnits;
    this.units = this.auth.isAuthorised() ? this.auth.getUser().units : globals.defaultUnits;


    // both created and imported paths data are sent from map-service when the geoJSON is plotted: listen for the broadcast
    this.activePathSubscription = this.dataService.activePathEmitter.subscribe( (geoJson) => {

      // used by html to say 'nothing to show' if the geojson only has a single point or fewer
      if (geoJson.features[0].geometry.coordinates.length <= 1) {
        this.isData = false;
      } else {
        this.isData = true;
      }

      this.pathStats = geoJson.properties.stats;
      this.pathDescription = geoJson.properties.info.description;
      this.pathCategory = geoJson.properties.info.category;
      this.pathDirection = geoJson.properties.info.direction;
      this.pathType = geoJson.properties.info.pathType;

      // if this is a create-route action, then path will not have a name until one is entered in the form; create a default one
      if (!geoJson.properties.info.name) {
        this.pathName = (this.pathCategory === 'None' ? 'Uncategorised' : this.pathCategory) + ' ' + this.pathType;

      } else {
        this.pathName = geoJson.properties.info.name;
      }

      this.isLong = geoJson.properties.info.isLong;
      this.isElevations = geoJson.properties.info.isElevations && !this.isLong;
      if (this.pathStats.hills) {
        this.isHills = this.pathStats.hills.length > 0;
      } else {
        this.isHills = false;
      }
      this.isPublic = geoJson.properties.info.isPublic;
      this.createdBy = geoJson.properties.info.createdBy;

      /**
       * TODO: This should be in a subroutine
       * Calculate data to plot on chart - complex due to plotting hills in different colours
       * Need one array for cumulative distance, and one array each for each subsequent segment on the chart, eg
       *    [[x1, x2, x3, x4, x5, ....],
       *     [e1, e2,   ,   ,   , ....],
       *     [  ,   , e3, e4, e5, ....]]
       * where x is cumDist, e is elevation point, and spaces are null points
       */
      this.chartData = [geoJson.properties.params.cumDistance];
      this.colourArray = [];
      let x = 0;
      geoJson.features.forEach( feature => {
        const y = geoJson.properties.params.cumDistance.length - feature.properties.params.elev.length - x;
        this.chartData.push( Array(x).fill(null).concat(feature.properties.params.elev).concat(Array(y).fill(null)) );
        x += feature.properties.params.elev.length - 1;
        this.colourArray.push(feature.properties.lineColour);
      });

      this.chartsService.plotChart(document.getElementById('chart_div'), this.chartData, this.colourArray);

    });

    this.dataService.unitsUpdateEmitter.subscribe( () => {
      this.units = this.auth.getUser().units;
    });

  }

  onSave() {


    // activePath is stored from two locations - both are full geoJSON descriptions of the path:
    // - when a route is created on the map,  mapCreateService saves each time a new chunk of path is added
    // - when a route is imported, the backend sends the geoJSON, which is in turned saved by panel-routes-list-options
    const newPath = this.dataService.getFromStore('activePath', false);
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
    this.activePathSubscription.unsubscribe();

    // this.httpService.flushDatabase().subscribe( () => {
    //   console.log('db flushed');
    // });
  }

}
