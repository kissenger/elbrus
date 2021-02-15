'use strict';
import { TsLineStyle, TsFeatureCollection, TsPathStats, TsGeoJsonProperties, TsUnits, TsCoordinate, TsMapView } from 'src/app/shared/interfaces';

export const KM_TO_MILE = 0.6213711922;
export const M_TO_FT = 3.28084;
export const EXPORT_FILE_SIZE_LIMIT = 100000;
export const LONG_PATH_THRESHOLD = 1000;

// bootstrap responsive breakpoints
// https://getbootstrap.com/docs/5.0/layout/breakpoints/
export const BREAKPOINTS = {
  SM: 576,
  MD: 768,
  LG: 992,
  XL: 1200,
  XXL: 1400
};

// lineStyles are defined here and on geoJSON - when specified locally they will override the geoJSON lineStyle
// export const overlayLineStyle = {lineWidth: 2, lineColour: 'blue', lineOpacity: 0.3};
export const routeLineStyle: TsLineStyle = {lineWidth: 4, lineColour: 'red', lineOpacity: 0.5};
export const overlayLineStyle: TsLineStyle = {lineWidth: 3, lineColour: 'red', lineOpacity: 0.3};
export const createRouteLineStyle: TsLineStyle = {lineWidth: 2, lineColour: 'red', lineOpacity: 1.0};
// export const routeReviewLineStyle: TsLineStyle = {lineWidth: 2, lineColour: 'red', lineOpacity: 1.0};

export const defaultUnits: TsUnits = {
  distance: 'mi',
  elevation: 'm'
};

export const defaultMapView: TsMapView = {
    centre: {lat: 54.5, lng: -2.5},
    zoom: 4.8
};


export const lineColours = [
  '#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FF00', '#00FF80', '#00FFFF', '#0080FF', '#0000FF', '#8000FF', '#FF00FF', '#FF0080'
];

// used by props below, but also called in by panel details
export const emptyStats: TsPathStats = {
  bbox: {
    minLng: 0,
    minLat: 0,
    maxLng: 0,
    maxLat: 0
  },
  nPoints: 0,
  simplificationRatio: 0,
  duration: 0,
  distance: 0,
  pace:  0,
  elevations: {
    ascent: 0,
    descent: 0,
    maxElev: 0,
    minElev: 0,
    lumpiness: 0,
    distance: 0,
    nPoints: 0,
    badElevData: false
  },
  p2p: {
    max: 0,
    ave: 0
  },
  movingStats: {
    movingTime: 0,
    movingDist: 0,
    movingPace: 0,
  },
  hills: [],
  splits: {
    kmSplits: [],
    mileSplits: []
  }
};




const emptyProps: TsGeoJsonProperties = {
  pathId: '0000',
  info: {
    direction: '',
    category: '',
    nationalTrail: false,
    name: '',
    description: '',
    pathType: '',
    startTime: '',
    isLong: false,
    isPublic: false,
    createdBy: '',
    isElevations: false
  },
  params: {
    elev: [],
    time: [],
    heartRate: [],
    cadence: [],
    cumDistance: []
  },
  stats: emptyStats,
  lineColour: '',
  creationDate: '',
  lastEditDate: '',
  plotType: '',
  userID: ''
};

export const emptyGeoJson: TsFeatureCollection = {
  bbox: null,
  type: 'FeatureCollection',
  features: [{
      // id: '0000',
      // bbox: null,
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: []
    },
    properties: emptyProps
  }],
  properties: emptyProps
};
