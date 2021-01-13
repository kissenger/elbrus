import { TsPosition } from './../interfaces';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { TsCoordinate, TsElevationQuery, TsSnapType, TsUser } from 'src/app/shared/interfaces';
import { environment } from 'src/environments/environment';

@Injectable()
export class HttpService {


  private mapBoxAccessToken = environment.MAPBOX_TOKEN;
  private protocol = environment.PROTOCOL;
  private url = environment.BACKEND_URL;
  private backendURL = `${this.protocol}://${this.url}`;

  constructor( private http: HttpClient ) {

  }



  /********************************************************************************************
  *  Mapping queries
  ********************************************************************************************/
  mapboxDirectionsQuery(snapType: TsSnapType, start: TsPosition, end: TsPosition) {
    const coords = `${start[0].toFixed(6)},${start[1].toFixed(6)};${end[0].toFixed(6)},${end[1].toFixed(6)}`;
    const token = `geometries=geojson&access_token=${this.mapBoxAccessToken}`;
    return this.http.get<any>(`https://api.mapbox.com/directions/v5/mapbox/${snapType}/${coords}?${token}`);
  }

  /********************************************************************************************
   *  calls to the backend
   ********************************************************************************************/
  importRoute(formData: Object) {
    return this.http.post<any>(`${this.backendURL}/import-route/`, formData);
  }

  saveRoute(pathData: Object) {
    return this.http.post<any>(`${this.backendURL}/save-created-route/`, pathData);
  }

  // updateEditedRoute(pathData: Object) {
  //   return this.http.post<any>(`${this.backendURL}/save-created-route/`, pathData);
  // }

  saveImportedPath(pathData: Object) {
    return this.http.post<any>(`${this.backendURL}/save-imported-path/`, pathData);
  }

  flushDatabase() {
    return this.http.post<any>(`${this.backendURL}/flush/`, '');
  }

  getPathsList(type: string, isPublic: boolean, offset: number, limit: number, bbox: Array<number>) {
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
    return this.http.get<any>(`${this.backendURL}/get-list/${type}/${isPublic}/${offset}/${limit}${query}`);
  }

  getPathById(type: string, id: string) {
    return this.http.get<any>(`${this.backendURL}/get-path-by-id/${type}/${id}`);
  }

  deletePath(id: string) {
    return this.http.delete<any>(`${this.backendURL}/delete-path/route/${id}`);
  }

  exportToGpx(pathType: string, pathId: string) {
    return this.http.get<any>(`${this.backendURL}/write-path-to-gpx/${pathType}/${pathId}`);
  }

  downloadFile(fileName: string) {
    // note responseType in options and <Blob> type
    return this.http.get<Blob>(`${this.backendURL}/download-file/${fileName}`,
      {responseType: 'blob' as 'json'});
  }

  getPathFromPoints(positions: Array<TsPosition>, options: {simplify: boolean} = {simplify: false}) {
    const coords = positions.map(p => ({lng: p[0], lat: p[1]}) );
    return this.http.post<any>(`${this.backendURL}/get-path-from-points/`, {coords, options});
  }

  register(userData) {
    return this.http.post<any>(`${this.backendURL}/register/`, userData);
  }

  login(userData) {
    return this.http.post<any>(`${this.backendURL}/login/`, userData);
  }

  // verifyAccount(userId: string, verificationString: string) {
  //   return this.http.get<any>(`http://${this.backendURL}/verify-account/${userId}/${verificationString}`);
  // }

  updateUserData(userData: TsUser) {
    return this.http.post<any>(`${this.backendURL}/update-user-data/`, userData);
  }

  togglePathPublic(pathType: string, pathId: string) {
    return this.http.post<any>(`${this.backendURL}/toggle-path-public/`, {pathType, pathId});
  }

  copyPath(pathType: string, pathId: string) {
    return this.http.post<any>(`${this.backendURL}/copy-path/`, {pathType, pathId});
  }

  reverseRoute(pathType: string, pathId: string) {
    return this.http.get<any>(`${this.backendURL}/reverse-route/${pathType}/${pathId}`);
  }

}
