"use strict"

/**
 * Utilities used for debugging
 */

export function debugMsg(msgString) {
  if (process.env.DEBUG) {
    console.log(timeStamp() + ' >> ' + msgString);
  }
}


export function padInt(num, size) {
  let s = num;
  while (s.length < size) s = '0' + s 
  return s;
}


export function timeStamp() {

  var now = new Date();
  var ms = String(now.getMilliseconds()).padStart(2,'0')
  var s = String(now.getSeconds()).padStart(2,'0')
  var m = String(now.getMinutes()).padStart(2,'0')
  var h = String(now.getHours()).padStart(2,'0')
  var dd = String(now.getDate()).padStart(2, '0');
  var mm = String(now.getMonth() + 1).padStart(2, '0'); //January is 0!
  var yyyy = now.getFullYear();

  return dd+'/'+mm+'/'+yyyy+' '+h+':'+m+':'+s+':'+ms;

}


/**
 * export geoJson to file - for debugging
 * @param {GeoJSON} geoJSON class instance
 */
export function exportGeoJSON(geoJSON) {

  const fs = require('fs');
  JSON.stringify(geoJSON)
  fs.writeFile('../myjsonfile.json', JSON.stringify(geoJSON), 'utf8', (err) => {console.log(err)});

}


/**
 * export data to CSV - For debugging
 * @param {Path} path
 */
export function exportCSV(path) {

  const fs = require('fs');
  let file = fs.createWriteStream("../node.out");

  path.points.forEach ( point => {
    file.write([point.lng, point.lat, point.time, point.elev].join(',') + '\n')
  })

}

