const {getDirections, olaDistanceMatrix, olaRouteOptimizer}  = require('../services/locationService')
const User = require("../model/authmodel"); 
const ServiceAreaLocation = require('../model/serviceAreaLocationModel');

function calculateArrivalTime(duration) {

    const currentTime = Date.now();
    const arrivalTime = currentTime + duration;
    const arrivalDate = new Date(arrivalTime);
    const formattedArrivalTime = arrivalDate.toLocaleTimeString();

    return formattedArrivalTime;
};

async function distanceCal( data ) { 
    const { origin, destination } = data;
    if ( !origin || !destination ) {
            return { message: 'origin and destination is missing' }
    }
    try {     
        const data = {
            origin: `${origin.latitude},${origin.longitude}`, //lat,long
            destination: `${destination.latitude},${destination.longitude}` //lat,long
        };
        const responseData = await getDirections(data);
        const durationInMillisecond = responseData.routes[0].legs[0].duration * 1000
        const arrivalTime = calculateArrivalTime(durationInMillisecond)
        
        return {
            from: responseData.routes[0].legs[0].start_address,
            to:  responseData.routes[0].legs[0].end_address,
            distance: `${responseData.routes[0].legs[0].readable_distance} km`,
            duration: responseData.routes[0].legs[0].readable_duration,
            arrivalTime: arrivalTime
        }
    } catch (error) {
        return {error: error.message }
    }
};

const distanceCalWithWaypoints = async ( data ) => {

    function convertWaypointsToString(waypoints) {
        return waypoints.map(waypoint => `${waypoint.latitude},${waypoint.longitude}`).join('|');
    }

    try {
        const { origin, destination, waypoints } = data;
        const waypointsString = convertWaypointsToString(waypoints)

        const Data = {
            origin: `${origin.latitude},${origin.longitude}`, //lat,long
            destination: `${destination.latitude},${destination.longitude}`, //lat,long
            waypoints: `${waypointsString}` //lat,long
        };

        const responseData = await getDirections(Data);

        let totalDistance = 0;
        let totalDuration = 0;
        let legsArray = responseData.routes[0].legs.map(
            leg => ({
                from: leg.start_address,
                to: leg.end_address,
                distance: leg.readable_distance, 
                duration: leg.readable_duration
            })            
        )

        responseData.routes.forEach(route => {
            route.legs.forEach(leg => {
                totalDistance += leg.distance;
                totalDuration += leg.duration;
            });
        });
        const totalHours = Math.floor(totalDuration / 3600);
        const totalMinutes = Math.floor((totalDuration % 3600) / 60);

        const durationInMillisecond = totalDuration*1000 + 120000 // 2 mins as buffer
        const arrivalTime = calculateArrivalTime(durationInMillisecond)

        return {
            totaldistanceInKm: totalDistance / 1000,
            totaldistance: `${totalDistance / 1000} km`,
            totalDuration: `${totalHours} hours ${totalMinutes} minutes`,
            legs:legsArray,
            estimatedArrivalTime: arrivalTime
        }
        
    } catch (error) {
        return { error: error.message }
    }
};

async function DistanceMatrix( origins, destinations ) {
    const data = {
        origins: origins,
        destinations: destinations
    };
    try {
        const responseData = await olaDistanceMatrix(data)
        return responseData
    } catch (error) {
        return {error: error.message }
    }
};

async function findNearbySavedLocation(userId, currentLocation) {

    try {  
        const isNearSavedLocation = await User.findOne({
            _id: userId,
            location: {
                $elemMatch: {
                    geoCoordes: {
                        $geoWithin: {
                            $centerSphere: [currentLocation.coordinates, 0.124274 / 3963.2] // In miles
                        }
                    }
                }
            }
        }, {
            location: {
                $elemMatch: {
                    geoCoordes: {
                        $geoWithin: {
                            $centerSphere: [currentLocation.coordinates, 0.124274 / 3963.2] // In miles
                        }
                    }
                }
            }
        });
        
        return isNearSavedLocation.location.length > 0 ? isNearSavedLocation.location[0] : null;

    } catch (error) {
        console.error(error.message);
        return null; 
    }
};

async function isLocInsideValidCluster(location) {

    const isLocInServiceAreaLoc = await ServiceAreaLocation.find({
        boundary:  {
              $geoIntersects: {
                  $geometry: location
              }
          }
      });
    
    if (isLocInServiceAreaLoc.length > 0) {
        const serviceArea = isLocInServiceAreaLoc[0]
        let foundCluster =  { serviceArea: serviceArea, cluster: null };
        let indexOfCluster = 0;
  
        for (const cluster of serviceArea.clusters) {
          const isGeoCoordsInCluster = await ServiceAreaLocation.findOne({
            _id: serviceArea._id,
            clusters: {
              $elemMatch: {
                _id: cluster._id,
                'boundary': {
                  $geoIntersects: {
                    $geometry: location
                  }
                }
              }
            }
          });
  
          if (isGeoCoordsInCluster) {
            foundCluster = { serviceArea: serviceArea, cluster: cluster.toObject(), indexOfCluster };
            break;
          }
          indexOfCluster = indexOfCluster + 1;
        };

        return foundCluster
    }

    return { serviceArea: null, cluster: null }
}

async function getRoute( data ) { 
    const { origin, destination } = data;
    if ( !origin || !destination ) {
            return { message: 'origin and destination is missing' }
    }
    try {     
        const data = {
            origin: `${origin.latitude},${origin.longitude}`, //lat,long
            destination: `${destination.latitude},${destination.longitude}` //lat,long
        };
        const responseData = await getDirections(data);
       
        return  responseData.routes[0].legs[0].steps
        
    } catch (error) {
        return {error: error.message }
    }
};

module.exports = { 
    distanceCal, 
    distanceCalWithWaypoints,
    findNearbySavedLocation,
    DistanceMatrix,
    isLocInsideValidCluster,
    getRoute
};