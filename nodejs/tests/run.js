
// import { Route } from '../class-path-with-stats.js';
import { readFile } from 'fs';
import { getRouteInstance } from '../app.js';
import { GeoJSON } from '../class-geojson.js';

const dir = './data/';
// const fileName = 'mendip-way.js';
const fileName = 'short-circular.js';


getPath(dir+fileName)
  .then( pathFromImport => getRouteInstance(pathFromImport.name, null, pathFromImport.lngLat, []) )
  .then( route => console.log(new GeoJSON().fromPath(route).toGeoHills()))
  .catch( error => console.log(error))



function getPath(fn) {
  return new Promise ( (res, rej) => {
    readFile(fn, (err, data) => {
      res(JSON.parse(data))
    })
  })
}
