function dmsToDecimal(input) {
  // Store the sign of the input
  const sign = input < 0 ? -1 : 1;
  const absInput = Math.abs(input);
  const str = String(absInput);

  // Extract degrees, minutes, and seconds based on the string length
  let degrees, minutes, seconds;
  if (str.length === 6) {
    degrees = parseInt(str.slice(0, 2));
    minutes = parseInt(str.slice(2, 4));
    seconds = parseInt(str.slice(4, 6));
  } else if (str.length === 7) {
    degrees = parseInt(str.slice(0, 3));
    minutes = parseInt(str.slice(3, 5));
    seconds = parseInt(str.slice(5, 7));
  } else {
    throw new Error("Invalid input format. Must be 6 or 7 digits.");
  }

  // Calculate the decimal value from the absolute numbers
  const decimalValue = degrees + minutes / 60 + seconds / 3600;

  // Apply the sign to the final decimal value
  return sign * decimalValue;
}

const knownPoints = {
  YLEG: [145.86, -38.493333],
  YLTV: [146.470278, -38.207222],
  GMH: [145.238889, -38.008333],
  YMMB: [145.102222, -37.975833],
  YDRN: [145.83049, -38.20902],
  YTDN: [145.427, -38.2167],
  YBDG: [dmsToDecimal(1441947), dmsToDecimal(-364422)],
  SGSV: [dmsToDecimal(1451800), dmsToDecimal(-374030)],
  KIM: [dmsToDecimal(1445715), dmsToDecimal(-371800)],
  KTN: [dmsToDecimal(1442730), dmsToDecimal(-371450)],
  BMP: [dmsToDecimal(1442620), dmsToDecimal(-374030)],
  TON: [dmsToDecimal(1444519), dmsToDecimal(-375119)],
  WMS: [dmsToDecimal(1445440), dmsToDecimal(-375210)],
};

// NAV.2
const routeCoordinates = [
  knownPoints.YMMB,
  knownPoints.SGSV,
  knownPoints.KIM,
  knownPoints.YBDG,
  knownPoints.KTN,
  knownPoints.BMP,
  knownPoints.TON,
  knownPoints.WMS,
  knownPoints.YMMB,
];

const airfields = [knownPoints.YMMB, knownPoints.YBDG];

var map = new maplibregl.Map({
  container: "map", // container id
  zoom: 12,
  center: knownPoints.YMMB,
  pitch: 60,
  // pitch: 0,
  bearing: 16,
  maxZoom: 18,
  maxPitch: 85,
});

map.setStyle(
  "https://api.maptiler.com/maps/hybrid/style.json?key=fTwRS7pLGWeMWL0ySyT3",
  {
    transformStyle: (previousStyle, nextStyle) => {
      nextStyle.projection = { type: "globe" };
      nextStyle.sources = {
        ...nextStyle.sources,
        terrainSource: {
          type: "raster-dem",
          url: "https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=fTwRS7pLGWeMWL0ySyT3",
          tileSize: 256,
        },
        hillshadeSource: {
          type: "raster-dem",
          url: "https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=fTwRS7pLGWeMWL0ySyT3",
          tileSize: 256,
        },
      };
      nextStyle.terrain = {
        source: "terrainSource",
        exaggeration: 1,
      };

      nextStyle.sky = {
        "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 2, 0],
      };

      nextStyle.layers.push({
        id: "hills",
        type: "hillshade",
        source: "hillshadeSource",
        layout: { visibility: "visible" },
        paint: { "hillshade-shadow-color": "#473B24" },
      });

      return nextStyle;
    },
  },
);

map.addControl(
  new maplibregl.NavigationControl({
    visualizePitch: true,
    showZoom: true,
    showCompass: true,
  }),
);

map.addControl(
  new maplibregl.TerrainControl({
    source: "terrainSource",
    exaggeration: 1,
  }),
);

map.on("load", () => {
  map.addSource("route", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: routeCoordinates,
          },
        },
      ],
    },
  });

  map.addLayer({
    id: "route",
    type: "line",
    source: "route",
    layout: {},
    paint: {
      "line-color": "#f00",
      "line-width": 5,
      "line-opacity": 1,
    },
  });

  airfields.map((pt, idx) => {
    const centerPoint = turf.point(pt); // Your given point [longitude, latitude]

    addCircle(centerPoint, 10, idx);

    // Optionally, add a marker for the center point
    new maplibregl.Marker()
      .setLngLat(centerPoint.geometry.coordinates)
      .addTo(map);
  });

  addCircle(turf.point(knownPoints.YMMB), 3, "ymmb.3nm");

  // Add half-way lines for each segment of the route
  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    addHalfWayLine(routeCoordinates[i], routeCoordinates[i + 1], i);
  }
});

function addCircle(centerPoint, radius, idx) {
  const options = { steps: 128, units: "nauticalmiles" }; // More steps for a smoother circle

  // Calculate the circle's outline as a polygon (Turf.js returns a polygon by default)
  const circlePolygon = turf.circle(centerPoint, radius, options);

  // To get just the outline (LineString) from the polygon, we can extract its coordinates
  // A simple way is to take the first ring of the polygon's coordinates.
  // Note: If turf.circle() returned a simple LineString directly, it would be easier.
  // For an outline, we want the first ring of the polygon's coordinates.
  const circleOutline = turf.lineString(circlePolygon.geometry.coordinates[0]);

  const id = "circle-outline-af" + idx;

  // Add a GeoJSON source to the map
  map.addSource(id, {
    type: "geojson",
    data: circleOutline,
  });

  // Add a line layer to draw the circle outline
  map.addLayer({
    id: id,
    type: "line",
    source: id,
    paint: {
      "line-color": "#000",
      "line-width": 5,
    },
  });
}

// Function to calculate a point at a specific bearing and distance from a starting point
function getPointAtBearingAndDistance(startPoint, bearing, distance) {
  return turf.destination(startPoint, distance, bearing, {
    units: "nauticalmiles",
  });
}

// Function to calculate the bearing between two points
function getBearing(point1, point2) {
  const start = turf.point(point1);
  const end = turf.point(point2);
  return turf.bearing(start, end);
}

// Function to add a half-way line perpendicular to a route segment
function addHalfWayLine(point1, point2, id) {
  // Calculate midpoint
  const start = turf.point(point1);
  const end = turf.point(point2);
  const midPoint = turf.midpoint(start, end);

  // Calculate the distance traveled (estimated from the route segment length)
  const routeDistance = turf.distance(start, end, { units: "nauticalmiles" });

  if (routeDistance < 10) {
    return;
  }

  // Calculate bearing between points
  const routeBearing = turf.bearing(start, end);

  // Calculate perpendicular bearing (90 degrees offset)
  const perpendicularBearing1 = (routeBearing + 90) % 360;
  const perpendicularBearing2 = (routeBearing - 90) % 360;

  // Create points 5nm in each direction
  const point1nm = getPointAtBearingAndDistance(
    midPoint,
    perpendicularBearing1,
    5,
  );
  const point2nm = getPointAtBearingAndDistance(
    midPoint,
    perpendicularBearing2,
    5,
  );

  // Create the half-way line
  const halfwayLine = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        point1nm.geometry.coordinates,
        point2nm.geometry.coordinates,
      ],
    },
  };

  // Add source for the line
  map.addSource(`halfway-line-${id}`, {
    type: "geojson",
    data: halfwayLine,
  });

  // Add layer for the line
  map.addLayer({
    id: `halfway-line-${id}`,
    type: "line",
    source: `halfway-line-${id}`,
    layout: {},
    paint: {
      "line-color": "#0066ff",
      "line-width": 2,
    },
  });

  // Add markings at each nm for 1-in-60 rule
  for (let i = -5; i <= 5; i++) {
    if (i === 0) continue; // Skip the center point

    // Calculate position for each nm marking
    const distance = Math.abs(i);
    const bearing = i > 0 ? perpendicularBearing1 : perpendicularBearing2;
    const nmPoint = getPointAtBearingAndDistance(midPoint, bearing, distance);

    // Calculate correction using 1-in-60 rule: (distance traveled * distance off course) / 60
    const distanceOffCourse = Math.abs(i); // distance in nm from the route
    const correction = Math.ceil(
      2 * (distanceOffCourse / (routeDistance / 2)) * 60,
    );

    // Add a circle marker for each nm point
    const circleId = `nm-marker-${id}-${i}`;
    const pointFeature = {
      type: "Feature",
      properties: {
        correction: correction,
      },
      geometry: {
        type: "Point",
        coordinates: nmPoint.geometry.coordinates,
      },
    };

    map.addSource(circleId, {
      type: "geojson",
      data: pointFeature,
    });

    map.addLayer({
      id: circleId,
      type: "circle",
      source: circleId,
      paint: {
        "circle-radius": 4,
        "circle-color": "#ff9900",
        "circle-stroke-width": 1,
        "circle-stroke-color": "#000",
      },
    });

    // Add text label showing the correction value
    map.addLayer({
      id: `${circleId}-text`,
      type: "symbol",
      source: circleId,
      layout: {
        "text-field": `${correction} °`,
        "text-size": 12,
        "text-offset": [0, -1.5],
        "text-anchor": "center",
      },
      paint: {
        "text-color": "#000",
        "text-halo-color": "#fff",
        "text-halo-width": 1,
      },
    });
  }
}
