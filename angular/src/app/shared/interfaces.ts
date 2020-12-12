
// Define unit type for definition of user units
export interface TsUnits {
    distance: 'mi' | 'km';
    elevation: 'm' | 'ft';
}

export type TsCallingPageType = 'list' | 'create' | 'edit';
export interface TsCallingPage {
  callingPage: TsCallingPageType;
}

// export interface TsCallingPage {
//   callingPage: 'list' | 'create' | 'edit';
// }

// export type TsCallingPage = 'list' | 'create' | 'edit';
// exportInterface

/**
 * Map display options
 */
export interface TsPlotPathOptions {
    booResizeView?: boolean;
    booSaveToStore?: boolean;
    // booPlotMarkers?: boolean;
    booPlotPoints?: boolean;
    booEmit?: boolean;
}

export interface TsLineStyle {
    lineWidth?: number;
    lineColour?: string;
    lineOpacity?: number;
}

export interface TsMapView {
  centre: TsCoordinate;
  zoom: number;
}

/**
 * Used to populate list of paths
 */
export interface TsListItem {
  name: string;
  stats: TsPathStats;
  category: string;
  direction: string;
  pathType: string;
  startTime: string;
  creationDate: string;
  pathId: string;
  count: number;
  isElevations: boolean;
  isLong: boolean;
  isActive?: boolean;
  colour?: string;
}

export type TsListArray = TsListItem[];

/**
 * TsCoordinate is the standard means of using coordinate data within the app
 * The only exception is that geoJson coordinate is different; this is defined below
 * as TsPosition within the geoJSON definition
 */
export interface TsCoordinate {
  lat: number;
  lng: number;
  elev?: number;
  invalid?: boolean;
}

/**
 * Used for definition of tab names on side-panel
 */
export interface TsTab {
  active: boolean;
  name: string;
  component: any;
  title?: string;
  href?: string;
  disabled?: boolean;
}

export type TsTabsArray = TsTab[];

/**
 * Elevations
 */

export interface TsElevationQuery {
    options?: {
        interpolate?: boolean,
        writeResultsToFile?: boolean
    };
    coords: Array<TsCoordinate>;
}

export type TsElevationResults = TsCoordinate[];

export type TsSnapType = 'walking' | 'driving' | 'none';

// export interface TsSnapProfile {
//   snapProfile: 'walking' | 'driving' | 'none';
// }

/**
 * User details
 */
export interface TsUser {
  userName: string;
  homeLngLat?: TsCoordinate;
  isHomeLocSet?: boolean;
  email: string;
  units: TsUnits;
  password?: string;
  _id?: string;
}

/**
 * GeoJSON Definition
 * Largely stolen from here: ...\node_modules\@types\geojson\index.d.ts
 * But adapted to ensure we get geoJSON formed in the correct manner from the back-end
 * Also see spec: https://tools.ietf.org/html/rfc7946
 */

export interface TsFeatureCollection {
  type: 'FeatureCollection';
  features: TsFeature[];
  bbox?: TsBoundingBox;
  properties?: TsGeoJsonProperties;
}

export interface TsFeature {
  bbox?: TsBoundingBox;
  id?: string; // mapbox
  type: 'Feature';
  geometry: TsGeometry;
  // properties: TsGeoJsonProperties | TsMapboxProperties | null;
  properties: TsGeoJsonProperties | null;
}

export type TsGeometry = TsPoint | TsLineString;

export interface TsPoint {
  type: 'Point';
  coordinates: TsPosition;
}

export interface TsLineString {
  type: 'LineString';
  coordinates: TsPosition[];
}

export type TsPosition = [number, number];

/*minLng, minLat, maxLng, maxLat*/
export type TsBoundingBox = [number, number, number, number];
// export interface TsBoundingBoxObject {
//   minLat: number;
//   maxLat: number;
//   minLng: number;
//   maxLng: number;
// }

export interface TsGeoJsonProperties {
    pathId?: string;
    info?: TsInfo;
    params?: TsParams;
    stats?: TsPathStats;
    lineColour?: string;
    creationDate?: string;
    lastEditDate?: string;
    plotType?: string;
    userID?: string;
    latitude?: number;   // front need, used by map service when creating points geoJson
    matched?: boolean;
    title?: string;
}

export interface TsMapboxProperties {
  description?: string;
  title?: string;
} // mapbox labels}

export interface TsInfo {
    direction: string;
    category: string;
    nationalTrail: boolean;
    name: string;
    description: string;
    pathType: string;           // 'route' or 'track'
    startTime: string;
    isLong: boolean;
    isPublic: boolean;
    createdBy: string;
    isElevations: boolean;
}

export interface TsParams {
    elev: number[];
    time: number[];
    heartRate: number[];
    cadence: number[];
    cumDistance: number[];
    matchedPoints?: number[][]; /// used for debugging route algorthims on the back end
}

export interface TsPathStats {
    bbox: {
        minLng: number,
        minLat: number,
        maxLng: number,
        maxLat: number
    };
    nPoints: number;
    simplificationRatio: number;
    duration: number;
    distance: number;
    pace:  number;
    elevations: {
        ascent: number,
        descent: number,
        maxElev: number,
        minElev: number,
        lumpiness: number,
        distance: number,
        nPoints: number,
        badElevData?: boolean
    };
    p2p: {
        max: number,
        ave: number
    };
    movingStats: {
        movingTime: number,
        movingDist: number,
        movingPace: number,
    };
    hills: TsHill[];
    splits: {
        kmSplits: number[][],
        mileSplits: number[][]
    };
}


// interface TsHills {

//   dHeight?: number;
//   dDist?: number;
//   dTime?: number;
//   pace?: number;
//   ascRate?: number;
//   gradient?: {
//       max?: number;
//       ave?: number
//   };
// }

interface TsHill {
  dHeight: number;
  dDist: number;
  startDist: number;
  startPoint: number;
  endPoint: number;
  dTime: number;
  pace: number;
  ascRate: number;
  maxGrad: number;
  aveGrad: number;
}

