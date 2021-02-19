
/**
 * Gets list data from the backend, and listens for user click on the displayed list
 * Emits the desired changes to the displayed map (listener is routes-list component)
 */

import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { HttpService } from 'src/app/shared/services/http.service';
import * as globals from 'src/app/shared/globals';
import { DataService } from 'src/app/shared/services/data.service';
import { Subscription } from 'rxjs';
import { TsUnits, TsBoundingBox, TsCoordinate, TsListItem, TsMapRequest } from 'src/app/shared/interfaces';
import { AuthService} from 'src/app/shared/services/auth.service';
import { ListItems } from 'src/app/shared/classes/list-items';

const LIST_ITEM_HEIGHT = 37;
const LIST_HEIGHT_CORRECTION = 350;  // higher number results in fewer routes loaded

@Component({
  selector: 'app-panel-list',
  templateUrl: './panel-list.component.html',
  styleUrls: ['./panel-list.component.css']
})

export class PanelListComponent implements OnInit, OnDestroy {

  @Input() tabName: 'routes' | 'overlay';
  @Input() callingPage: 'list' | 'create';

  private listListener: Subscription;
  private mapUpdateListener: Subscription;
  private newUnitsListener: Subscription;
  private newPathListener: Subscription;
  public isLoading = false;
  public listItems: ListItems = new ListItems();

  // define the colours to highlight overlays
  // Opacity codes: 1E=30%, 32=50%, 4B=75%, 55=85%, 5A=90%
  private highlightColours = {
    colours: [...globals.lineColours],
    opacity: '5A',
    reset() {
      this.colours = [...globals.lineColours];
    }
  };


  // keep track of the number of routes available compared to the number loades
  public nAvailableRoutes: number;
  public nLoadedRoutes: number;
  private limit: number;
  private offset = 0;
  public listType: 'public' | 'private' = null;
  private boundingBox: TsBoundingBox = null;    // current view
  private startPathId: string;

  // keep track of user and preferences
  public isRegisteredUser = this.auth.isRegistered;
  public units: TsUnits;
  public home: TsCoordinate;

  constructor(
    private http: HttpService,
    private data: DataService,
    private auth: AuthService,
    // private alert: AlertService
  ) {}

  ngOnInit() {

    this.limit = Math.max(1, Math.floor(((window.innerHeight - LIST_HEIGHT_CORRECTION) / LIST_ITEM_HEIGHT)));
    this.units = this.isRegisteredUser ? this.auth.user.units : globals.defaultUnits;
    this.newUnitsListener = this.data.unitsUpdateEmitter.subscribe( () => {
      this.units = this.isRegisteredUser ? this.auth.user.units : globals.defaultUnits;
    });

    // Map view has changed, need to update list
    // Applies to both list and overlay mode
    this.mapUpdateListener = this.data.mapBoundsEmitter.subscribe( (bounds: TsBoundingBox) => {

      if (this.data.get('startPath')) {
        // check for start path, if yes then we need list to tell us which path is displayed
        this.data.clearKey('startPath');
        this.startPathId = this.data.getPath().properties.pathId;
        this.listType = this.data.getPath().properties.info.isPublic ? 'public' : 'private';
      } else {
        // if there is no startPath, need some logic to set the dropdown  (if already set, dont change it)
        if (!this.listType) {
          this.listType = this.isRegisteredUser ? 'private' : 'public';
        }

      }

      this.boundingBox = bounds;
      this.offset = 0;
      this.listItems.removeInactive();
      this.addPathsToList();

    });

    // In overlay mode only, when the active path has changed we need to reset the overlaid paths
    // Work is only done in the overlay tab, when a route is clicked in the routes tab (inititating the path emit)
    if ( this.callingPage === 'list' && this.tabName === 'overlay' ) {
      this.newPathListener = this.data.pathIdEmitter.subscribe( () => {
        this.listItems.unselectAll();
        this.highlightColours.reset();
      });
    }


  }


  addPathsToList() {

    // dont do anything if in overlay mode and there is no active path selected
    // if ( this.callingPage === 'list' && this.tabName === 'overlay' && !this.data.getPath()) {
      // do nothing

    // } else {

      this.isLoading = true;
      this.listListener =
        this.http.getPathsList('route', this.listType === 'public', this.offset, this.limit, 'alphabetical', this.boundingBox)
        .subscribe( ( result: {list: Array<TsListItem>, count: number} ) => {

          this.listItems.merge(result.list);
          this.nLoadedRoutes = this.listItems.length;
          this.nAvailableRoutes = Math.max(this.listItems.length, result.count);
          this.isLoading = false;

          if (this.startPathId) {
            this.listItems.select(this.startPathId, null);
            this.startPathId = null;
          }

      }, (error) => {
        this.isLoading = false;
        // console.log(error);
        // this.alert.showAsElement(`${error.name}: ${error.statusText} `, error.message, true, false).subscribe( () => {});
      });
    // }
  }


  onMoreClick() {
    this.offset++;
    this.addPathsToList();
  }


  onSelectMenuChange() {
    this.offset = 0;
    this.listItems.clear();
    this.data.pathCommandEmitter.emit({ command: 'clear' });
    this.highlightColours.reset();
    this.addPathsToList();
  }


  async listAction(idFromClick: string) {

    const command: TsMapRequest = { command: null, pathId: idFromClick, plotType: null, colour: null };

    if ( this.tabName === 'routes' ) {
      // reclicking an active item removes it and all overlays
      if (this.listItems.isSelected(idFromClick)) {
        command.command = 'clear';
        this.listItems.unselectAll();
        this.highlightColours.reset();
      } else {
        command.command = 'replace';
        command.plotType = 'active';
        this.listItems.unselectAll();
        this.highlightColours.reset();
        this.listItems.select(idFromClick, null);
      }

    } else {  // tabName==='overlay'

      if ( this.listItems.isSelected(idFromClick) ) {
        // reclicking an active item in overlay mode clears only that path
        command.command = 'rem';
        command.plotType = 'overlay';
        const colour = this.listItems.unselect(idFromClick);
        this.highlightColours.colours.unshift( colour );

      } else {
        // clicking a new item in overlay mode just adds new overlay to map
        command.command = 'add';
        command.plotType = 'overlay';
        command.colour = this.highlightColours.colours.shift();
        this.listItems.select(idFromClick, command.colour);
      }
    }

    // emit command to map
    this.data.pathCommandEmitter.emit(command);

  }


  /** Set syles for list items based on position in list, and whether route is selected. */
  getCssStyle(id: string, i: number, name?: string) {

    const styles = {};

    if ( name === 'highlight' ) {

      if ( this.listItems.isSelected(id) ) {

        if ( this.tabName === 'overlay' ) {
          styles['border-left'] = `7px ${this.listItems.getItemById(id).colour + this.highlightColours.opacity} solid`;
          styles['background-color'] = `var(--ts-grey-background)`;

        } else {
          styles['border-left'] = `7px var(--ts-green) solid`;
          styles['background-color'] = `var(--ts-grey-background)`;

        }
      } else {
        styles['border-left'] = '7px transparent solid';
      }

    } else {
      styles['border-left'] = '1px #DEE2E6 solid';
      styles['border-right'] = '1px #DEE2E6 solid';
      styles['border-bottom'] = '1px #DEE2E6 solid';
      if ( i === 0 ) {
        styles['border-top'] = '1px #DEE2E6 solid';
      }

      // if overlay, disable the listitem that is stored in data (selected in routes)
      if ( this.tabName === 'overlay' ) {
        if (this.data.isPath()) {
          const activePath = this.data.getPath();
          if ( activePath.properties.pathId === id) {
            styles['color'] = 'lightgrey';
            styles['cursor'] = 'auto';
            styles['pointer-events'] = 'none';
          }
        }

      }

    }

    return styles;

  }


  ngOnDestroy() {
    if (this.listListener) { this.listListener.unsubscribe(); }
    if (this.mapUpdateListener) { this.mapUpdateListener.unsubscribe(); }
    if (this.newUnitsListener) { this.newUnitsListener.unsubscribe(); }
    if (this.newPathListener) { this.newPathListener.unsubscribe(); }
  }


}

