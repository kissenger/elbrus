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
  public activePaths: Array<{id: string}> = [];     // array of pathsIds that are displayed on the map
  // public col='red';
  private highlightColours = ['#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FF00'];
  private highlightOpacity = '1E';  // HEX for 30%
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

    if ( Object.keys(this.activePaths)[0] !== idFromClick ) {
      // dont do anything if the first active path has the same id as the clicked path

      this.dataService.pathIdEmitter.emit({
        id: idFromClick,                          // pathId of the clicked-on list item
        booResizeView: false,       // if view is dynamic we dont want to resize the view when path is plotted
        isOverlay: true
      });

      if (idFromClick in this.activePaths) {
        this.activePaths.splice(this.activePaths.indexOf(idFromClick), 1);
      } else {
        this.activePaths.push(idFromClick);
      }
    }



  }


  /**
   * Handles displaying or toggling the path corresponding to the clicked-on list-item
   * isMultiSelect behaviour is set in onInit()
   * Display of path is handled by emitting the pathId to map service
   */
  onRouteSelect(idFromClick: string) {


    // if ( this.activePaths[0] !== idFromClick ) {
      if ( this.activePaths.includes(idFromClick) ) {

        this.activePaths.splice(this.activePaths.indexOf(idFromClick), 1);


      } else {


      // if (idFromClick !== this.pathId) {
      //   this.pathId = idFromClick;
        // this.activePaths = [idFromClick];
        this.activePaths.push(idFromClick);

      // }
    }


    this.dataService.pathIdEmitter.emit({
      id: idFromClick,                          // pathId of the clicked-on list item
      // booResizeView: false,       // if view is dynamic we dont want to resize the view when path is plotted
      // isOverlay: false,
      colour: this.highlightColours[this.activePaths.indexOf(idFromClick) - 1]
    });


  }


  /**
   * Used in html template to determine the css class for the list item
   * @param id id of the list item being processed
   * @param i index of the list item being processed
   */
  getCssClass(id: string, i: number) {
    let cssClass = '';
    if (this.activePaths.includes(id)) {
      // cssClass += `highlight-div `;
    }
    if (i === 0) {
        cssClass += 'border-top mt-1 list-box-top-right';
    }
    if (i === this.numberOfLoadedRoutes - 1) {
        cssClass += 'list-box-bottom-right';
    }
    return cssClass;
  }

  getCssStyle(id: string, i: number) {
    if (this.activePaths.includes(id)) {
      // return '--colour: ' + this.colours[this.activePaths.indexOf(id)];
      const highlightColour = this.activePaths.indexOf(id) === 0 ? '#123456' : this.highlightColours[this.activePaths.indexOf(id) - 1];
      // console.log({'background-color': highlightColour.slice(highlightColour.length - 2) + ', ' + this.highlightOpacity + ')'})
      return {
        'background-color': highlightColour + this.highlightOpacity
        // opacity: 0.5
    };
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

