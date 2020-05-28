const expose = require('threads/worker').expose;
const gpxRead = require('./gpx-read-write').gpxRead;
const getRouteInstance = require('./path-helpers').getRouteInstance;

const workerFunctions = {
  gpxRead: async (buffStr) => {
    return gpxRead(buffStr);
  },
  getPath: async (gpxPath) => {
    return await getRouteInstance(gpxPath.name, gpxPath.description, gpxPath.lngLat, gpxPath.elev);
  }
};

expose(workerFunctions);