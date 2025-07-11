const Driver = require("../../model/driverModel");
const Ride = require("../../model/Taxi/rideModel");
const User = require("../../model/authmodel");
const Vendor = require("../../model/vendorModel")
const TaxiServiceAreaLocation = require('../../model/Taxi/taxiServiceAreaModel');
const { distanceCal, getRoute } = require('../../utils/locationUtils'); // Import distanceCal function
const { error } = require("console");
const PickupLocation = require('../../model/Taxi/PickupLocationmodel'); // Import PickupLocation model
const DropLocation = require('../../model/Taxi/DropLocationmodel'); // Import DropLocation model

const addDropLocation = async (req, res) => {
    const { userId, dropLocation, pickupLocation } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Ensure dropLocation is in GeoJSON format
        const formattedDropLocation = {
            type: 'Point',
            coordinates: dropLocation.coordinates,
        };

        // Determine the pickup location (use provided one or fall back to currentLocation)
        let formattedPickupLocation;
        if (pickupLocation) {
            // If a manual pickup location is provided, format it as GeoJSON
            formattedPickupLocation = {
                type: 'Point',
                coordinates: pickupLocation.coordinates,
            };
        } else {
            // Use user's current location as the pickup location
            formattedPickupLocation = user.currentLocation;
        }

        // Check if pickup location already exists for the user
        let userPickupLocations = await PickupLocation.findOne({ userId });
        if (!userPickupLocations) {
            userPickupLocations = new PickupLocation({ userId, locations: [] });
        }

        const pickupExists = userPickupLocations.locations.some(
            loc => loc.coordinates[0] === formattedPickupLocation.coordinates[0] &&
                   loc.coordinates[1] === formattedPickupLocation.coordinates[1]
        );

        if (!pickupExists) {
            userPickupLocations.locations.push(formattedPickupLocation);
            await userPickupLocations.save();
        }

        // Check if drop location already exists for the user
        let userDropLocations = await DropLocation.findOne({ userId });
        if (!userDropLocations) {
            userDropLocations = new DropLocation({ userId, locations: [] });
        }

        const dropExists = userDropLocations.locations.some(
            loc => loc.coordinates[0] === formattedDropLocation.coordinates[0] &&
                   loc.coordinates[1] === formattedDropLocation.coordinates[1]
        );

        if (!dropExists) {
            userDropLocations.locations.push(formattedDropLocation);
            await userDropLocations.save();
        }

        // Calculate the distance between pickup and drop location
        const origin = formattedPickupLocation.coordinates;
        const destination = formattedDropLocation.coordinates;

        const distanceData = await distanceCal({
            origin: { latitude: origin[1], longitude: origin[0] },
            destination: { latitude: destination[1], longitude: destination[0] },
        });

        if (distanceData.error) {
            return res.status(400).json({ message: 'Failed to calculate distance.', distanceData });
        }

        const distanceInKm = parseFloat(distanceData.distance.split(" ")[0]);
        const duration = distanceData.duration; // Get travel time

        // Save the drop location to the user document (if needed)
        user.dropLocation = formattedDropLocation;
        await user.save();

        // Create a ride with status 'pending'
        const newRide = new Ride({
            user: userId,
            pickupLocation: formattedPickupLocation,
            dropLocation: formattedDropLocation,
            vehicleType: null,
            OTP: user.OTP,
            distance: distanceInKm,
            price: 0,
            status: 'pending', // Set status to pending initially
        });

        await newRide.save();

        return res.status(200).json({
            message: 'Drop location added',
            pickupLocation: formattedPickupLocation, // Show pickup location (manual or current)
            dropLocation: formattedDropLocation,    // Show drop location
            distanceData: { distance: distanceInKm, duration }, // Show distance and duration
            rideId: newRide._id,
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error adding drop location', error: error.message });
    }
};

const getUserLocations = async (req, res) => {
    const { userId } = req.params;

    try {
        // Find pickup locations for the user
        const userPickupLocations = await PickupLocation.findOne({ userId });
        const pickupLocations = userPickupLocations ? userPickupLocations.locations : [];

        // Find drop locations for the user
        const userDropLocations = await DropLocation.findOne({ userId });
        const dropLocations = userDropLocations ? userDropLocations.locations : [];

        return res.status(200).json({
            message: 'User locations retrieved successfully',
            pickupLocations,
            dropLocations,
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error retrieving locations', error: error.message });
    }
};

const fetchVehicleETA = async (origin, destination, travelMode) => {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("X-Goog-Api-Key", "AIzaSyCUDY0bL-0_srhNL4JROK0ZwO2iNnEpwnM");
    myHeaders.append("X-Goog-FieldMask", "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline");

    const raw = JSON.stringify({
        "origin": {
            "location": {
                "latLng": {
                    "latitude": origin.latitude,
                    "longitude": origin.longitude
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": destination.latitude,
                    "longitude": destination.longitude
                }
            }
        },
        "travelMode": travelMode,
        "routingPreference": "TRAFFIC_AWARE",
        "computeAlternativeRoutes": false,
        "routeModifiers": {
            "avoidTolls": false,
            "avoidHighways": false,
            "avoidFerries": false
        },
        "languageCode": "en-US",
        "units": "IMPERIAL"
    });

    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", requestOptions);
    const result = await response.json();
    
    console.log(result); // Log the full API response

    // Check if there are routes and return duration, otherwise return 0
    if (result.routes && result.routes.length > 0) {
        // Parse the duration from the string and convert to seconds
        const durationString = result.routes[0].duration;
        const durationSeconds = parseInt(durationString); // Convert string to integer
        return durationSeconds; // Return duration in seconds
    }
    
    return 0; // No valid routes found
};


const showVehicleOptions = async (req, res) => {
    const { rideId } = req.body;

    try {
        const ride = await Ride.findById(rideId);
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        const distanceInKm = ride.distance; // Already stored in ride
        const origin = { latitude: 17.51511, longitude: 78.397465 }; // Replace with ride origin coordinates
        const destination = { latitude: 17.496999, longitude: 78.393695 }; // Replace with ride destination coordinates

        // Log origin and destination for debugging
        console.log('Origin:', origin);
        console.log('Destination:', destination);

        const vehicleOptions = [
            { type: 'cab', pricePerKm: 10, travelMode: "DRIVE" },
            { type: 'bike', pricePerKm: 5, travelMode: "DRIVE" },
            { type: 'auto', pricePerKm: 8, travelMode: "TWO_WHEELER" },
        ];

        const calculatedOptions = await Promise.all(vehicleOptions.map(async option => {
            const price = option.pricePerKm * distanceInKm;

            // Get ETA from Google Routes API
            const etaSeconds = await fetchVehicleETA(origin, destination, option.travelMode);
            const etaMinutes = etaSeconds / 60;

            // Handle case where etaMinutes might be 0 or NaN
            const formatTime = (minutes) => {
                if (isNaN(minutes) || minutes <= 0) {
                    return "0 hours 0 minutes"; // Default to 0 if NaN or less than or equal to 0
                }
                const hours = Math.floor(minutes / 60);
                const remainingMinutes = Math.floor(minutes % 60);
                return `${hours} hours ${remainingMinutes} minutes`;
            };

            return {
                vehicleType: option.type,
                price: price.toFixed(2),
                estimatedTime: formatTime(etaMinutes),
                distance: `${distanceInKm.toFixed(2)} km`
            };
        }));

        return res.status(200).json({
            message: 'Vehicle options calculated',
            vehicleOptions: calculatedOptions,
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error calculating vehicle options', error: error.message });
    }
};



// Create Trip and Assign Driver
const createRide = async (req, res) => {
    const { userId, rideId, vehicleType } = req.body;

    try {
        const ride = await Ride.findById(rideId);
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // Check if vehicle type is provided
        if (!vehicleType) {
            return res.status(400).json({ message: 'Vehicle type is required' });
        }

        const distanceInKm = ride.distance;
        const vehiclePricing = {
            cab: { pricePerKm: 10, speed: 70 },
            bike: { pricePerKm: 5, speed: 60 },
            auto: { pricePerKm: 8, speed: 50 },
        };

        const selectedVehicle = vehiclePricing[vehicleType];
        if (!selectedVehicle) {
            return res.status(400).json({ message: 'Invalid vehicle type' });
        }

        // Calculate price and estimated time
        const price = (selectedVehicle.pricePerKm * distanceInKm).toFixed(2);
        const timeInMinutes = (distanceInKm / selectedVehicle.speed) * 60;

        // Helper function to format time into "x hours y minutes"
        const formatTime = (minutes) => {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = Math.floor(minutes % 60);
            return `${hours} hours ${remainingMinutes} minutes`;
        };

        const formattedTime = formatTime(timeInMinutes); // Format the time

        // Update ride status, vehicle type, price, and estimated time
        ride.status = 'searching for driver';
        ride.vehicleType = vehicleType;
        ride.price = price;
        ride.estimatedTime = formattedTime; // Include estimated time in the ride
        await ride.save();

        return res.status(200).json({
            message: 'Trip created successfully, searching for driver',
            ride: {
                ...ride._doc, // Include all ride details
                price: price,
                estimatedTime: formattedTime, // Include formatted time in the response
                distance: `${distanceInKm.toFixed(2)} km` // Include formatted distance
            }
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error creating trip', error: error.message });
    }
};

// Function to calculate distance and ETA
const calculateDistanceETA = async (driverLocation, pickupLocation) => {
    try {
        const driverCoordinates = driverLocation.coordinates;
        const pickupCoordinates = pickupLocation.coordinates;
  
        // Call your distance calculation service
        const distanceData = await distanceCal({
            origin: { latitude: driverCoordinates[1], longitude: driverCoordinates[0] },
            destination: { latitude: pickupCoordinates[1], longitude: pickupCoordinates[0] },
        });
  
        if (distanceData.error) {
            return { error: 'Failed to calculate distance and ETA.' };
        }
  
        const distanceInKm = parseFloat(distanceData.distance.split(" ")[0]); // Distance in kilometers
        const eta = distanceData.duration; // Estimated time of arrival
  
        return { distance: distanceInKm, eta }; // Return the distance and ETA
    } catch (error) {
        console.error('Error calculating distance and ETA:', error.message);
        return { error: 'Server error while calculating distance and ETA.' };
    }
  };
  

  const assignRideToDriver = async (req, res) => {
    const { vehicleType, userPickupLocation, rideId } = req.body;

    if (!vehicleType || !userPickupLocation || !rideId) {
        return res.status(400).json({ message: 'Vehicle type, userPickupLocation or rideId is missing' });
    }

    const MAX_DISTANCE = 100000; // In meters

    try {
        const availableDrivers = await Driver.aggregate([
            {
                $geoNear: {
                    near: userPickupLocation,
                    distanceField: "distance",
                    maxDistance: MAX_DISTANCE,
                    spherical: true
                }
            },
            {
                $match: {
                    status: "Available",
                    vehicleType: vehicleType
                }
            }
        ]);

        if (!availableDrivers.length) {
            return res.status(404).json({ message: 'No available drivers found', success: false });
        }

        let rideAssigned = false;
        let distanceToPickup = null;

        for (const availableDriver of availableDrivers) {
            console.log(`Notifying Driver: ${availableDriver._id}`);

            // Wait for 30 seconds before checking the ride status
            await new Promise(resolve => setTimeout(resolve, 30000));

            const ride = await Ride.findById(rideId);

            if (ride && ride.status === "accepted") {
                console.log(`Driver ${availableDriver.name} accepted the ride.`);
                rideAssigned = true;
                ride.driver = availableDriver._id;
                await ride.save();

                const assignedDriver = await Driver.findById(availableDriver._id);
                assignedDriver.status = "On a Trip";
                await assignedDriver.save();

                // Calculate distance to pickup
                const driverLocation = assignedDriver.currentLocation; // Assuming driver location is stored in currentLocation
                const pickupLocation = ride.pickupLocation;

                const { distance } = await calculateDistanceETA(driverLocation, pickupLocation);
                distanceToPickup = distance; // Store distance to pickup

                break;
            } else {
                console.log(`Driver ${availableDriver.name} did not accept the ride.`);
            }
        }

        if (!rideAssigned) {
            console.log("No drivers accepted the ride.");
            return res.status(200).json({ message: 'No driver accepted the ride', success: false });
        }
        
        return res.status(200).json({
            success: true,
            distanceToPickup: distanceToPickup, // Return distance to pickup
            pickupLocation: userPickupLocation.coordinates, // Include user pickup coordinates
            driverLocation: availableDrivers[0].currentLocation.coordinates // Include driver coordinates
        });
    } catch (error) {
        console.error(`Error assigning ride to driver: ${error.message}`);
        return res.status(500).json({ message: 'Server error', success: false });
    }
};


//driver
const acceptRide = async (req, res) => {
    const { rideId } = req.params;
    const { driverId } = req.body;

    try {
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found', success: false });
        }
       
        const ride = await Ride.findById(rideId);
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found', success: false });
        }        
        
        ride.driver = driverId; // Assuming the field is 'driver' in the ride schema
        ride.status = 'accepted';
        await ride.save();

        // Calculate distance to pickup
        const driverLocation = driver.currentLocation; // Assuming driver location is stored in currentLocation
        const pickupLocation = ride.pickupLocation;

        const { distance } = await calculateDistanceETA(driverLocation, pickupLocation);

        return res.status(200).json({
            message: 'Ride accepted',
            success: true,
            distanceToPickup: distance, // Include the calculated distance
            pickupLocation: pickupLocation.coordinates, // Include pickup location coordinates
            driverLocation: driverLocation.coordinates // Include driver location coordinates
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', success: false });
    }
};

const startRide = async (req, res) => {
  const { rideId } = req.params
  const { driverId, OTP } = req.body

  try {
      const driver = await Driver.findById(driverId);
      if (!driver) {
          return res.status(404).json({ message: 'Driver not found', success: false });
      }
     
      const ride = await Ride.findById(rideId);
      if (!ride) {
          return res.status(404).json({ message: 'Ride not found', success: false });
      }        
      
      if(!(ride.OTP === OTP)){
          return res.status(400).json({ message: 'invalid OTP', success: false });
      }

      ride.status = 'onTrip';
      ride.setStartedAt()
      await ride.save();

      return res.status(200).json({ message: 'Ride started', data: ride, success: true });
  } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error', success: false  });
  }
};
const haversineDistance = (coords1, coords2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371; // Radius of the Earth in kilometers

    const lat1 = toRad(coords1[1]);
    const lon1 = toRad(coords1[0]);
    const lat2 = toRad(coords2[1]);
    const lon2 = toRad(coords2[0]);

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers

    return distance * 1000; // Convert to meters
};
const calculatePrice = (distance) => {
    const baseFare = 20; // Base fare for the ride
    const perKmRate = 10; // Rate per kilometer

    // Calculate total price based on distance
    let totalPrice = baseFare + (perKmRate * (distance /1000)); // distance in km

    return totalPrice;
};
const endRide = async (req, res) => {
    const { rideId } = req.params;
    const { driverId, driverCurrentLocation } = req.body;

    try {
        // Find the driver
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found', success: false });
        }

        // Find the ride
        const ride = await Ride.findById(rideId);
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found', success: false });
        }

        // Get the drop location from the ride
        const dropLocation = ride.dropLocation.coordinates;

        // Calculate the distance from the driver to the drop location
        const driverDistanceToDrop = haversineDistance(driverCurrentLocation, dropLocation);
        
        // Set a 100-meter threshold
        const radiusThreshold = 100;

        // Check if user confirmation is needed
        if (!ride.userConfirmation) {
            // Check if the driver is within 100 meters of the drop location
            if (driverDistanceToDrop >= radiusThreshold) {
                // If outside range, ask for user confirmation
                return res.status(200).json({
                    message: 'User confirmation required to end ride. Driver is far from the drop location.',
                    needConfirmation: true,
                    rideId: ride._id // Send ride ID for confirmation later
                });
            }
        }

        // If the user confirms or the driver is within range, end the ride
        ride.userConfirmation = true; // Set confirmation
        ride.status = 'completed'; // Update ride status
        ride.setEndedAt(); // Set end time

        // Determine final drop location based on driver's current location
        let finalDropLocation = driverCurrentLocation;
        if (driverDistanceToDrop < radiusThreshold) {
            finalDropLocation = dropLocation; // Use drop location if far
        }

        // Update final drop location in the ride
        ride.finalDropLocation = {
            type: 'Point',
            coordinates: finalDropLocation
        };

        // Calculate the distance for pricing
        const finalDistance = haversineDistance(ride.pickupLocation.coordinates, ride.finalDropLocation.coordinates);
       ride.distance = finalDistance/1000; // Update distance
        ride.price = calculatePrice(finalDistance); // Calculate and update price

       

        await ride.save(); // Save the updated ride

        return res.status(200).json({ message: 'Ride ended successfully', data: ride, success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', success: false });
    }
};

// User confirmation function remains the same
const confirmEndRide = async (req, res) => {
    const { rideId } = req.params;

    try {
        // Find the ride
        const ride = await Ride.findById(rideId);
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found', success: false });
        }

        // Check if the user has already confirmed the ride end
        if (ride.userConfirmation) {
            return res.status(400).json({ message: 'Ride has already been confirmed as ended', success: false });
        }

        // Confirm the ride end
        ride.userConfirmation = true; // Update confirmation status
        ride.status = 'completed'; // Update ride status
        ride.setEndedAt(); // Set endedAt time
        await ride.save(); // Save the ride state

        return res.status(200).json({ message: 'Ride ended with user confirmation', data: ride, success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', success: false });
    }
};

//user
const cancelRide = async (req, res) => {
    const { rideId } = req.params;
    const { userId, acceptedDriverLocation, driverCurrentLocation } = req.body; // Add new parameters

    // Define the rate per kilometer (e.g., ₹5 per km)
    const ratePerKm = 5;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found', success: false });
        }

        const ride = await Ride.findById(rideId);
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found', success: false });
        }

        const driver = await Driver.findById(ride.driver);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found', success: false });
        }

        // Handle ride status logic
        if (ride.status === 'searching for driver') {
            driver.status = "Available";
            await driver.save();
            ride.status = 'canceled';
            await ride.save();
            return res.status(200).json({ message: 'Ride canceled', data: ride, success: true });
        } else if (ride.status === "accepted") {
            // Ensure acceptedDriverLocation and driverCurrentLocation are defined and have coordinates
            if (!acceptedDriverLocation || !acceptedDriverLocation.coordinates ||
                !driverCurrentLocation || !driverCurrentLocation.coordinates) {
                return res.status(400).json({ message: 'Driver location data is missing', success: false });
            }

            // Calculate distance traveled
            const distanceData = await distanceCal({
                origin: {
                    latitude: acceptedDriverLocation.coordinates[1], // Ensure correct order: [lng, lat]
                    longitude: acceptedDriverLocation.coordinates[0]
                },
                destination: {
                    latitude: driverCurrentLocation.coordinates[1],
                    longitude: driverCurrentLocation.coordinates[0]
                }
            });

            const distanceTraveled = distanceData.distance; // Distance traveled by the driver (e.g., "10.13 km")

            // Convert distance to a number (remove "km" and convert to float)
            const numericDistance = parseFloat(distanceTraveled.replace(' km', ''));

            // Calculate fare based on distance traveled and rate per km
            const fare = numericDistance * ratePerKm;

            // Cancel the ride
            driver.status = "Available";
            await driver.save();
            ride.status = 'canceled';
            await ride.save();

            return res.status(200).json({
                message: 'Ride canceled',
                data: ride,
                success: true,
                distanceTraveled, // e.g., "10.13 km"
                fare: `₹${fare.toFixed(2)}` // e.g., "₹50.65"
            });
        } else {
            return res.status(200).json({ message: 'Cannot cancel ride now', success: false });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error', success: false });
    }
};

const getVendorsOnRoute = async (req, res) => {
    const { rideId } = req.params
    
    try {
        const ride = await Ride.findById(rideId);
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found', success: false });
        }   
        
        const pickup = {latitude: ride.pickupLocation.coordinates[1],longitude: ride.pickupLocation.coordinates[0]  }
        const drop =  {latitude: ride.dropLocation.coordinates[1],longitude: ride.dropLocation.coordinates[0]  }
       
        const steps = await getRoute({origin: pickup, destination: drop })
        
        const routeCoordinates = steps.map( step => step.end_location)
 
        let data = []
        for(let coord of routeCoordinates ) {
            const vendors = await Vendor.find({
                "location.geoCoordes": {
                    $near: {
                        $geometry:  {
                            type: "Point",
                            coordinates: [coord.lng, coord.lat]
                        },
                        $maxDistance: 500  // In meters
                    }
                }
            });
            data.push({ location: coord, vendors })
        }
        
        return res.status(200).json({ message: 'vendors along the route', data, success: true });
    } catch(err){
        return res.status(500).json({ message: 'server error', error: err, success: false });
    }
};

module.exports = {
  addDropLocation,
  showVehicleOptions,
  createRide,
  assignRideToDriver,
  acceptRide,
  startRide,
  endRide,
  cancelRide,
  getVendorsOnRoute,
  getUserLocations,
  confirmEndRide
};


// for (const driver of availableDrivers) {
            
//     const result = await new Promise((resolve) => {
        
//         console.log(`Notifying Driver: ${driver}`);

//         setTimeout(async () => {
//             const ride = await Ride.findById(rideId);

//             if (ride && ride.status === "accepted") {
//                 console.log(`Driver ${driver.name} accepted the ride.`);
//                 rideAssigned = true;
//                 resolve(true); 
//             } else {
//                 console.log(`Driver ${driver.name} did not accept the ride.`);
//                 resolve(false);
//             }
//         }, 30000); // 30-second timeout for each driver's response
//     });

//     if (result === true) {
//         console.log(`Ride accepted by driver ${driver.name}. Stopping notifications.`);
//         break; 
//     }
// }


// if (!rideAssigned) {
//     console.log("No drivers accepted the ride.");
//     return res.status(200).json({ message: 'No driver accepted the ride', success: false });
// }


// const assignRideToDriverfunc = async (vehicleType, userPickupLocation, rideDetails) =>{
//     const availableDrivers = await Driver.find({
//       status: "Available",
//       "vehicle.type":  vehicleType,      
//       currentLocation: {
//         $near: {
//           $geometry: userPickupLocation,
//           $maxDistance: 3000     //In meters
//         }
//       }
//     });
  
//     let rideAssigned = false;
  
//     //assign driver to ride
//     for(const driver of availableDrivers){
//         setTimeout(async () => {
//           if (!rideAssigned) {
//               const ride = await Ride.findById(rideId)
//               if(ride.status === "in-progress"){
//                   console.log(`assignRideToDriver: ${rideDetails}`)
//               }    
//           }
//         },30000)
  
//         if (rideAssigned) {
//           break; // Break out of the loop if ride is assigned
//         }
       
//     }
  
//   }
  

// // Add Drop Location and calculate vehicle options
// const addDropLocation = async (req, res) => {
//     const { userId, dropLocation } = req.body;

//     try {
//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         // Ensure dropLocation is in GeoJSON format
//         const formattedDropLocation = {
//             type: 'Point',
//             coordinates: dropLocation.coordinates,
//         };

//         const isDropLocationInServiceArea = await TaxiServiceAreaLocation.findOne({
//             boundaries: {
//                 $geoIntersects: {
//                     $geometry: formattedDropLocation,
//                 },
//             },
//         });

//         const isPickupLocationInServiceArea = await TaxiServiceAreaLocation.findOne({
//             boundaries: {
//                 $geoIntersects: {
//                     $geometry: user.currentLocation,
//                 },
//             },
//         });
        
//         if( !(isDropLocationInServiceArea && isPickupLocationInServiceArea && isDropLocationInServiceArea._id === isPickupLocationInServiceArea._id) ){

//         }

//         user.dropLocation = formattedDropLocation;

//         const origin = user.currentLocation.coordinates;
//         const destination = formattedDropLocation.coordinates;

//         // Calculate distance
//         const distanceData = await distanceCal({
//             origin: { latitude: origin[1], longitude: origin[0] },
//             destination: { latitude: destination[1], longitude: destination[0] },
//         });

//         if (distanceData.error) {
//             return res.status(400).json({ message: 'Failed to calculate distance.', distanceData });
//         }

//         const distanceInKm = parseFloat(distanceData.distance.split(" ")[0]);
//         const duration = distanceData.duration; // Get travel time

//         // Save the drop location to the user document
//         user.dropLocation = formattedDropLocation;
//         await user.save();

//         // Create a ride with status 'pending'
//         const newRide = new Ride({
//             user: userId,
//             pickupLocation: user.currentLocation,
//             dropLocation: formattedDropLocation,
//             vehicleType: null,
//             distance: distanceInKm,
//             price: 0,
//             status: 'pending', // Set status to pending initially
//         });

//         await newRide.save();

//         return res.status(200).json({
//             message: 'Drop location added',
//             pickupLocation: user.currentLocation, // Show pickup location
//             dropLocation: formattedDropLocation,  // Show drop location
//             distanceData: { distance: distanceInKm, duration }, // Show distance and duration
//             rideId: newRide._id,
//         });
//     } catch (error) {
//         return res.status(500).json({ message: 'Error adding drop location', error: error.message });
//     }
// };
