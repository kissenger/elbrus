const expose = require('threads/worker').expose;
const gpxRead = require('../src/gpx-read-write').gpxRead;
const getRouteInstance = require('../src/app-functions').getRouteInstance;

const workerFunctions = {
  
  lngLatToMongo: async (initObj) => {
    const routeInstance = await getRouteInstance(initObj.name, initObj.description, initbbj.coords, initObj.elev);
    return routeInstance.asMongoObject('1234', 'kiss', false);
  },
  gpxToMongo: async (buffStr) => {
    const pathFromGPX = gpxRead(buffStr);
    const routeInstance = await getRouteInstance(pathFromGPX.name, null, pathFromGPX.lngLat, pathFromGPX.elev);
    return routeInstance.asMongoObject('1234', 'kiss', false);
  }
};

expose(workerFunctions);