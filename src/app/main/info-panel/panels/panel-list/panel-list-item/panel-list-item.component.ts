import { Subscription } from 'rxjs';
import { Component, OnInit, OnDestroy, Input, OnChanges} from '@angular/core';
import * as globals from 'src/app/shared/globals';
import { TsListItem, TsUnits } from 'src/app/shared/interfaces';
import { AuthService } from 'src/app/shared/services/auth.service';
import { DataService } from 'src/app/shared/services/data.service';


@Component({
  selector: 'app-panel-list-item',
  templateUrl: './panel-list-item.component.html',
  styleUrls: ['./panel-list-item.component.css']
})

export class PanelListItemComponent implements OnInit, OnDestroy {

  @Input() item: TsListItem;
  @Input() listType: 'public' | 'private';
  public units: TsUnits;
  public isRegisteredUser = this.auth.isRegistered;
  private dataSubscription: Subscription;

  constructor(
    public auth: AuthService,
    private data: DataService,
    ) { }

  ngOnInit() {
    this.units = this.isRegisteredUser ? this.auth.user.units : globals.defaultUnits;

    // in case units are changed while viewing the list
    this.dataSubscription = this.data.unitsUpdateEmitter.subscribe( () => {
      this.units = this.isRegisteredUser ? this.auth.user.units : globals.defaultUnits;
    });
  }

  ngOnDestroy() {
    if (this.dataSubscription) { this.dataSubscription.unsubscribe(); }

  }


}

