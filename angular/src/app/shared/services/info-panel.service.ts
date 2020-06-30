import { Injectable } from '@angular/core';
import { PanelDetailsComponent } from 'src/app/main/info-panel/panels/panel-details/panel-details.component';
import { PanelListComponent } from 'src/app/main/info-panel/panels/panel-list/panel-list.component';
import { PanelOptionsComponent } from 'src/app/main/info-panel/panels/panel-options/panel-options.component';
import { TsTabsArray } from 'src/app/shared/interfaces';

@Injectable({
  providedIn: 'root'
})
export class InfoPanelService {

  /**
   * Define the tabs for each page - object key is the page name
   */
  private tabsDefinition: {create?: TsTabsArray, edit?: TsTabsArray, review?: TsTabsArray, list?: TsTabsArray} =
  { create:
      [ { active: true,
          name: 'details',
          component: PanelDetailsComponent },
        { active: false,
          name: 'overlay',
          component: PanelListComponent } ],
    edit:
      [ { active: true,
          name: 'details',
          component: PanelDetailsComponent },
        { active: false,
          name: 'overlay',
          component: PanelListComponent } ],
    review:
      [ { active: true,
          name: 'details',
          component: PanelDetailsComponent } ],
    list:
      [ { active: true,
          name: 'routes',
          component: PanelListComponent },
        { active: false,
          name: 'details',
          component: PanelDetailsComponent },
        { active: false,
          name: 'options',
          component: PanelOptionsComponent } ]
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
