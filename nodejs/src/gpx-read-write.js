"use strict"

/**
 * Module provides GPX file read/write functions
 * TODO: Refactor long overdue
 * https://github.com/sports-alliance/sports-lib
 * Or use a generic xml parser as a base to build on??
 *
 * Suggested new approach:
 * Catch one point in turn, and catch all named params on that point, regardless of what
 * they are.  Save result as json:
 * [{lng: xxx, lat: xxx, HR: xxx, elev:xxx},
 *  {lng: xxx, lat: xxx, elev:xxx},
 *   ...etc]
 * That way we immediately associate params with points, and we can use geoPointsAndPaths to
 * strip them out as needed.
 * Maybe then deprecate load by lngLat from geoPointsAndPaths as not needed - check impact on
 * the front end.
 * Could also produce a meta-data object:
 * {
 *  name: 'mendip-Way',
 *  source: 'gpx import',
 *  ...etc
 * }
 * This could be used in Path substantiation and in Mongo save to ensure we track the srouce of
 * parameters
 */

import { createWriteStream } from 'fs';
import { debugMsg } from './debugging.js';

/**
* readGPX(data)
* @param {*} data input data from multer file read
* @param return object containing path name, coords, elevs and timestamp
* Parses track data from a provided GPX file.
* Does not distiguish between a route and a track - it disguards this knowledge
* and simplyy returns an object with supported parameters
*
*
* For paramaters other than lngLat, the following behaviour is expected:
*   > During the search, if a paramater is not found on a point it will store '' in the param array
*   > If at the end of the search all array values are '', the paramater is set to null
*   > If at the end of the search only some array values are '', those blank values are set to null
*/
export function gpxRead(data) {
  debugMsg('gpxRead()');

  // declare function variables
  const MAX_LOOPS = 1000000;
  let a = 0;                          // start of interesting feature
  let b = data.indexOf("\r",a);       // end of interesting feature
  let c;
  let latValue, lngValue, eleValue, timeValue;
  let lngLat = [];
  let time = [];
  let elev = [];
  let nameOfPath = '';
  let lineData;
  let typeOfPath;   // value does not get read at the moment
  let typeTag;
  let ptStart, ptEnd, ptData;


  /**
   * Loop through each line until we find track or route start
   */
  for (let i = 0; i < MAX_LOOPS; i++) {

    lineData = data.slice(a,b)

    a = b + 2;
    b = data.indexOf("\r",a);

    if ( lineData.indexOf("<trk>") !== -1 ) {
      typeOfPath = "track";
      typeTag = "trkpt";
      break;
    }

    if ( lineData.indexOf("<rte>") !== -1 ) {
      typeOfPath = "route";
      typeTag = "rtept";
      break;
    }

  }

  //  Try to find a name
  lineData = data.slice(a,b)
  a = lineData.indexOf("<name>");
  b = lineData.indexOf("</name>");
  if ( a !== -1 && b !== -1 ) {
    nameOfPath = lineData.slice(a + 6, b);
  }

  /**
   *  Loop through each point in this segment
   */

  ptEnd = b;
  for (let i = 0; i < MAX_LOOPS; i++) {

    // get the start and end of the current track point, break from loop if not found
    ptStart = data.indexOf('<' + typeTag,ptEnd);  // find the next tag opener
    a = data.indexOf('</' + typeTag,ptStart);     // find regular tag closure
    b = data.indexOf('/>',ptStart);               // find self-closing tag

    if ( ptStart == -1 || ( a == -1 && b == -1) ) break;  // one of the above wasnt found

    if ( a != -1 && b != -1 ) {
      // if both closures are found, take the nearest one
      ptEnd = Math.min(a,b);
    } else if ( a == -1 || b == -1 ) {
      // if one or other closure was not found, take the one that was found
      ptEnd = Math.max(a,b);
    };

    ptData = data.slice(ptStart,ptEnd)

    // lat and long
    a = ptData.indexOf("lat=");
    b = ptData.indexOf("lon=");
    c = ptData.indexOf(">");         // end of line lat/long line to ensure elev numbers arent captured

    if ( a !== -1 && b !== -1 ) {
      if ( b > a ) {
        latValue = parseFloat(ptData.slice(a, b).match(/[-0123456789.]/g).join(""));
        lngValue = parseFloat(ptData.slice(b, c).match(/[-0123456789.]/g).join(""));
      } else {
        lngValue = parseFloat(ptData.slice(b, a).match(/[-0123456789.]/g).join(""));
        latValue = parseFloat(ptData.slice(a, c).match(/[-0123456789.]/g).join(""));
      }
    }
    lngLat.push([lngValue, latValue]);

    // elevation
    eleValue = '';
    a = ptData.indexOf("<ele>");
    b = ptData.indexOf("</ele>");
    if (a != -1 && b != -1) {
      eleValue = parseFloat(ptData.slice(a,b).match(/[-0123456789.]/g).join(""));
      // isElev = true;
    }
    elev.push(eleValue === '' ? null : eleValue);

    // time
    timeValue = '';
    a = ptData.indexOf("<time>");
    b = ptData.indexOf("</time>");
    if (a != -1 && b != -1) {
      timeValue = ptData.slice(a,b).match(/[-0123456789.TZ:]/g).join("");
      // isTime = true;
    }
    time.push(timeValue === '' ? null : timeValue);
  }


  if (lngLat.length === 0) {
    throw new Error('Error reading .gpx file');
  }

  // form return object so we can use it for debugMsg as well as return
  const returnObject = {
    name: nameOfPath,
    lngLat: lngLat,
    elev: elev.every( e => e === null) ? null : elev,
    time: time.every( t => t === null) ? null : time,
  };

  // print to console and dump to file to support testing/debugging
  // if (globals.DEBUG) {
  //   debugMsg('readGPX() finished!');
  //   writeFile("../gpx_dump.js", JSON.stringify(returnObject), (err) => {} );
  // };

  return returnObject;
}


/**
 * Converts the document data into a key/value object taken by gpxWrite
 */
export function gpxWriteFromDocument(document) {

  return new Promise( (resolve, reject) => {

    const pathToExport = {
      name: !!document.info.name ? document.info.name : document.info.category + ' ' + document.info.pathType,
      description: document.info.description,
      lngLat: document.geometry.coordinates,
      elevs: document.params.elev
    }

    gpxWrite(pathToExport)
      .then( fileName => resolve(fileName))
      .catch( error => reject(error))
  })

}

/**
 * writeGpx
 *
 * Purpose is to write path data to gpx file
 *
 * TODO:
 * !!!Only supports elevation (in addition to lng/lat)!!!
 * !!!Assumes the intended output is a route not a track!!!
 *
 * @returns Name of the file
 */

export function gpxWrite(writeObject){

  debugMsg('writeGPX()');

  return new Promise( (resolve, reject) => {

    const creator = 'Trailscape https://kissenger.github.io/trailscape/';
    const xmlns = 'http://www.topografix.com/GPX/1/0';

    const fileName = writeObject.name;
    const file = createWriteStream('../' + fileName + '.gpx');
    const s = '   ';
    const eol = '\r\n'

    file.on('finish', () => { resolve(true) });
    file.on('error', reject);
    file.on('open', () => {

      file.write(s.repeat(0) + "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + eol);
      file.write(s.repeat(0) + "<gpx version=\"1.1\" creator=\"" + creator + "\" xmlns=\"" + xmlns + "\">" + eol);
      file.write(s.repeat(1) + "<rte>" + eol);
      file.write(s.repeat(2) + "<name>" + writeObject.name + "</name>" + eol);

      writeObject.lngLat.forEach( (lngLat, i) => {

        if ( writeObject.elevs[i] ) {
          // elevation data exists, use conventional tag
          file.write(s.repeat(2) + "<rtept lat=\"" + lngLat[1] + "\" lon=\"" + lngLat[0] + "\">" + eol);
          file.write(s.repeat(3) + "<ele>" + writeObject.elevs[i] + "</ele>" + eol);
          file.write(s.repeat(2) + "</rtept>" + eol);

        } else {
          // only lat/lon exists, use self-closing tag
          file.write(s.repeat(2) + "<rtept lat=\"" + lngLat[1] + "\" lon=\"" + lngLat[0] + "\" />" + eol);

        }

      });

      file.write(s.repeat(1) + "</rte>" + eol);
      file.write(s.repeat(0) + "</gpx>");

      file.finish;
      resolve(fileName);
    });

    debugMsg('writeGPX() finished');
  })

}
