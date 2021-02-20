
"use strict"

/**
 * Module provides abstractions for the 'app' module
 */
const Routes = require('./schema/path-models').Routes;
// const Route = require('./path-class').Route;

/**
* returns the desired mongo model object
* useful to programmatically select mongo model from pathType
*/
function mongoModel(pathType) {
  switch(pathType) {
    // case 'challenge': return MongoChallenges.Challenges;
    case 'route': return Routes;
    // case 'publicroute': return PublicRoutes;
    // case 'track': return Tracks;
    // case 'match': return MongoMatch.Match;
  }
}




function bbox2Point(bbox) {
  return [
    (bbox[2] * 1 + bbox[0] * 1) / 2, 
    (bbox[3] * 1 + bbox[1] * 1) / 2
  ]
}


/**
 * Converts standard bounding box to polygon for mongo geometry query
 * bbox bounding box as [minlng, minlat, maxlng, maxlat]
 * note that minLng, ... etc come in as strings 
 */
function bbox2Polygon(bbox) {

  // define a factor 
  const factor = 0.95;

  bbox = scaleBox(bbox.map( a => a * 1), factor);
  bbox = checkBoxBounds(bbox)
  bbox = bbox.map(a => limitPrecision(a, 7));

  // return polygon
  return [[
    [ bbox[0], bbox[1] ],
    [ bbox[2], bbox[1] ],
    [ bbox[2], bbox[3] ],
    [ bbox[0], bbox[3] ],
    [ bbox[0], bbox[1] ]
  ]]
}



// limit value (number) to n decimal places in precision
function limitPrecision(value, precision) {
  let multiplier = Math.pow(10, precision);
  return Math.round( value * multiplier ) / multiplier;
}



// factors bbox to with shrink (factor < 1) or grow (factor > 1) box 
function scaleBox(bbox, factor) {

  const minLat = bbox[1];
  const maxLat = bbox[3];
  const minLng = bbox[0];
  const maxLng = bbox[2];

  const lngRange = maxLng - minLng;
  const latRange = maxLat - minLat;

  const lngShift = (lngRange - lngRange * factor) / 2;
  const latShift = (latRange - latRange * factor) / 2;

  return [
    minLng < 0 ? minLng - lngShift : minLng + latShift,
    minLat < 0 ? minLat - latShift : minLat + latShift,
    maxLng < 0 ? maxLng + lngShift : maxLng - latShift,
    maxLat < 0 ? maxLat + latShift : maxLat - latShift
  ]


}

// caps lat/lng to ensure no values out of range
function checkBoxBounds(bbox) {
  const minLng = bbox[0] < -180 ? -180 : bbox[0] > 180 ? 180 : bbox[0];
  const minLat = bbox[1] < -90  ? -90  : bbox[1] > 90  ? 90  : bbox[1];
  const maxLng = bbox[2] < -180 ? -180 : bbox[2] > 180 ? 180 : bbox[2];
  const maxLat = bbox[3] < -90  ? -90  : bbox[3] > 90  ? 90  : bbox[3];
  return [minLng, minLat, maxLng, maxLat];
}


/*******************
 * Other
 *******************/

 /**
  * Returns an object expected by the front end when a list query is made
  * Called by get-paths-list()
  */
// function getListData(docs) {

//   // return docs.map( d => ({
//   //   // name: d.info.name,
//   //   stats: d.stats,
//   //   info: {
//   //     ...d.info,
//   //     isPublic: d.isPublic
//   //   },
//   //   pathId: d._id
//   //   })
//   // );

//   return docs;

// }




module.exports = {
  mongoModel,
  bbox2Polygon,
  bbox2Point
}