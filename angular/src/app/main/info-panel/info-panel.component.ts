
import { DataService } from './../../shared/services/data.service';
import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { InfoPanelService } from 'src/app/shared/services/info-panel.service';
import { TsTabsArray, TsTab } from 'src/app/shared/interfaces';
import { Subscription } from 'rxjs';
import * as globals from 'src/app/shared/globals';

@Component({
  selector: 'app-info-panel',
  templateUrl: './info-panel.component.html',
  styleUrls: ['./info-panel.component.css']
})

export class InfoPanelComponent implements OnInit, OnDestroy {

  // bind to property in parent to determine which page called the info panel
  @Input() callingPage: string;

  public tabsArray: TsTabsArray;
  public icon = '-';
  public isMinimised = false;
  private newPathListener: Subscription;

  constructor(
    private infoPanel: InfoPanelService,
    private data: DataService
  ) { }

  ngOnInit() {

    this.tabsArray = this.infoPanel.getTabs(this.callingPage);

    this.newPathListener = this.data.pathIdEmitter.subscribe( () => {

      // enable disabled tabs when we have data
      if ( this.data.get('activePath', false) ) {
        this.tabsArray.forEach( tab => {
          if ( tab.name === 'details' || tab.name === 'overlay') {
            tab.disabled = false;
          }
        });
      }

      // if on narrow screen, minimise panel
      if (window.screen.width < globals.narrowScreenThreshold) {
        this.isMinimised = true;
        this.data.minimisePanelEmitter.emit(true);
      }

    });

  }

  onMinimiseClick() {
    this.isMinimised = !this.isMinimised;
    this.data.minimisePanelEmitter.emit(this.isMinimised);
  }

  getTabsClass(tab: TsTab) {
    let tabClass = '';
    if ( tab.active) { tabClass += 'active show'; }
    if ( tab.disabled ) { tabClass += 'disabled'; }
    return tabClass;
  }

  ngOnDestroy() {
    if (this.newPathListener) { this.newPathListener.unsubscribe(); }

  }

}
