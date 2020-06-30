
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
 */
function bbox2Polygon(bbox) {
  return [[
    [ bbox[0] * 1, bbox[1] * 1 ],
    [ bbox[2] * 1, bbox[1] * 1 ],
    [ bbox[2] * 1, bbox[3] * 1 ],
    [ bbox[0] * 1, bbox[3] * 1 ],
    [ bbox[0] * 1, bbox[1] * 1 ]
  ]]
}


/*******************
 * Other
 *******************/

 /**
  * Returns an object expected by the front end when a list query is made
  * Called by get-paths-list()
  */
function getListData(docs) {

  return docs.map( d => ({
    name: d.info.name,
    stats: d.stats,
    // category: d.info.category,
    // direction: d.info.direction,
    // pathType: d.info.pathType,
    // startTime: d.startTime,
    // creationDate: d.creationDate,
    // isElevations: d.info.isElevations,
    // isLong: d.info.isLong,
    pathId: d._id
    })
  );

}




module.exports = {
  mongoModel,
  bbox2Polygon,
  bbox2Point,
  getListData
}