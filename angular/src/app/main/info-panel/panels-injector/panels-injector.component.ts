import { Component, OnInit, ViewChild, ViewContainerRef, ComponentFactoryResolver, Input, ComponentRef, ViewChildren } from '@angular/core';
import { InfoPanelService } from 'src/app/shared/services/info-panel.service';

@Component({
  selector: 'app-panels-injector',
  templateUrl: './panels-injector.component.html',
  styleUrls: ['./panels-injector.component.css']
})
export class PanelsInjectorComponent implements OnInit {
  @ViewChild('AppInfoPanel', {static: true, read: ViewContainerRef}) infoPanel: any;
  @Input() tabName: string;
  @Input() callingPage: string;

  constructor(
    private factoryResolver: ComponentFactoryResolver,
    private infoPanelService: InfoPanelService
  ) { }

  ngOnInit() {
    const component = this.infoPanelService.getComponent(this.callingPage, this.tabName);
    const factory = this.factoryResolver.resolveComponentFactory(component);
    const newComponent = this.infoPanel.createComponent(factory);
    newComponent.instance.callingPage = this.callingPage;
  }

}
