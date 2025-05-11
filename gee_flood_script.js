// Google Earth Engine script to map flood extents using Sentinel-2 imagery
// Date range: 2025-01-01 to 2025-05-10
// NDWI calculation using bands B3 (Green) and B8 (NIR)
// Threshold NDWI at 0.3 to detect water
// Visualize flood extent with blue palette
// Export flood extent as GeoJSON to Google Drive

// Define the date range
var startDate = '2025-01-01';
var endDate = '2025-05-10';

// Load Sentinel-2 surface reflectance image collection
var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR')
  .filterDate(startDate, endDate)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)); // Filter images with less than 20% cloud cover

// Function to calculate NDWI for an image
function addNDWI(image) {
  var ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI');
  return image.addBands(ndwi);
}

// Map the NDWI calculation over the collection
var withNDWI = sentinel2.map(addNDWI);

// Create a water mask by thresholding NDWI at 0.3
var waterMask = withNDWI.select('NDWI').map(function(image) {
  return image.gt(0.3).selfMask();
});

// Combine water masks by taking the maximum (union) over the time period
var floodExtent = waterMask.max().rename('FloodExtent');

// Visualization parameters for flood extent
var floodVis = {
  min: 0,
  max: 1,
  palette: ['000000', '0000FF'] // Black for no water, Blue for water
};

// Add flood extent layer to the map
Map.addLayer(floodExtent, floodVis, 'Flood Extent');

// Center the map on the flood extent
Map.centerObject(floodExtent, 8);

// Export the flood extent as a GeoJSON file to Google Drive
Export.table.toDrive({
  collection: floodExtent.reduceToVectors({
    geometry: floodExtent.geometry(),
    scale: 30,
    geometryType: 'polygon',
    eightConnected: false,
    labelProperty: 'water',
    maxPixels: 1e13
  }),
  description: 'FloodExtent_2025',
  fileFormat: 'GeoJSON'
});
