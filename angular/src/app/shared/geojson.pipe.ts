import { Pipe, PipeTransform } from '@angular/core';
import { TsCoordinate, TsFeatureCollection, TsFeature, TsPosition, TsPoint, TsLineString } from './interfaces';

@Pipe({
  name: 'geojson'
})

export class GeoJsonPipe implements PipeTransform {


  transform(coords: Array<TsPosition>, type: 'Point' | 'LineString'): TsFeatureCollection {


    if ( type === 'Point' ) {

      /**
       * Creates a geoJson FeatureCollection for each point in the provided coords array
       * Places an id on each point, incrementally numbered from 0
       * Places 'start' as title on the first point, 'end' on the last point, and nothing on the other points
       */

      const pointFeatures = coords.map( (coord, index) => {
        const text = index === 0 ? 'start' : index === coords.length - 1 ? 'end' : null;
        return getPointFeature(coord, `${index}`, text);
      });

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

    function getPointFeature(point: TsPosition | [], pointId?: string, text?: string) {

      const feature =  <TsFeature> {
        type: 'Feature',
        id: pointId,
        geometry: <TsPoint>{
          type: 'Point',
          coordinates: point
        }
      };

      if (text) {
        feature.properties = {
          title: text
        };
      }

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
