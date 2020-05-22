
// Define unit type for definition of user units
export interface TsUnits {
    distance: 'mi' | 'km';
    elevation: 'm' | 'ft';
}

/**
 * Map display options
 */
export interface TsPlotPathOptions {
    booResizeView?: boolean;
    booSaveToStore?: boolean;
    booPlotMarkers?: boolean;
}

export interface TsLineStyle {
    lineWidth?: number;
    lineColour?: string;
    lineOpacity?: number;
}

/**
 * Used to populate list of paths
 */
interface TsListItem {
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
interface TsTab {
  active: boolean;
  name: string;
  component: any;
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
  properties?: TsProperties;
}

export interface TsFeature {
  bbox?: TsBoundingBox;
  type: 'Feature';
  geometry: TsGeometry;
  properties: TsProperties | null;
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
export type TsBoundingBox = [number, number, number, number];

export interface TsProperties {
    pathId: string;
    info: TsInfo;
    params: TsParams;
    stats: TsPathStats;
    colour?: string;
    creationDate?: string;
    lastEditDate?: string;
    plotType?: string;
    userID?: string;
    latitude?: number;   // front need, used by map service when creating points geoJson
    matched?: boolean;
}

export interface TsInfo {
    direction: string;
    category: string;
    nationalTrail: boolean;
    name: string;
    description: string;
    pathType: string;           // 'route' or 'track'
    startTime: string;
    isLong: boolean;
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

