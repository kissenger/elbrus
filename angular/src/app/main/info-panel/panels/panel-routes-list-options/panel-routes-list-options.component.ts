import { Component, OnInit, OnDestroy, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { HttpService } from 'src/app/shared/services/http.service';
import { DataService } from 'src/app/shared/services/data.service';
import { Subscription } from 'rxjs';
import { AlertService } from 'src/app/shared/services/alert.service';
import { SpinnerService } from 'src/app/shared/services/spinner.service';

@Component({
  selector: 'app-panel-routes-list-options',
  templateUrl: './panel-routes-list-options.component.html',
  styleUrls: ['./panel-routes-list-options.component.css']
})
export class PanelRoutesListOptionsComponent implements OnInit, OnDestroy {

  private subscription: Subscription;

  constructor(
    private router: Router,
    private httpService: HttpService,
    private dataService: DataService,
    private alert: AlertService,
    private spinner: SpinnerService
  ) {

   }

  ngOnInit() {
  }

  /** virtually clicks the hidden form element to launch the select file dialogue */
  onLoadFileClick() {
    document.getElementById('file-select-single').click();
  }

  onDeleteClick() {

    const activePath = this.dataService.getFromStore('activePath', false);
    this.alert.showAsElement('Are you sure?', 'Cannot undo delete!', true, true).subscribe( (alertBoxResponse: boolean) => {
      if (alertBoxResponse) {
        this.httpService.deletePath(activePath.properties.pathId).subscribe( () => {
          this.reloadListComponent();
        });
      }
    });

  }


  /**
   * Export a path to a .gpx file, getting the active geoJSON from the dataStore
   */
  onExportGpxClick() {

    const pathId = this.dataService.getFromStore('activePath', false).properties.pathId;
    const pathType = 'route';

    this.subscription = this.httpService.exportToGpx(pathType, pathId).subscribe( (fname) => {

      // this was the original attempt which does not work with authentication injection, so needed a new approach
      // window.location.href = 'http://localhost:3000/download';
      // using the angular httpClient, authentication works, but the browser attempts to read the response rather than download it
      // solution here is from https://stackoverflow.com/questions/52154874/angular-6-downloading-file-from-rest-api

      this.httpService.downloadFile(fname.fileName).subscribe( (response) => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(response);
        link.download = fname.fileName + '.gpx';
        link.click();
      });
    });

  }


  onCreateOnMapClick() {
    this.router.navigate(['/route/create']);
  }

  /** runs when file is selected */
  onFilePickedImport(event: Event, moreThanOneFile: boolean, pathType: string) {

    // show the spinner
    this.spinner.showAsElement();

    // Get file names
    const files = (event.target as HTMLInputElement).files;        // multiple files
    const fileData = new FormData();
    fileData.append('filename', files[0], files[0].name);

    this.subscription = this.httpService.importRoute(fileData).subscribe( (result) => {
      const pathAsGeoJSON = result.hills;
      this.dataService.saveToStore('activePath', {source: 'imported', pathAsGeoJSON});
      this.spinner.removeElement();
      this.router.navigate(['route/review/']);

    }, (error) => {
      this.alert.showAsElement('Something went wrong :(', error.status + ': ' + error.error, true, false).subscribe( () => {
        // reset the form otherwise if you do the same action again, the change event wont fire
        (<HTMLFormElement>document.getElementById('file_form')).reset();
        this.spinner.removeElement();
      });

    });

  }

  reloadListComponent() {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
    this.router.navigate(['route/list']);
  }

  ngOnDestroy() {
    if (this.subscription) { this.subscription.unsubscribe(); }
  }

}
