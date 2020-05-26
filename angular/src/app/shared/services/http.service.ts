import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as globals from 'src/app/shared/globals';
import { TsCoordinate, TsElevationQuery, TsUser } from 'src/app/shared/interfaces';
import { environment } from 'src/environments/environment';

@Injectable()
export class HttpService {


  private mapBoxAccessToken = globals.mapboxAccessToken;

  private host = environment.BACKEND_HOST;
  private port = environment.BACKEND_PORT;
  private backendURL = `${this.host}:${this.port}`;

  constructor( private http: HttpClient ) {

  }



  /********************************************************************************************
  *  Mapping queries
  ********************************************************************************************/
  mapboxDirectionsQuery(profile: string, start: TsCoordinate, end: TsCoordinate) {
    const coords: string =  start.lng.toFixed(6) + ',' + start.lat.toFixed(6) + ';' + end.lng.toFixed(6) + ',' + end.lat.toFixed(6);
    return this.http.get<any>('https://api.mapbox.com/directions/v5/mapbox/'
      + profile
      + '/'
      + coords
      + '?geometries=geojson&access_token='
      + this.mapBoxAccessToken);
  }

  /********************************************************************************************
   *  calls to the backend
   ********************************************************************************************/
  importRoute(formData: Object) {
    return this.http.post<any>(`http://${this.backendURL}/import-route/`, formData);
  }

  saveCreatedRoute(pathData: Object) {
    return this.http.post<any>(`http://${this.backendURL}/save-created-route/`, pathData);
  }

  saveImportedPath(pathData: Object) {
    return this.http.post<any>(`http://${this.backendURL}/save-imported-path/`, pathData);
  }

  flushDatabase() {
    return this.http.post<any>(`http://${this.backendURL}/flush/`, '');
  }

  getPathsList(type: string, isPublic: boolean, offset: number, limit: number, bbox: Array<number>) {
    let query: string;
    if (bbox.length === 0) {
      query = '?bbox=0';
    } else {
      query = '?';
      bbox.forEach( (coord, index) => {
        query += 'bbox=' + coord;
        if (index !== bbox.length - 1) { query += '&'; }
      });
    }
    return this.http.get<any>(`http://${this.backendURL}/get-paths-list/${type}/${isPublic}/${offset}/${limit}${query}`);
  }

  getPathById(type: string, id: string) {
    return this.http.get<any>(`http://${this.backendURL}/get-path-by-id/${type}/${id}`);
  }

  deletePath(id: string) {
    return this.http.delete<any>(`http://${this.backendURL}/delete-path/route/${id}`);
  }

  exportToGpx(pathType: string, pathId: string) {
    return this.http.get<any>(`http://${this.backendURL}/write-path-to-gpx/${pathType}/${pathId}`);
  }

  downloadFile(fileName: string) {
    // note responseType in options and <Blob> type
    return this.http.get<Blob>(`http://${this.backendURL}/download-file/${fileName}`,
      {responseType: 'blob' as 'json'});
  }

  getPathFromPoints(coords: Array<TsCoordinate>) {
    return this.http.post<any>(`http://${this.backendURL}/get-path-from-points/`, {coords});
  }

  registerUser(userData) {
    return this.http.post<any>(`http://${this.backendURL}/register/`, userData);
  }

  loginUser(userData) {
    return this.http.post<any>(`http://${this.backendURL}/login/`, userData);
  }

  // verifyAccount(userId: string, verificationString: string) {
  //   return this.http.get<any>(`http://${this.backendURL}/verify-account/${userId}/${verificationString}`);
  // }

  updateUserData(userData: TsUser) {
    return this.http.post<any>(`http://${this.backendURL}/update-user-data/`, userData);
  }

  makePathPublic(pathType: string, pathId: string) {
    return this.http.post<any>(`http://${this.backendURL}/toggle-path-public/`, {pathType, pathId});
  }

  copyPublicPath(pathType: string, pathId: string) {
    return this.http.post<any>(`http://${this.backendURL}/copy-public-path/`, {pathType, pathId});
  }

}
