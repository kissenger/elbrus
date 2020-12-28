// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  PROTOCOL: 'http',
  FRONTEND_URL: 'localhost:4200',
  BACKEND_URL: 'localhost:3000/api',
  MAPBOX_TOKEN: 'pk.eyJ1Ijoia2lzc2VuZ2VyIiwiYSI6ImNrMWYyaWZldjBtNXYzaHFtb3djaDJobmUifQ.ATRTeTi2mygBXAoXd42KSw',
  MAPBOX_STYLE_TERRAIN: 'mapbox://styles/kissenger/ckhnuh97p166719qqvqcdih0c',
  MAPBOX_STYLE_SATELLITE: 'mapbox://styles/kissenger/ckj91j8yn6gqq19l9vo529tix'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
