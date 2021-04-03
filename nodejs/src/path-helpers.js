
"use strict"

const analysePath = require('./path-analyse').analysePath;
const analyseElevations = require('./path-elevations').analyseElevations;
const Route = require('./path-class').Route;


/**
 * Returns an object from the Path Class that can be delivered to Mongo
 */
function getMongoObject(path, userId, userName, isSaved, isPublic) {
  const mongoObject = path.pathData;
  mongoObject.userId = userId,
  mongoObject.info.createdBy = userName
  mongoObject.isSaved = isSaved,
  mongoObject.isPublic = isPublic
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
 * 
 * expects an object as ...
 * {
 *    lngLats: [[lng, lat], ...],   Mandatory
 *    elevs: [elev, ...],           Optional
 *    name: string,                 Optional
 *    description: string,          Optional
 *    activityType: string          Optional - defaults to 'running'
 * }
 */
function getRouteInstance(dataObject) {
  
  return new Promise ( async (resolve, reject) => {

    const lngLats = dataObject.lngLats || null;
    if (!lngLats) {
      reject(new Error('Cannot get route instance without lngLats'))
    }
    console.log(dataObject.activityType);
    const name = dataObject.name || null;
    const description = dataObject.description || null;
    const activityType = dataObject.activityType || null;
    const elevs = dataObject.elevs || null;

    try {

      const prePath = await Route.preFlight(lngLats, elevs);
      const path = new Route(name, description, activityType, prePath.lngLats, prePath.elevs);

      const {cw, category, direction, matchedPoints} = analysePath(path);
      path.pathData.info.cw = cw;
      path.pathData.info.category = category;
      path.pathData.info.direction = direction;
      path.pathData.info.isPublic = false;
      path.pathData.info.activityType = activityType;
      path.pathData.params.matchedPoints = matchedPoints;
      path.pathData.params.elev = prePath.elevs;  //backward compatibility since change to elevs

      if (path.pathData.info.isElevations) {
        path.pathData.stats = {
          ...path.pathData.stats,
          ...analyseElevations(path)
        };
        
        path.pathData.params.smoothedElev = path.pathData.stats.smoothedElevations;
        delete path.pathData.stats.smoothedElevations;
      }

      resolve(path);

    } catch (error) {

      console.log(error);
      reject(error)
    
    }

  });

}

module.exports = {
  getMongoObject,
  getRouteInstance,
  getReverseOfRoute
}


