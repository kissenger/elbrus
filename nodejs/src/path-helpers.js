

const analysePath = require('./analyse-path').analysePath;
const analyseElevations = require('./analyse-elevations').analyseElevations;
const Route = require('./class-path').Route;



function getMongoObject(path, userId, userName, isSaved) {
  mongoObject = path.properties;
  mongoObject.properties.userId = userId,
  mongoObject.properties.info.createdBy = userName
  mongoObject.properties.isSaved = isSaved,
  mongoObject.properties.isPublic = false
  return MongoObject;
}



function getRouteInstance(name, description, lngLat, elevs) {
  
  return new Promise ( async (resolve, reject) => {

    try {

      const prePath = await Route.preFlight(lngLat, elevs);
      const path = new Route(name, description, prePath.lngLat, prePath.elev);

      const {cw, category, direction, matchedPoints} = analysePath(path);
      path.properties.info.cw = cw;
      path.properties.info.category = category;
      path.properties.info.direction = direction;
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
  getRouteInstance
}


