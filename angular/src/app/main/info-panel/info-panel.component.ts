import { Component, OnInit, Input } from '@angular/core';
import { InfoPanelService } from 'src/app/shared/services/info-panel.service';
import { DataService } from 'src/app/shared/services/data.service';
import { TsTabsArray } from 'src/app/shared/interfaces';

@Component({
  selector: 'app-info-panel',
  templateUrl: './info-panel.component.html',
  styleUrls: ['./info-panel.component.css']
})

export class InfoPanelComponent implements OnInit {

  // bind to property in parent to determine which page called the info panel
  @Input() callingPage: string;
  public tabsArray: TsTabsArray;

  constructor(
    private infoPanelService: InfoPanelService,
    private dataService: DataService
   ) { }

  ngOnInit() {
    this.tabsArray = this.infoPanelService.getTabs(this.callingPage);
  }

  onClick(e) {
    // this.dataService.activeTabEmitter.emit(e.target.id);/
  }

}
