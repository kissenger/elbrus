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
  private pathId: string;
  private activePathsArray: Array<string> = [];     // array of pathsIds that are displayed on the map
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

    console.log(this.homeLocation);

    // subscribe to change in map view
    this.mapUpdateSubscription = this.dataService.mapBoundsEmitter.subscribe( (bb: Array<number>) => {
      console.log('map view has changed');

      this.boundingBox = <TsBoundingBox>bb;
      this.listOffset = 0;
      this.listData = [];

      this.getPathsSubscription = this.httpService
        .getPathsList('route', this.publicOrPrivatePaths === 'public', this.listOffset, this.limit, this.boundingBox)
        .subscribe( fromBackEnd => {
          console.log('new list from backend');
          console.log(fromBackEnd);


          // make sure we keep any selected items in the list, even if they are outside the current view
          // get the full list items for each selected route, and add to the items returnd from the backend
          const selectedListItems = this.listData.filter(listItem => this.activePathsArray.includes(listItem.pathId));
          const fullList = [...selectedListItems, ...fromBackEnd];

          // filter out duplicates
          const fullListPathIds = fullList.map( item => item.pathId );
          const filteredList = fullList.filter( (item, i) => fullListPathIds.indexOf(item.pathId) === i );
          this.listData = filteredList;

          this.numberOfRoutes = fromBackEnd.length === 0 ? 0 : this.listData[0].count;
          this.numberOfLoadedRoutes = this.listData.length;
          this.isEndOfList = this.numberOfLoadedRoutes === this.numberOfRoutes;

          // emit the first id in the list and highlight that row
          // if (booAutoSelectPathId) {
            // this.onRouteSelect(this.listData.length === 0 ? '0' : this.listData[0].pathId);
          // }

      });
    });

    // populate the list
    this.addPathsToList(AUTO_SELECT_ON);

    // in case units are changed while viewing the list
    this.dataServiceSubscription = this.dataService.unitsUpdateEmitter.subscribe( () => {
      this.units = this.auth.getUser().units;
    });

  }


  // update the list after 'more' button is pressed
  addPathsToList(booAutoSelectPathId = false) {

    try {
      this.boundingBox = <TsBoundingBox>this.mapCreateService.getMapBounds();
    } catch {
      this.boundingBox = <TsBoundingBox>this.mapService.getMapBounds();
    }

    console.log('add paths to list, bbox=', this.boundingBox);

    this.getPathsSubscription = this.httpService
      .getPathsList('route', this.publicOrPrivatePaths === 'public', this.listOffset, this.limit, this.boundingBox)
      .subscribe( fromBackEnd => {
        console.log(fromBackEnd);
        console.log(this.boundingBox);

        this.listData = this.listData.concat(fromBackEnd);
        this.numberOfRoutes = fromBackEnd.length === 0 ? 0 : this.listData[0].count;
        this.numberOfLoadedRoutes = this.listData.length;
        this.isEndOfList = this.numberOfLoadedRoutes === this.numberOfRoutes;

        // emit the first id in the list and highlight that row
        if (booAutoSelectPathId) {
          this.onRouteSelect(this.listData.length === 0 ? '0' : this.listData[0].pathId);
        }


    }, (error) => {

      this.alert.showAsElement('Something went wrong :(', error, true, false)
        .subscribe( () => {});

    });

  }



  /**
   * Configures the component to update after the map view is changed
   */



  /**
  * Configures the component to remain static - no update after map view change
  */
  // dynamicUpdateOff() {

  //   this.isDynamicUpdateOn = false;
  //   if (this.mapUpdateSubscription) {
  //     this.mapUpdateSubscription.unsubscribe();
  //   }

  // }


  /**
  * Request additional items in list
  */
  onMoreClick() {
    this.listOffset++;
    this.addPathsToList(AUTO_SELECT_OFF);
  }


  /**
   * Watches the state of the select menu and initiates actions accordingly
   */
  onSelectMenuChange() {

    // this.listOffset = 0;
    // this.listData = [];
    // this.boundingBox = [this.homeLocation.lng, this.homeLocation.lat, this.homeLocation.lng, this.homeLocation.lat];

    // if ( this.publicOrPrivatePaths === 'public' ) {
    //   // this.dynamicUpdateOn();
    //   this.addPathsToList(AUTO_SELECT_OFF);
    // } else {
    //   this.dynamicUpdateOff();
    //   this.addPathsToList(AUTO_SELECT_ON);
    // }

  }

  onOverlaySelect(idFromClick: string) {

    this.dataService.pathIdEmitter.emit({
      id: idFromClick,                          // pathId of the clicked-on list item
      booResizeView: false,       // if view is dynamic we dont want to resize the view when path is plotted
      isOverlay: true
    });

    if (this.activePathsArray.includes(idFromClick)) {
      this.activePathsArray.splice(this.activePathsArray.indexOf(idFromClick), 1);
    } else {
      this.activePathsArray.push(idFromClick);
    }

  }


  /**
   * Handles displaying or toggling the path corresponding to the clicked-on list-item
   * isMultiSelect behaviour is set in onInit()
   * Display of path is handled by emitting the pathId to map service
   */
  onRouteSelect(idFromClick: string) {

    this.dataService.pathIdEmitter.emit({
      id: idFromClick,                          // pathId of the clicked-on list item
      booResizeView: true,       // if view is dynamic we dont want to resize the view when path is plotted
      isOverlay: false
    });

    // if ( this.isMultiSelectOn ) {

      // if (this.activePathsArray.includes(idFromClick)) {
      //   this.activePathsArray.splice(this.activePathsArray.indexOf(idFromClick), 1);
      // } else {
      //   this.activePathsArray.push(idFromClick);
      // }

    // } else {

      if (idFromClick !== this.pathId) {
        this.pathId = idFromClick;
        this.activePathsArray = [idFromClick];
      }

    // }
  }


  /**
   * Used in html template to determine the css class for the list item
   * @param id id of the list item being processed
   * @param i index of the list item being processed
   */
  getCssClass(id: string, i: number, leftOrRight: string) {
    let cssClass = '';
    if (this.callingPage === 'create') {
      if (this.activePathsArray.includes(id)) {
        cssClass += 'highlight-div ';
      }
    } else {
      if (id === this.pathId) {
        cssClass += 'highlight-div ';
      }
    }
    if (i === 0) {
      if ( leftOrRight === 'left' ) {
        cssClass += 'border-top mt-1 list-box-top-left';
      } else {
        cssClass += 'border-top mt-1 list-box-top-right';
      }
    }
    if (i === this.numberOfLoadedRoutes - 1) {
      // cssClass += 'rounded-bottom';
      // cssClass += '';
      if ( leftOrRight === 'left' ) {
        cssClass += 'list-box-bottom-left';
      } else {
        cssClass += 'list-box-bottom-right';
      }
    }
    return cssClass;
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

