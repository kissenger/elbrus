
"use strict"

const analysePath = require('./path-analyse').analysePath;
const analyseElevations = require('./path-elevations').analyseElevations;
const Route = require('./path-class').Route;


/**
 * Returns an object from the Path Class that can be delivered to Mongo
 */
function getMongoObject(path, userId, userName, isSaved) {
  const mongoObject = path.properties;
  mongoObject.userId = userId,
  mongoObject.info.createdBy = userName
  mongoObject.isSaved = isSaved,
  mongoObject.isPublic = false
  return mongoObject;
}

/**
 *TODO: include in geo-points-and-paths??
 */
function getReverseOfRoute(coords, elevs) {
  const n = coords.length;
  const revCoords = coords.map( (c, i, arr) => arr[n-i-1]);
  const revElevs = elevs.map( (c, i, arr) => arr[n-i-1]);
  return {lngLats: revCoords, elevs: revElevs};
}



/**
 * Get a fully populated route instance from basic route data
 * Performs all the actions requires including pre-flight checks, class instantiations
 * and offloading the cpu intensive tasks to the thread pool
 */
function getRouteInstance(name, description, lngLat, elevs) {
  
  return new Promise ( async (resolve, reject) => {

    try {

      const prePath = await Route.preFlight(lngLat, elevs);
      const path = new Route(name, description, prePath.lngLat, prePath.elev);

      const {cw, category, direction, matchedPoints} = analysePath(path);
      path.properties.info.cw = cw;
      path.properties.info.category = category;
      path.properties.info.direction = direction;
      path.properties.info.isPublic = false;
      path.properties.params.matchedPoints = matchedPoints; 

      if (path.properties.info.isElevations) {
        path.properties.stats = {
          ...path.properties.stats,
          ...analyseElevations(path)
        };

        
        
        path.properties.params.smoothedElev = path.properties.stats.smoothedElevations;
        delete path.properties.stats.smoothedElevations;
      }

      // console.log(path);
      resolve(path);

    } catch (error) {

      console.log(error);
    
    }

  });

}

module.exports = {
  getMongoObject,
  getRouteInstance,
  getReverseOfRoute
}


