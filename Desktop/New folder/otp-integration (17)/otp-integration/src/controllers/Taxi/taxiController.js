const TaxiServiceAreaLocation = require('../../model/Taxi/taxiServiceAreaModel');

// Function to create a new service area with geo-fencing boundaries
const createServiceArea = async (req, res) => {
    const { serviceAreaName, boundaries } = req.body;

    try {
        // Create a new service area with the provided boundaries
        const newServiceArea = new TaxiServiceAreaLocation({
            serviceAreaName,
            boundaries: {
                type: 'Polygon',
                coordinates: [boundaries], // Store coordinates as GeoJSON Polygon
            },
        });

        await newServiceArea.save();
        res.status(201).json({ message: 'Service area created successfully', newServiceArea });
    } catch (error) {
        res.status(500).json({ message: 'Error creating service area', error: error.message });
    }
};

// Function to check if a location is within the service area
const checkLocation = async (req, res) => {
    const { lat, lng } = req.body;

    try {
        const locationPoint = {
            type: 'Point',
            coordinates: [lng, lat], // GeoJSON expects [longitude, latitude]
        };

        // Find if the point is within any service area boundaries
        const serviceArea = await TaxiServiceAreaLocation.findOne({
            boundaries: {
                $geoIntersects: {
                    $geometry: locationPoint,
                },
            },
        });

        if (serviceArea) {
            res.status(200).json({ message: 'Location is within the service area', serviceArea });
        } else {
            res.status(404).json({ message: 'Location is outside the service area' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error checking location', error: error.message });
    }
};

// Export your functions
module.exports = {
    createServiceArea,
    checkLocation,
};
