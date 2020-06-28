import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { HttpService } from 'src/app/shared/services/http.service';
import { DataService } from 'src/app/shared/services/data.service';
import { Subscription } from 'rxjs';
import { TsUnits, TsListArray, TsBoundingBox, TsCoordinate } from 'src/app/shared/interfaces';
import { MapCreateService } from 'src/app/shared/services/map-create.service';
import { AuthService} from 'src/app/shared/services/auth.service';
import { MapService } from 'src/app/shared/services/map.service';
import { AlertService } from 'src/app/shared/services/alert.service';

const AUTO_SELECT_OFF = false;
const AUTO_SELECT_ON = true;

@Component({
  selector: 'app-panel-list',
  templateUrl: './panel-list.component.html',
  styleUrls: ['./panel-list.component.css']
})
export class PanelListComponent implements OnInit, OnDestroy {

  @Input() callingPage: string;

  private getPathsSubscription: Subscription;
  private mapUpdateSubscription: Subscription;
  private dataServiceSubscription: Subscription;

  private listOffset = 0;
  private limit = 9;  // number of paths to display in one go - more can be pulled if needed
  public numberOfRoutes: number;
  public numberOfLoadedRoutes: number;
  public isEndOfList = false;
  public homeLocation: TsCoordinate = this.auth.getUser().homeLngLat;
  private boundingBox: TsBoundingBox = null;
  public activePaths = {};     // array of pathsIds that are displayed on the map
  private colourPallet = ['#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FF00'];
  private highlightColours = [null, ...this.colourPallet];
  private highlightOpacity = '5A';  // 1E=30%, 32=50%, 4B=75%, 55=85%, 5A=90%
  public nPaths;

  public listData: TsListArray = [];                // the items in this array are displayed in the panel
  public publicOrPrivatePaths = 'private';
  public units: TsUnits = this.auth.getUser().units;

  constructor(
    private httpService: HttpService,
    private dataService: DataService,
    private mapCreateService: MapCreateService,
    private mapService: MapService,
    private auth: AuthService,
    private alert: AlertService,
  ) {}

  ngOnInit() {



    this.listData = [];
    this.addPathsToList();

    // subscribe to change in map view
    this.mapUpdateSubscription = this.dataService.mapBoundsEmitter.subscribe( () => {

      // this.boundingBox = <TsBoundingBox>bb;
      this.addPathsToList();

    });

    // in case units are changed while viewing the list
    this.dataServiceSubscription = this.dataService.unitsUpdateEmitter.subscribe( () => {
      this.units = this.auth.getUser().units;
    });

  }


  // update the list after 'more' button is pressed
  addPathsToList() {

    this.listOffset = 0;

    try {
      this.boundingBox = <TsBoundingBox>this.mapCreateService.getMapBounds();
    } catch {
      this.boundingBox = <TsBoundingBox>this.mapService.getMapBounds();
    }

    this.getPathsSubscription = this.httpService
      .getPathsList('route', this.publicOrPrivatePaths === 'public', this.listOffset, this.limit, this.boundingBox)
      .subscribe( fromBackEnd => {

        // make sure we keep any selected items in the list, even if they are outside the current view
        // get the full list items for each selected route, and add to the items returnd from the backend
        console.log('listData=', this.listData);
        console.log('activePaths=', this.activePaths);
        const selectedListItems = this.listData.filter(listItem => listItem.pathId in this.activePaths);
        const fullList = [...selectedListItems, ...fromBackEnd];

        // filter out duplicates
        const fullListPathIds = fullList.map( item => item.pathId );
        const filteredList = fullList.filter( (item, i) => fullListPathIds.indexOf(item.pathId) === i );
        this.listData = filteredList;

        this.numberOfRoutes = fromBackEnd.length === 0 ? 0 : fromBackEnd[0].count;
        this.numberOfLoadedRoutes = this.listData.length;
        this.isEndOfList = this.numberOfLoadedRoutes === this.numberOfRoutes;

    }, (error) => {

      this.alert.showAsElement('Something went wrong :(', error, true, false)
        .subscribe( () => {});

    });

  }


  /**
  * Request additional items in list
  */
  onMoreClick() {
    this.listOffset++;
    this.addPathsToList();
  }



  /**
   * Handles displaying or toggling the path corresponding to the clicked-on list-item
   * isMultiSelect behaviour is set in onInit()
   * Display of path is handled by emitting the pathId to map service
   */
  onRouteSelect(idFromClick: string) {

    let emitCommand: Object;

    if ( idFromClick in this.activePaths ) {

      if ( this.activePaths[idFromClick] === null ) {
        // reclicked on first route, clear it and all overlays
        this.highlightColours = [null, ...this.colourPallet];
        this.activePaths = {};
        emitCommand = { command: 'clear' };

      } else {
        // reclicked an overlay, just clear the overlay
        this.highlightColours.unshift(this.activePaths[idFromClick]);
        delete this.activePaths[idFromClick];
        emitCommand = { command: 'rem', id: idFromClick };
      }

    } else {

      // new route so add it
      this.activePaths[idFromClick] = this.highlightColours.shift();
      emitCommand = { command: 'add', id: idFromClick, colour: this.activePaths[idFromClick] };

    }

    this.dataService.pathIdEmitter.emit( emitCommand );


  }


  /**
   * Used in html template to determine the css class for the list item
   * @param id id of the list item being processed
   * @param i index of the list item being processed
   */
  getCssClass(id: string, i: number, leftOrRight: string) {


    if (i === 0) {
        return `border-top mt-1 list-box-top-${leftOrRight}`;
    } else if (i === this.numberOfLoadedRoutes - 1) {
        return `list-box-bottom-${leftOrRight}`;
    }
  }

  getCssStyle(id: string, i: number, leftOrRight: string) {
    if ( id in this.activePaths ) {
      if ( leftOrRight === 'left' ) {
        return {'background-color' : 'whitesmoke'};
      } else {
        return { 'background-color': this.activePaths[id] === null ? 'whitesmoke' : this.activePaths[id] + this.highlightOpacity };
      }

    } else {
      return '';
    }
  }




  /**
   * Actions to do when component is destroyed
   */
  ngOnDestroy() {
    if (this.getPathsSubscription) { this.getPathsSubscription.unsubscribe(); }
    if (this.mapUpdateSubscription) { this.mapUpdateSubscription.unsubscribe(); }
    if (this.dataServiceSubscription) { this.dataServiceSubscription.unsubscribe(); }
  }


}

