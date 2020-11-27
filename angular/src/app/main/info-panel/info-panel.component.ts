import { DataService } from './../../shared/services/data.service';
import { Component, OnInit, Input } from '@angular/core';
import { InfoPanelService } from 'src/app/shared/services/info-panel.service';
import { TsTabsArray, TsTab } from 'src/app/shared/interfaces';

@Component({
  selector: 'app-info-panel',
  templateUrl: './info-panel.component.html',
  styleUrls: ['./info-panel.component.css']
})

export class InfoPanelComponent implements OnInit {

  // bind to property in parent to determine which page called the info panel
  @Input() callingPage: string;

  public tabsArray: TsTabsArray;
  public icon = '-';
  public isMinimised = false;

  constructor(
    private infoPanel: InfoPanelService,
    private data: DataService
  ) { }

  ngOnInit() {
    this.tabsArray = this.infoPanel.getTabs(this.callingPage);
  }

  onMinimiseClick() {
    this.isMinimised = !this.isMinimised;
    this.data.minimisePanelEmitter.emit(this.isMinimised);
  }

  getTabsClass(tab: TsTab) {
    return tab.active ? 'active show' : '';
  }

}
