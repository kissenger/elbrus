import { Component, OnInit } from '@angular/core';
import { DataService } from 'src/app/shared/services/data.service';

@Component({
  selector: 'app-menu-bar',
  templateUrl: './menu-bar.component.html',
  styleUrls: ['./menu-bar.component.css']
})
export class MenuBarComponent implements OnInit {

  constructor(
    private dataService: DataService
  ) { }

  ngOnInit() {

  }

  onClick(clickItem) {
    this.dataService.menuClickEmitter.emit( clickItem );
  }


}

