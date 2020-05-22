import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import * as globals from 'src/app/shared/globals';
import { TsCoordinate, TsElevationQuery, TsUser } from 'src/app/shared/interfaces';
import { environment } from 'src/environments/environment';

@Injectable()
export class HttpService {


  private mapBoxAccessToken = globals.mapboxAccessToken;
  // private hostName = '192.168.0.12'
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

  getPathsList(type: string, offset: number, limit: number, bbox: Array<number>) {
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
    return this.http.get<any>(`http://${this.backendURL}/get-paths-list/${type}/${offset}/${limit}${query}`);
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

  // logoutUser() {
  //   localStorage.removeItem('token');
  // }

  // loggedIn() {
  //   return !!localStorage.getItem('token');   // double ! casts result to boolean
  // }

  // getToken() {
  //   return localStorage.getItem('token');
  // }

  updateUserData(userData: TsUser) {
    return this.http.post<any>(`http://${this.backendURL}/update-user-data/`, userData);
  }


}
