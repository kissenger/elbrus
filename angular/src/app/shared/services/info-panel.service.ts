import { Injectable } from '@angular/core';
import { PanelRoutesCreateDetailsComponent } from 'src/app/main/info-panel/panels/panel-details/panel-details.component';
import { PanelRoutesListListComponent } from 'src/app/main/info-panel/panels/panel-list/panel-list.component';
import { PanelRoutesListOptionsComponent } from 'src/app/main/info-panel/panels/panel-routes-list-options/panel-routes-list-options.component';
import { TsTabsArray } from 'src/app/shared/interfaces';

@Injectable({
  providedIn: 'root'
})
export class InfoPanelService {

  /**
   * Define the tabs for each page - object key is the page name
   */
  private tabsDefinition: {create?: TsTabsArray, review?: TsTabsArray, list?: TsTabsArray} =
  { create:
      [ { active: true,
          name: 'details',
          component: PanelRoutesCreateDetailsComponent },
        { active: false,
          name: 'overlay',
          component: PanelRoutesListListComponent } ],
    review:
      [ { active: true,
          name: 'details',
          component: PanelRoutesCreateDetailsComponent } ],
    list:
      [ { active: true,
          name: 'list',
          component: PanelRoutesListListComponent },
        { active: false,
          name: 'details',
          component: PanelRoutesCreateDetailsComponent },
        { active: false,
          name: 'options',
          component: PanelRoutesListOptionsComponent } ]
  };

  constructor() { }

  /**
   * Returns the tabs array for the requested page, augmented with additional params as required to
   * define the info-panel html tabbing - called by info-panel component
   * @param pageName string, name of page as defined by data service
   */
  getTabs(pageName: string) {
    const tabsArray = this.tabsDefinition[pageName];
    tabsArray.forEach(tab => {
      tab['title'] = tab.name[0].toUpperCase() + tab.name.slice(1);
      tab['href'] = '#' + tab.name;
    });
    return tabsArray;
  }

  /**
   * Returns the panel component to load for a given page and tab - called only by panels-injector component
   * @param pageName string, name of page
   * @param panelName string, name of panel
   */
  getComponent(pageName: string, panelName: string) {
    const tabsArray = this.tabsDefinition[pageName];
    for (let i = 0; i < tabsArray.length; i++) {
      if (tabsArray[i].name === panelName) { return tabsArray[i].component; }
    }
  }

}
