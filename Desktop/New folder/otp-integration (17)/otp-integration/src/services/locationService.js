require('dotenv').config();

async function getnearbyplaces( data ){
    try {
      const response = await fetch(`${process.env.GOOGLE_MAPS_BASE_URL}/v1/places:searchNearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'places.displayName'
        },
        body: JSON.stringify(data)
      });
      return response.json();
    } catch (error) {
        throw error;
    }
};

async function getDirections( data ) {
    const apiKey = process.env.OLA_MAPS_API_KEY;
    let url = `${process.env.OLA_MAPS_BASE_URL}routing/v1/directions?origin=${data.origin}&destination=${data.destination}&api_key=${apiKey}`;
    if( data.waypoints) {
        url = `${process.env.OLA_MAPS_BASE_URL}routing/v1/directions?origin=${data.origin}&destination=${data.destination}&waypoints=${data.waypoints}&api_key=${apiKey}`;
    }
    const options = {
      method: 'POST',
      headers: {
        'X-Request-Id': `${process.env.OLA_REQUEST_ID}`,
      },
    };
    try {
      const response = await fetch(url, options);
      return response.json();
    } catch (error) {
        throw error;
    }
};

async function olaDistanceMatrix( data ) {
  const apiKey = process.env.OLA_MAPS_API_KEY;
  const mode = 'driving';
  const url = `${process.env.OLA_MAPS_BASE_URL}routing/v1/distanceMatrix?origins=${data.origins}&destinations=${data.destinations}&mode=${mode}&api_key=${apiKey}`;
  const options = {
    method: 'GET',
    headers: {
      'X-Request-Id': `${process.env.OLA_REQUEST_ID}`,
    },
  };
  try {
    const response = await fetch(url, options);
    return response.json();
  } catch (error) {
      throw error;
  }
};

async function olaRouteOptimizer(data) {
  const apiKey = process.env.OLA_MAPS_API_KEY;
  const queryParams = {
      locations: data,
      source: 'first',
      destination: 'last',
      round_trip: false,
      mode: 'driving',
      steps: false,
      overview: 'full',
      language: 'en',
      traffic_metadata: false,
  }
  const url = `${process.env.OLA_MAPS_BASE_URL}routing/v1/routeOptimizer?locations=${queryParams.locations}&source=${queryParams.source}&destination=${queryParams.destination}&round_trip=${queryParams.round_trip}&mode=${queryParams.mode}&steps=${queryParams.steps}&overview=${queryParams.overview}&language=en&traffic_metadata=${false}&api_key=${apiKey}`
  const options = {
    method: 'POST',
    headers: {
      'X-Request-Id': `${process.env.OLA_REQUEST_ID}`,
    },
  };
  try {
    const response = await fetch(url, options);
    return response.json();
  } catch (error) {
      throw error;
  }
}; 

module.exports = {
    getnearbyplaces,
    getDirections,
    olaDistanceMatrix,
    olaRouteOptimizer
};