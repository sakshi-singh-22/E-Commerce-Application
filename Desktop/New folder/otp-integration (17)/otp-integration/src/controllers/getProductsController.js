const Product = require('../model/productmodel');
const Vendor = require('../model/vendorModel');
const {DistanceMatrix} = require('../utils/locationUtils');
const { exists } = require('../model/authmodel');
const { isLocInsideValidCluster } = require('../utils/locationUtils.js');


const getProductWithinRadius = async (req, res) => {
    const { userLatitude, userLongitude } = req.body;
    const maxDistanceInMeters = 3000;
    
    if (!userLatitude || !userLongitude) {
        return res.status(400).json({ message: 'latitude and longitude is required' });
    }
  
    const userDeliveryLocation = {
        type: 'Point',
        coordinates: [userLongitude, userLatitude],
    };
    
    try {
        const response = await isLocInsideValidCluster(userDeliveryLocation) 

        if (response.serviceArea) {

            const products = {
                inCluster: [],
                outOfCluster: [],
            };
            
            if ( response.cluster ) {
                const validVendorsInCluster = await Vendor.aggregate([
                {
                    $geoNear: {
                        distanceField: 'dist.calculated',
                        near: userDeliveryLocation,
                        maxDistance: maxDistanceInMeters,
                    },
                },
                {
                    $match: {
                        'location.geoCoordes': {
                            $geoWithin: {
                                $geometry: response.serviceArea.boundary,
                            },
                        },
                    },
                },
                {
                    $match: {
                        'location.geoCoordes': {
                            $geoWithin: {
                                $geometry: response.cluster.boundary,
                            },
                        },
                    },
                },]);
                
                if (validVendorsInCluster.length > 0) {
                    const outsideCluster = false
                    products.inCluster = await processProducts(validVendorsInCluster, userDeliveryLocation, outsideCluster);
                }

                const validVendorsInArea = await Vendor.aggregate([
                    {
                        $match: {
                        'location.geoCoordes': {
                                $geoWithin: {
                                    $geometry: response.serviceArea.boundary,
                                },
                            },
                        },
                    },
                ]);
            
                if (validVendorsInArea.length > 0) {
                    const outsideCluster = true
                    products.outOfCluster = await processProducts(validVendorsInArea, userDeliveryLocation, outsideCluster);
                }
                
                if (products.inCluster.length === 0 && products.outOfCluster.length === 0) {
                    return res.status(200).json({ message: `No products available in your service cluster zone ${response.cluster.name}`, success: false });
                }
                
                return res.status(200).json({ data: products, success: true });
            } else {
                return res.status(200).json({ success: false, message: 'provided location is not inside of service cluster zone'});
            }
        } else {
            return res.status(200).json({ message: "Service is not available in your location", success: false });
        }
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
};

const processProducts = async (vendors, userLoc, outsideCluster ) => {

    function convertArrayOfLocToString(arrayOfLoc) {
        return arrayOfLoc.map(loc => `${loc[1]},${loc[0]}`).join('|');
    }

    const vendorsLoc = vendors.map(vendor => vendor.location.geoCoordes.coordinates);

    const vendorsLocString = convertArrayOfLocToString(vendorsLoc);
    const userLocString = `${userLoc.coordinates[1]},${userLoc.coordinates[0]}` 
  
    const response = await DistanceMatrix(userLocString, vendorsLocString);
  
    const vendorsData = response.rows[0].elements.map(element => ({
      duration: element.duration,
      distance: element.distance,
    }));
  
    const validVendorsMap = new Map();
    for (let i = 0; i < vendorsLoc.length; i++) {
      validVendorsMap.set(vendors[i]._id.toString(), vendorsData[i])
    }

    let products;

    if (outsideCluster) {
        products = await Product.find({
            vendorId: { $in: vendors.map(vendor => vendor._id) },
            cluster_tag: true
        });
    } else{
        products = await Product.find({
            vendorId: { $in: vendors.map(vendor => vendor._id) }     
        });
    }
    
    const productMap = new Map()
    const productsWithDistanceAndTime = products.map(product => {
        const details = validVendorsMap.get(product.vendorId.toString())
                        
        return {
            ...product.toObject(),
            distanceInMeters: details.distance,
            estimatedTimeInSeconds: details.duration
        };
    });

    productsWithDistanceAndTime.sort( (a,b) =>  a.distanceInMeters - b.distanceInMeters );
    for (let product of productsWithDistanceAndTime) {
        if (productMap.has(product.tags)) {
            const existingProduct = productMap.get(product.tags)
            if (product.distanceInMeters < existingProduct.distanceInMeters){
                productMap.set(product.tags, product)
            }
        } else {
            productMap.set(product.tags, product)
        }
    }
    let uniqueNearestProducts = []
    for (let product of productMap.values()) {
        uniqueNearestProducts.push(product)
    }

    return uniqueNearestProducts
}


module.exports = getProductWithinRadius