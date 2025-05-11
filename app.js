const cesiumAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiMjA5MzMyZi1iODY5LTQxNzktOTFjNy1iNjRkNDEyMjE2ZGYiLCJpZCI6MzAxMjkzLCJpYXQiOjE3NDY4OTI0NTh9.96ARl6Iyg1SXgVW6uIz6_jQFx3L-KDBIhkPwrqRGmX8';
Cesium.Ion.defaultAccessToken = cesiumAccessToken;

// Initialize Cesium Viewer
console.log('Initializing Cesium Viewer...');
const viewer = new Cesium.Viewer('cesiumContainer', {
  terrainProvider: new Cesium.CesiumTerrainProvider({
    url: 'https://assets.cesium.com/1/tilesets/world/tiles',
  }),
  imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }),
  animation: false,
  baseLayerPicker: true,
  fullscreenButton: true,
  geocoder: true,
  homeButton: true,
  infoBox: true,
  sceneModePicker: true,
  selectionIndicator: false,
  timeline: false,
  navigationHelpButton: false,
});
console.log('Cesium Viewer initialized.');

viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(0, 0, 2000000),
  duration: 3,
  complete: () => {
    console.log('Camera flyTo complete.');
  },
  cancel: () => {
    console.log('Camera flyTo cancelled.');
  }
});

// Load GEE Data (e.g., GeoJSON from GEE export)
function loadGEEData() {
  // Placeholder: Load GeoJSON from GEE export
  const geeDataUrl = 'flood_extent_bangladesh_2024.geojson';
  Cesium.GeoJsonDataSource.load(geeDataUrl).then(dataSource => {
    viewer.dataSources.add(dataSource);
    viewer.zoomTo(dataSource);
  });
}

// Fetch Live Disaster Data (e.g., USGS Earthquakes)
async function fetchDisasters() {
  const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
  const data = await response.json();
  const disasterList = document.getElementById('disasterList');
  data.features.forEach(feature => {
    const { coordinates } = feature.geometry;
    const [lon, lat] = coordinates;
    const mag = feature.properties.mag;
    const place = feature.properties.place;

    // Add to Toggle Panel
    const li = document.createElement('li');
    li.className = 'p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 flex items-center';
    li.innerHTML = `<span class="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></span>${place} (Mag: ${mag})`;
    li.onclick = () => spinToDisaster(lat, lon, place);
    disasterList.appendChild(li);

    // Add Blinking Marker on Globe
    viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat),
      point: {
        color: Cesium.Color.RED,
        pixelSize: 10,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: place,
        font: '14px sans-serif',
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -10),
      },
      properties: { place, mag },
    });
  });
}

// Spin Globe to Disaster Location
function spinToDisaster(lat, lon, place) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, 1000000),
    duration: 3,
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-45),
    },
    complete: () => {
      // Highlight disaster
      viewer.entities.values.forEach(entity => {
        if (entity.properties.place.getValue() === place) {
          entity.point.color = Cesium.Color.YELLOW;
          setTimeout(() => {
            entity.point.color = Cesium.Color.RED;
          }, 2000);
        }
      });
    },
  });
}

// Initialize Street View
let panorama;
window.initStreetView = function() {
  panorama = new google.maps.StreetViewPanorama(
    document.getElementById('streetViewContainer'),
    {
      position: { lat: 0, lng: 0 },
      pov: { heading: 0, pitch: 0 },
      visible: false,
    }
  );
};

// Show Street View on Click
viewer.canvas.addEventListener('click', () => {
  if (!viewer.scene || !viewer.scene.globe) return;
  const pickRay = viewer.camera.getPickRay(viewer.canvas.clientWidth / 2, viewer.canvas.clientHeight / 2);
  if (!pickRay) return;
  const clickPosition = viewer.scene.pickPosition(pickRay);
  if (clickPosition) {
    const cartographic = Cesium.Cartographic.fromCartesian(clickPosition);
    const lon = Cesium.Math.toDegrees(cartographic.longitude);
    const lat = Cesium.Math.toDegrees(cartographic.latitude);
    panorama.setPosition({ lat, lng: lon });
    panorama.setVisible(true);
    document.getElementById('streetViewModal').classList.remove('hidden');
  }
});

// Close Street View Modal
document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('streetViewModal').classList.add('hidden');
  panorama.setVisible(false);
});

  
// Initialize App
loadGEEData();
fetchDisasters();

// Fly camera to default location to ensure globe visibility
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(0, 0, 2000000),
  duration: 3
});
