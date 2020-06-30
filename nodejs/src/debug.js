"use strict"

/**
 * Utilities used for debugging
 */

function debugMsg(msgString) {
  if (process.env.DEBUG === 'true') {
    console.log(timeStamp() + ' >> ' + msgString);
  }
}


function padInt(num, size) {
  let s = num;
  while (s.length < size) s = '0' + s 
  return s;
}


function timeStamp() {

  var now = new Date();
  var ms = String(now.getMilliseconds()).padStart(2,'0')
  var s = String(now.getSeconds()).padStart(2,'0')
  var m = String(now.getMinutes()).padStart(2,'0')
  var h = String(now.getHours()).padStart(2,'0')
  return `${h}:${m}:${s}:${ms}`;

}


/**
 * export geoJson to file - for debugging
 * @param {GeoJSON} geoJSON class instance
 */
function exportGeoJSON(geoJSON) {

  const fs = require('fs');
  JSON.stringify(geoJSON)
  fs.writeFile('../myjsonfile.json', JSON.stringify(geoJSON), 'utf8', (err) => {console.log(err)});

}


/**
 * export data to CSV - For debugging
 * @param {Path} path
 */
function exportCSV(path) {

  const fs = require('fs');
  let file = fs.createWriteStream("../node.out");

  path.points.forEach ( point => {
    file.write([point.lng, point.lat, point.time, point.elev].join(',') + '\n')
  })

}


module.exports = {
  debugMsg,
  padInt,
  timeStamp,
  exportGeoJSON,
  exportCSV
}
