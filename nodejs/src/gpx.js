"use strict"

const { DOMParser } = require('xmldom');


class ParseGPX {

  constructor(gpxString) {

    const root = new DOMParser().parseFromString(gpxString, 'text/xml');
    const parsed = this.parseChild(root.documentElement);
    return this.getPointData(parsed);

  }

  // reads the xml and returns a json structured object
  parseChild(elm) {

    const attrs = {};
    const attributes = elm.attributes;

    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      if (attr && attr.value) {
        attrs[attr.name] = attr.value
      }
    }

    if (elm.childNodes) {

      const children = elm.childNodes;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const name = child.localName;
        if (!name) {
          continue
        }

        if (!attrs[name]) {
          attrs[name] = []
        }
        attrs[name].push(this.parseChild(child))
      }
    }

    if (Object.keys(attrs).length === 0) {
      return elm.textContent
    }
    return attrs
  }

  /**
   * takes the destructured xml and returns the points arrays needed for instantiating a Path
   * where there is more than one trk or seg, only the first is considered
   * If there are more than one segment in that trk or seg, then they are merged
   */
  getPointData(xml) {

    let tag;
    if (xml.rte) {
      tag = 'rte';
    } else if (xml.trk) {
      tag = 'trk'
    } else {
      throw new Error('trk or rte tag not found')
    }

    // get the first segment only
    const firstTrkOrRte = xml[tag][0];
    const name = firstTrkOrRte.name || null;
    const description = firstTrkOrRte.desc || null;
    const lngLats = [];
    const elevs = [];
    const time = [];

    // get an array of the point on the first trk/rte - if trk then likely to be segments so combine them
    let points = [];
    if (firstTrkOrRte[tag+'seg']) { 
      for (let seg of firstTrkOrRte[tag+'seg']) {
        points.push(...seg.trkpt);
      }
    } else {
      points = firstTrkOrRte.rtept;
    }

    // get the data into the desired format
    for (let pt of points) {
      lngLats.push([Math.round(pt.lon*1e6)/1e6, Math.round(pt.lat*1e6)/1e6]);
      elevs.push(pt.ele ? Math.round(pt.ele*10)/10 : null);
      time.push(pt.time ? pt.time[0] : null);
    }

    return {
      name: name[0] ? name[0] : name,
      description: description ? (description[0] ? description[0] : description) : null,
      lngLats,
      elevs: elevs.every( e => e === null) ? null : elevs,
      time: time.every( e => e === null) ? null : time
    };
  
  }

}





/**
 * Converts the document data into a key/value object taken by gpxWrite
 */
function gpxWriteFromDocument(document) {

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

function gpxWrite(writeObject){

  debugMsg('writeGPX()');

  return new Promise( (resolve, reject) => {

    const creator = 'Trailscape https://kissenger.github.io/trailscape/';
    const xmlns = 'http://www.topografix.com/GPX/1/0';

    // TODO: Unique filename needed otherwise cannot do export twice on the same filename, but of a hack, better way?
    const filePath = './downloads/'
    const fileName = writeObject.name + ' ' + (new Date()).getMilliseconds() + '.gpx';

    const file = createWriteStream(filePath + fileName);
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

module.exports = {
  ParseGPX,
  gpxWriteFromDocument
}
