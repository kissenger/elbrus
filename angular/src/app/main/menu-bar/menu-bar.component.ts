import { Component, Input, OnInit } from '@angular/core';
import { TsCallingPageType } from 'src/app/shared/interfaces';
import { DataService } from 'src/app/shared/services/data.service';

@Component({
  selector: 'app-menu-bar',
  templateUrl: './menu-bar.component.html',
  styleUrls: ['./menu-bar.component.css']
})
export class MenuBarComponent implements OnInit {


  @Input() callingPage: TsCallingPageType;
  @Input() map;


  constructor(  ) { }

  ngOnInit() {
    console.log(this.callingPage);
  }

  onChangeOptions(option: {}) {
    const optionKey = Object.keys(option)[0];
    this.map.options = option[optionKey];
  }

}

