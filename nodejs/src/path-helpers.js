
"use strict"


// const addTaskToQueue = require('./thread-tasks').addTaskToQueue;
const analysePath = require('./path-analyse').analysePath;
const analyseElevations = require('./path-elevations').analyseElevations;
const Route = require('./path-class').Route;
// const tsThreadPool = require('../tests/path-analysis-threads').tsThreadPool;


/**
 * Returns an object from the Path Class that can be delivered to Mongo
 */
function getMongoObject(path, userId, userName, isSaved) {
  mongoObject = path.properties;
  mongoObject.properties.userId = userId,
  mongoObject.properties.info.createdBy = userName
  mongoObject.properties.isSaved = isSaved,
  mongoObject.properties.isPublic = false
  return MongoObject;
}


/**
 * Get a fully populated route instance from basic route data
 * Performs all the actions requires including pre-flight checks, class instantiations
 * and offloading the cpu intensive tasks to the thread pool
 */
function getRouteInstance(name, description, lngLat, elevs) {
  // console.log(lngLat, elevs)
  
  return new Promise ( async (resolve, reject) => {

    try {

      const prePath = await Route.preFlight(lngLat, elevs);
      const path = new Route(name, description, prePath.lngLat, prePath.elev);

      const {cw, category, direction, matchedPoints} = analysePath(path);
      // const {cw, category, direction, matchedPoints} = await tsThreadPool.addTaskToQueue('analysePath', path);
      path.properties.info.cw = cw;
      path.properties.info.category = category;
      path.properties.info.direction = direction;
      path.properties.params.matchedPoints = matchedPoints; 

      if (path.properties.info.isElevations) {
        path.properties.stats = {
          ...path.properties.stats,
          // ...await tsThreadPool.addTaskToQueue('analyseElevations', path),
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
  getRouteInstance
}


