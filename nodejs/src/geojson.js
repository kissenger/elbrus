
"use strict"

 /**
  * Class GeoJSON to handle creation of geoJson object to return to the front end.
  * The class can be populated using path instance or mongo document.  The mehtods
  * on the class are intended to be chained as follows:
  *   const newGeoJson = new GeoJson().fromPath(path).toGeoHills();
  */
 
const PathWithStats = require('./path-class').PathWithStats;
const debugMsg = require('./debug').debugMsg;


// const ROUTE_COLOUR =  require('./globals').ROUTE_COLOUR;

const FLAT_COLOUR =   require('./globals').FLAT_COLOUR;
const UP_COLOUR =     require('./globals').UP_COLOUR;
const DOWN_COLOUR =   require('./globals').DOWN_COLOUR;

class GeoJSON {
  constructor() {
    debugMsg(`GeoJSON`);
  
    
  }

  /**
   * Public Methods
   */

  // populates the class instance with data from supplied Path instance
  fromPath(path) {
    
    path = JSON.parse(JSON.stringify(path));
    this._lngLats = path.pathData.geometry.coordinates;
    this._properties = path.pathData;
    this._properties.pathId = path.pathData.pathId;
    // backward compatibility after change to storing as elevs
    this._elevs = this._properties.params.elevs || this._properties.params.elev;
    this._bbox = this._properties.stats.bbox;
    this._features = [];
    delete this._properties.geometry;
    return this;

  }


  // populates the class instance with data from supplied mongo document
  fromDocument(doc) {
    this._checkIsDocument(doc);
    this._lngLats = doc.geometry.coordinates;

    this._properties = {
      pathId: doc._id,
      params: doc.params,
      info: {
        ...doc.info,
        isPublic: doc.isPublic
      },
      stats: doc.stats
    };
    this._elevs = this._properties.params.elev;
    this._bbox = doc.stats.bbox;
    this._features = [];
    return this;
  }


  // returns a 'normal' geoJSON feature collection with a single feature
  toBasic() {
    this._features = [this._feature(this._lngLats, this._elevs, this._properties.params.cumDistance, FLAT_COLOUR)];
    return this._featureCollection();
  }


  // returns a geoJSON feature collection with features coloured depending on hill
  // TODO: Hill detection should be in _getHillSegments - makes the intent of this route easier to understand - should
  // return just a flat segment if that is appropriate.
  toGeoHills() {
    
    let isHills = false;
    if (this._properties.stats.hills) {
      if (this._properties.stats.hills.length > 0) {
        isHills = true;
      }
    }

    if (isHills) {
      this._getHillSegments().forEach( segment => {
        let coords = this._lngLats.slice(segment.start, segment.end + 1);
        let elevs = this._elevs.slice(segment.start, segment.end + 1);
        let cumDist = this._properties.params.cumDistance.slice(segment.start, segment.end + 1).map(x=>Math.round(x));
        this._features.push(this._feature(coords, elevs, cumDist, segment.colour));
      });
    } else {
      this._features = [ this._feature(this._lngLats, this._elevs, this._properties.params.cumDistance, FLAT_COLOUR) ];
    }

    return this._featureCollection();
    
  }


  /**
   * Private Methods
   */


  _checkIsPath(input) {
    if ( !(input instanceof PathWithStats)) {
      throw new Error('GeoJSON fromPath() expects instance of PathWithStats class as input');
    }
  }


  _checkIsDocument(input) {
    if ( !input.geometry || !input.params ) {
      throw new Error('GeoJSON fromDocument() expects Mongo document as input');
    }
  }


  /**
   * get an array of arrays of the form [[startSlice, endSlice, colour], ...] describing each
   * segment of the provided path according to whether it is uphill, downhill or flat
   * TODO: could be improved, a bit clunky but it works and will do for now
   */
  _getHillSegments() {

    const hills = this._properties.stats.hills;
    const segments = [];

    //if the path starts with a hill then push that before looping
    if (hills[0].startPoint !== 0 ) {
      segments.push({colour: FLAT_COLOUR, start: 0, end: hills[0].startPoint})
    };

    // loop through the hills array
    for (let i = 0, iMax = hills.length - 1; i <= iMax; i++) {

      // push the current hill
      segments.push({colour: hills[i].aveGrad > 0 ? UP_COLOUR : DOWN_COLOUR, start: hills[i].startPoint, end: hills[i].endPoint});

      // push the next flat
      if (i !== iMax) {
        if (hills[i].endPoint !== hills[i+1].startPoint) {
          segments.push({colour: FLAT_COLOUR, start: hills[i].endPoint, end: hills[i+1].startPoint});
        }
      } else {
        if (hills[i].endPoint !== this._lngLats.length-1) {
          segments.push({colour: FLAT_COLOUR, start: hills[i].endPoint, end: this._lngLats.length-1});
        }
      }
    }

    return segments;

  }


  // returns a geoJson feature for the provided coordinates, elevations and colour
  _feature(coords, elevs, cumd, colour) {
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coords
      },
      properties: {
        lineColour: colour,
        lineWidth: 5,
        lineOpacity: 0.5,
        params: {
          cumDistance: cumd,
          elevs: elevs
        }
      }
    }
  }


  // returns a featureCollection containing all of the features on the class instance
  _featureCollection() {
    return {
      type: 'FeatureCollection',
      bbox: [this._bbox.minLng, this._bbox.minLat, this._bbox.maxLng, this._bbox.maxLat],
      features: this._features,
      properties: this._properties
    }
  }

}

module.exports = {
  GeoJSON
}

