import { Pipe, PipeTransform } from '@angular/core';
import { TsFeatureCollection, TsFeature, TsPosition, TsPoint, TsLineString } from 'src/app/shared/interfaces';

@Pipe({
  name: 'geojson'
})


/**
 * Converts an array of points into a geoJson object
 */

export class GeoJsonPipe implements PipeTransform {

  transform(coords: Array<TsPosition>, type: 'Point' | 'LineString', labels?: Array<string>): TsFeatureCollection {

    if ( labels ) {
      if ( coords.length !== labels.length ) {
        throw new Error('Labels array not of same length as coords array');
      }
      if ( type === 'LineString' ) {
        throw new Error('Labels array not expected for LineString geoJSON');
      }
    }

    if ( type === 'Point' ) {

      /**
       * Creates a geoJson FeatureCollection for each point in the provided coords array
       * Places an id on each point, incrementally numbered from 0
       * Places 'start' as title on the first point, 'end' on the last point, and nothing on the other points
       */
      let text: string;
      const pointFeatures = coords.map( (coord, index) => {
        if ( labels ) {
          text = labels[index];
        }
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
