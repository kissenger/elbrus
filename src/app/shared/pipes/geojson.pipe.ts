import { Pipe, PipeTransform } from '@angular/core';
import { TsFeatureCollection, TsFeature, TsPosition, TsPoint, TsLineString, TsCoordinate } from 'src/app/shared/interfaces';

@Pipe({
  name: 'geojson'
})


/**
 * Converts an array of points into a geoJson object returns empty geojson if coords is null or []
 * If an array of properties is defined it should be the same length at the coords array
 * Properties will be added to each point
 */

export class GeoJsonPipe implements PipeTransform {

  transform(coords: Array<TsPosition>, type: 'Point' | 'LineString', properties?: Array<Object>): TsFeatureCollection {

    if ( properties ) {
      if ( coords.length !== properties.length ) {
        throw new Error('Labels array not of same length as coords array');
      }
    }

    if ( type === 'Point' ) {

      /**
       * Creates a geoJson FeatureCollection for each point in the provided coords array
       * Places an id on each point, incrementally numbered from 0
       * Places 'start' as title on the first point, 'end' on the last point, and nothing on the other points
       */
      let pointFeatures: any;

      if (coords) {
        pointFeatures = coords.map( (coord, index) => getPointFeature(coord, `${index}`, properties ? properties[index] : null ) );
      } else {
        pointFeatures =  getPointFeature([], '0', {});
      }

      return getFeatureCollection(pointFeatures);

    } else if ( type === 'LineString' ) {

      /**
       * Creates a geoJson FeatureCollection with a single LineString feature
       */

      return getFeatureCollection([getLineStringFeature(coords)]);

    }


    function getFeatureCollection(features: Array<TsFeature>) {

      return <TsFeatureCollection>{
        type: 'FeatureCollection',
        features: features
      };

    }

    function getPointFeature(point: TsPosition | [], pointId: string, props?: {} ) {

      const feature =  <TsFeature> {
        type: 'Feature',
        id: pointId,
        properties: {
          ...props
        },
        geometry: <TsPoint>{
          type: 'Point',
          coordinates: point
        }
      };

      // if (text) {
      //   feature.properties = {title: text};
      // }

      return feature;
    }


    function getLineStringFeature(points: Array<TsPosition>) {

      const feature =  <TsFeature> {
        type: 'Feature',
        geometry: <TsLineString>{
          type: 'LineString',
          coordinates: points
        }
      };

      return feature;
    }

  }
}
