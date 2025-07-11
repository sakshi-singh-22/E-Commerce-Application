const mongoose = require("mongoose");
const { getnearbyplaces, getDirections } = require('../services/locationService.js');


const nearbySuggestion = async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        const data = {
            includedTypes: ["restaurant"],
            maxResultCount: 10,
            locationRestriction: {
                circle: {
                    center: {
                        latitude,
                        longitude
                    },
                    radius: 500.0
                }
            }
        };
        const Responsedata = await getnearbyplaces(data);
        res.status(201).json({ message: Responsedata.places });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// function calculateArrivalTime(duration) {

//     const currentTime = Date.now();
//     const arrivalTime = currentTime + duration;
//     const arrivalDate = new Date(arrivalTime);
//     const formattedArrivalTime = arrivalDate.toLocaleTimeString();

//     return formattedArrivalTime;
// }

// const distanceCal = async (req, res) => {
//     try {
//         const { origin, destination } = req.body;
//         const data = {
//             origin: `${origin.latitude},${origin.longitude}`, //lat,long
//             destination: `${destination.latitude},${destination.longitude}` //lat,long
//         };
//         const responseData = await getDirections(data);
//         const durationInMillisecond = responseData.routes[0].legs[0].duration * 1000
//         const arrivalTime = calculateArrivalTime(durationInMillisecond)

//         res.status(201).json({
//             distance: `${responseData.routes[0].legs[0].readable_distance} km`,
//             duration: responseData.routes[0].legs[0].readable_duration,
//             arrivalTime: arrivalTime
//         });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };

// const distanceCalWithWaypoints = async (req, res) => {

//     function convertWaypointsToString(waypoints) {
//         return waypoints.map(waypoint => `${waypoint.latitude},${waypoint.longitude}`).join('|');
//     }

//     try {
//         const { origin, destination, waypoints } = req.body;
//         const waypointsString = convertWaypointsToString(waypoints)

//         const data = {
//             origin: `${origin.latitude},${origin.longitude}`, //lat,long
//             destination: `${destination.latitude},${destination.longitude}`, //lat,long
//             waypoints: `${waypointsString}` //lat,long
//         };

//         const responseData = await getDirections(data);

//         let totalDistance = 0;
//         let totalDuration = 0;
//         let legsArray = responseData.routes[0].legs.map(
//             leg => ({
//                 distance: leg.readable_distance, 
//                 duration: leg.readable_duration
//             })            
//         )

//         responseData.routes.forEach(route => {
//             route.legs.forEach(leg => {
//                 totalDistance += leg.distance;
//                 totalDuration += leg.duration;
//             });
//         });
//         const totalHours = Math.floor(totalDuration / 3600);
//         const totalMinutes = Math.floor((totalDuration % 3600) / 60);

//         const durationInMillisecond = totalDuration*1000 + 120000 // 2 mins as buffer
//         const arrivalTime = calculateArrivalTime(durationInMillisecond)

//         res.status(201).json({
//             totaldistance: `${totalDistance / 1000} km`,
//             totalDuration: `${totalHours} hours ${totalMinutes} minutes`,
//             legs:legsArray,
//             estimatedArrivalTime: arrivalTime
//         });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };

module.exports = {
    nearbySuggestion,
};