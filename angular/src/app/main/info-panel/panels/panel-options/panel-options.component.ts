import { Component, OnInit, OnDestroy, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { HttpService } from 'src/app/shared/services/http.service';
import { DataService } from 'src/app/shared/services/data.service';
import { Subscription } from 'rxjs';
import { AlertService } from 'src/app/shared/services/alert.service';
import { SpinnerService } from 'src/app/shared/services/spinner.service';
import { AuthService } from 'src/app/shared/services/auth.service';
import { environment } from 'src/environments/environment';
import { ScreenSizeService } from 'src/app/shared/services/screen-size.service';
import * as globals from 'src/app/shared/globals';

@Component({
  selector: 'app-panel-options',
  templateUrl: './panel-options.component.html',
  styleUrls: ['./panel-options.component.css']
})
export class PanelOptionsComponent implements OnInit, OnDestroy {

  private pathListener: Subscription;
  private httpListener: Subscription;
  public isPathPublic: boolean;
  public createdBy: string;
  public pathId: string;
  private pathType: string;
  public windowWidth: number;
  public BREAKPOINT = globals.BREAKPOINTS.MD;

  constructor(
    private router: Router,
    private http: HttpService,
    private data: DataService,
    private alert: AlertService,
    private spinner: SpinnerService,
    public auth: AuthService,
    private screenSize: ScreenSizeService
   ) {
    this.windowWidth = this.screenSize.width;
    this.screenSize.resize.subscribe( (newWidth: {width: number, height: number}) => {
      this.windowWidth = newWidth.width;
    });
   }

  ngOnInit() {

    this.pathListener = this.data.pathIdEmitter.subscribe( () => {

      const geoJson = this.data.getPath();

      if (geoJson) {
        this.isPathPublic = geoJson.properties.info.isPublic;
        this.createdBy = geoJson.properties.info.createdBy;
        this.pathId = geoJson.properties.pathId;
        this.pathType = geoJson.properties.info.pathType;
      }

    });

  }


  /** virtually clicks the hidden form element to launch the select file dialogue */
  onImportGpxClick() {
    console.log('ferf');
    if (!this.auth.isRegistered) { return; }
    document.getElementById('file-select-single').click();
  }


  onCreateClick() {
    // this.data.forceMenuCloseEmitter.emit(null);
    this.data.setPath(null);
    this.router.navigate(['/routes/create']);
  }


  onChangePublicClick() {
    this.httpListener = this.http.togglePathPublic(this.pathType, this.pathId).subscribe( (result) => {
      this.router.routeReuseStrategy.shouldReuseRoute = () => false;
      this.router.onSameUrlNavigation = 'reload';
      this.router.navigate(['routes/list/' + this.pathId]);
    });
  }


  onCopyClick() {
    if (!this.auth.isRegistered) { return; }
    this.httpListener = this.http.copyPath(this.pathType, this.pathId).subscribe( (result) => {
      this.router.routeReuseStrategy.shouldReuseRoute = () => false;
      this.router.onSameUrlNavigation = 'reload';
      this.router.navigate(['routes/list/' + result.pathId]);
    });
  }


  onDeleteClick() {
    if (!this.auth.isRegistered) { return; }

    const pathName = this.data.getPath().properties.info.name;
    this.alert.showAsElement(`Delete '${pathName}'?`, `Are you sure? This cannot be undone.`,
        true, true).subscribe( (alertBoxResponse: boolean) => {
      if (alertBoxResponse) {
        this.http.deletePath(this.pathId).subscribe( () => {
          this.data.clearPath();
          this.reloadListComponent();
        });
      }
    });
  }


  onEditClick() {
    if (!this.auth.isRegistered) { return; }
    this.router.navigate(['/routes/edit']);
  }


  onShareClick() {
    if (!this.auth.isRegistered) { return; }
    const link = `${environment.PROTOCOL}://${environment.FRONTEND_URL}/routes/list/${this.pathId}`;
    navigator.clipboard.writeText(link)
      .then( () => {
        this.alert
          .showAsElement('Success', `Link copied to clipboard\r\n${link}`, true, false)
          .subscribe( () => {} );
      })
      .catch( (err) => {
        this.alert
          .showAsElement('Something went wrong :(', `Couldn't copy link to clipboard\r\n${link}`, true, false)
          .subscribe( () => {} );
      });
  }

  /**
   * Export a path to a .gpx file, getting the active geoJSON from the dataStore
   */
  onExportGpxClick() {

    this.httpListener = this.http.exportToGpx(this. pathType, this.pathId).subscribe( (fname) => {

      // this was the original attempt which does not work with authentication injection, so needed a new approach
      // window.location.href = 'http://localhost:3000/download';
      // using the angular httpClient, authentication works, but the browser attempts to read the response rather than download it
      // solution here is from https://stackoverflow.com/questions/52154874/angular-6-downloading-file-from-rest-api

      this.http.downloadFile(fname.fileName).subscribe( (response) => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(response);
        link.download = fname.fileName;
        link.click();
      });
    });

  }


  /** runs when file is selected */
  onFilePickedImport(event: Event, moreThanOneFile: boolean, pathType: string) {

    // show the spinner
    this.spinner.showAsElement();

    // Get file names
    const files = (event.target as HTMLInputElement).files;        // multiple files
    const fileData = new FormData();
    fileData.append('filename', files[0], files[0].name);

    this.httpListener = this.http.importRoute(fileData).subscribe(

      (result) => {
        const pathAsGeoJSON = result.hills;
        this.data.setPath(pathAsGeoJSON);
        this.spinner.removeElement();
        this.router.navigate(['routes/review/']);
      },

      (error) => {
        // console.log(error);
        // this.alert.showAsElement(`${error.name}: ${error.name}`, error.message, true, false).subscribe( () => {} );
        // reset the form otherwise if you do the same action again, the change event wont fire
        (<HTMLFormElement>document.getElementById('file_form')).reset();
        this.spinner.removeElement();
    });

  }


  reloadListComponent() {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';
    this.router.navigate(['routes/list']);
  }


  ngOnDestroy() {
    if (this.httpListener) { this.httpListener.unsubscribe(); }
    if (this.pathListener) { this.pathListener.unsubscribe(); }
  }

}
