import { Subscription } from 'rxjs';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { TsCallingPageType } from 'src/app/shared/interfaces';
import { DataService } from 'src/app/shared/services/data.service';

@Component({
  selector: 'app-menu-bar',
  templateUrl: './menu-bar.component.html',
  styleUrls: ['./menu-bar.component.css']
})
export class MenuBarComponent implements OnInit, OnDestroy {


  @Input() callingPage: TsCallingPageType;
  @Input() map;

  private newPathListener: Subscription;
  public isData = false;

  constructor(
    private data: DataService
   ) { }

  ngOnInit() {

    // listen for when data is set to be able to enable the view buttons
    this.newPathListener = this.data.pathIdEmitter.subscribe( () => {
      this.isData = this.data.getPath(false);
    });
  }

  onChangeOptions(option: {}) {
    const optionKey = Object.keys(option)[0];
    this.map.options = option[optionKey];
  }

  ngOnDestroy() {
    if (this.newPathListener) { this.newPathListener.unsubscribe(); }
  }


}

