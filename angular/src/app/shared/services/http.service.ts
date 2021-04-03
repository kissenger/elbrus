
import { TsPosition } from './../interfaces';
import { Injectable } from '@angular/core';
import { HttpClient} from '@angular/common/http';
import { TsSnapType, TsUser } from 'src/app/shared/interfaces';
import { environment } from 'src/environments/environment';
import { ErrorService } from './error.service';
import { catchError } from 'rxjs/operators';

@Injectable()
export class HttpService {


  private mapBoxAccessToken = environment.MAPBOX_TOKEN;
  private protocol = environment.PROTOCOL;
  private url = environment.BACKEND_URL;
  private backendURL = `${this.protocol}://${this.url}`;

  constructor(
    private http: HttpClient,
    private errorService: ErrorService
    ) {

  }


  /********************************************************************************************
  *  Mapping queries
  ********************************************************************************************/
  mapboxDirectionsQuery(snapType: TsSnapType, start: TsPosition, end: TsPosition) {

    const coords = `${start[0].toFixed(6)},${start[1].toFixed(6)};${end[0].toFixed(6)},${end[1].toFixed(6)}`;
    const token = `geometries=geojson&access_token=${this.mapBoxAccessToken}`;

    return this.http
      .get<any>(`https://api.mapbox.com/directions/v5/mapbox/${snapType}/${coords}?${token}`)
      .pipe( catchError(this.errorService.handleError) );

  }

  /********************************************************************************************
   *  calls to the backend
   ********************************************************************************************/
  importRoute(formData: Object) {
    return this.http
      .post<any>(`${this.backendURL}/import-route/`, formData)
      .pipe( catchError(this.errorService.handleError) );
  }

  saveRoute(pathData: Object) {
    return this.http
      .post<any>(`${this.backendURL}/save-created-route/`, pathData)
      .pipe( catchError(this.errorService.handleError) );
  }

  saveImportedPath(pathData: Object) {
    return this.http
      .post<any>(`${this.backendURL}/save-imported-path/`, pathData)
      .pipe( catchError(this.errorService.handleError) );
  }

  flushDatabase() {
    return this.http
      .post<any>(`${this.backendURL}/flush/`, '')
      .pipe( catchError(this.errorService.handleError) );
  }

  getPathsList(
    type: string,
    isPublic: boolean,
    offset: number,
    limit: number,
    sort: 'a-z' | 'dist' | 'lump' | 'date',
    direction: '1' | '-1',
    searchText: string,
    bbox: Array<number>
    ) {

    let query: string;
    if (bbox.length === 0) {
      query = '?bbox=0';
    } else {
      query = '?';
      bbox.forEach( (coord, index) => {
        query += 'bbox=' + coord.toFixed(6);
        if (index !== bbox.length - 1) { query += '&'; }
      });
    }

    searchText = searchText ? searchText : ' ';
console.log(searchText)
console.log(`${this.backendURL}/get-list/${type}/${isPublic}/${offset}/${limit}/${sort}/${direction}/${searchText}${query}`);
    return this.http
      .get<any>(`${this.backendURL}/get-list/${type}/${isPublic}/${offset}/${limit}/${sort}/${direction}/${searchText}${query}`)
      .pipe( catchError(this.errorService.handleError) );
  }

  getPathById(type: string, id: string) {
    return this.http
      .get<any>(`${this.backendURL}/get-path-by-id/${type}/${id}`)
      .pipe( catchError(this.errorService.handleError) );
  }

  deletePath(id: string) {
    return this.http
      .delete<any>(`${this.backendURL}/delete-path/route/${id}`)
      .pipe( catchError(this.errorService.handleError) );
  }

  exportToGpx(pathType: string, pathId: string) {
    return this.http
      .get<any>(`${this.backendURL}/write-path-to-gpx/${pathType}/${pathId}`)
      .pipe( catchError(this.errorService.handleError) );
  }

  downloadFile(fileName: string) {
    // note responseType in options and <Blob> type
    return this.http
      .get<Blob>(`${this.backendURL}/download-file/${fileName}`, {responseType: 'blob' as 'json'})
      .pipe( catchError(this.errorService.handleError) );
  }

  getPathFromPoints(positions: Array<TsPosition>, options: {simplify: boolean} = {simplify: false}) {
    const lngLats = positions.map(p => ({lng: p[0], lat: p[1]}) );
    return this.http
      .post<any>(`${this.backendURL}/get-path-from-points/`, {lngLats, options})
      .pipe( catchError(this.errorService.handleError) );

  }

  register(userData) {
    return this.http
      .post<any>(`${this.backendURL}/register/`, userData)
      .pipe( catchError(this.errorService.handleError) );
  }

  login(userData) {
    return this.http
      .post<any>(`${this.backendURL}/login/`, userData)
      .pipe( catchError(this.errorService.handleError) );
  }

  // verifyAccount(userId: string, verificationString: string) {
  //   return this.http.get<any>(`http://${this.backendURL}/verify-account/${userId}/${verificationString}`);
  // }

  updateUserData(userData: TsUser) {
    return this.http
      .post<any>(`${this.backendURL}/update-user-data/`, userData)
      .pipe( catchError(this.errorService.handleError) );
  }

  togglePathPublic(pathType: string, pathId: string) {
    return this.http
    .post<any>(`${this.backendURL}/toggle-path-public/`, {pathType, pathId})
    .pipe( catchError(this.errorService.handleError) );
  }

  copyPath(pathType: string, pathId: string) {
    return this.http
      .post<any>(`${this.backendURL}/copy-path/`, {pathType, pathId})
      .pipe( catchError(this.errorService.handleError) );
  }

}
