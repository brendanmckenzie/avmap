const knownPoints = window.avmap.knownPoints;
const routes = {
  NAV1: [
    knownPoints.YMMB,
    knownPoints.YLEG,
    knownPoints.YLTV,
    knownPoints.GMH,
    knownPoints.YMMB,
  ],
  NAV2: [
    knownPoints.YMMB,
    knownPoints.SGSV,
    knownPoints.KIM,
    knownPoints.YBDG,
    knownPoints.KTN,
    knownPoints.BMP,
    knownPoints.TON,
    knownPoints.WMS,
    knownPoints.YMMB,
  ],
  NAV3: [
    knownPoints.YMMB,
    knownPoints.APL,
    knownPoints.TON,
    knownPoints.WBER,
    knownPoints.YMAV,
    knownPoints.YOLA,
    knownPoints.YWBL,
    knownPoints.PIPS,
    knownPoints.MHT,
    knownPoints.CARR,
    knownPoints.YMMB,
  ],
  NAV4: [
    knownPoints.YMMB,
    knownPoints.YLTV,
    knownPoints.YYRM,
    knownPoints.YLEG,
    knownPoints.GMH,
    knownPoints.YMMB,
  ],
  NAV5: [
    knownPoints.YMMB,
    knownPoints.YLTV,
    knownPoints.YLEG,
    knownPoints.YMMB,
  ],
  NAV6: [
    knownPoints.YMMB,
    knownPoints.APL,
    knownPoints.YMEN,
    knownPoints.CARE,
    knownPoints.YMMB,
  ],
  NAV7: [
    knownPoints.YMMB,
    knownPoints.YMEN,
    knownPoints.YBSS,
    knownPoints.YBLT,
    knownPoints.YOLA,
    knownPoints.YMAV,
    knownPoints.YMMB,
  ],
  NAV8: [
    knownPoints.YMMB,
    knownPoints.YMEN,
    knownPoints.YSHT,
    knownPoints.YMFD,
    knownPoints.YMNG,
    knownPoints.YMMB,
  ],
  NAV9: [
    knownPoints.YMMB,
    knownPoints.YSHT,
    knownPoints.YBDG,
    knownPoints.YMMB,
  ],
  NAV10: [
    knownPoints.YMMB,
    knownPoints.YMEN,
    knownPoints.YBDG,
    knownPoints.YSTA,
    knownPoints.YMBU,
    knownPoints.YMMB,
  ],
};

Object.entries(routes).forEach(([key, pts]) =>
  pts.forEach((pt, idx) => {
    if (!pt) {
      console.warn(`${key} has invalid point at idx ${idx + 1}`);
    }
  })
);

function getAirfieldsForRoute(routeCoords) {
  const airfieldSet = new Set(
    Object.values(window.avmap.airfields).map(JSON.stringify)
  );
  return routeCoords.filter((pt) => airfieldSet.has(JSON.stringify(pt)));
}

class MapController {
  constructor(mapContainerId) {
    this.currentRouteKey = "NAV1";
    this.routeCoordinates = routes[this.currentRouteKey];
    this.airfields = getAirfieldsForRoute(this.routeCoordinates);
    this.map = new maplibregl.Map({
      container: mapContainerId,
      zoom: 14,
      center: this.routeCoordinates[0],
      pitch: 60,
      bearing: turf.bearing(
        turf.point(this.routeCoordinates[0]),
        turf.point(this.routeCoordinates[1])
      ),
      maxZoom: 18,
      maxPitch: 85,
    });
    this.map.setStyle(
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
            "atmosphere-blend": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              1,
              2,
              0,
            ],
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
      }
    );
    this.map.on("load", () => {
      this.renderAll();
      this.setupFlightSim();
    });
  }

  clearMap() {
    // Remove previous sources/layers
    if (this.map.getLayer("route")) this.map.removeLayer("route");
    if (this.map.getSource("route")) this.map.removeSource("route");
    // Remove airfield markers and circles
    this.airfields.forEach((_, idx) => {
      if (this.map.getLayer(`circle-outline-af${idx}`))
        this.map.removeLayer(`circle-outline-af${idx}`);
      if (this.map.getSource(`circle-outline-af${idx}`))
        this.map.removeSource(`circle-outline-af${idx}`);
      if (this.map.getLayer(`marker-af${idx}`))
        this.map.removeLayer(`marker-af${idx}`);
      if (this.map.getSource(`marker-af${idx}`))
        this.map.removeSource(`marker-af${idx}`);
    });
    // Remove half-way lines
    for (let i = 0; i < this.routeCoordinates.length - 1; i++) {
      if (this.map.getLayer(`halfway-line-${i}`))
        this.map.removeLayer(`halfway-line-${i}`);
      if (this.map.getSource(`halfway-line-${i}`))
        this.map.removeSource(`halfway-line-${i}`);
    }
  }
  renderAll() {
    this.clearMap();
    this.renderRoute();
    this.renderAirfields();
    this.renderHalfWayLines();
  }

  renderRoute() {
    this.map.addSource("route", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: this.routeCoordinates,
            },
          },
        ],
      },
    });
    this.map.addLayer({
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
  }

  renderAirfields() {
    this.airfields
      .filter(
        (ent) =>
          JSON.stringify(ent) !== JSON.stringify(this.routeCoordinates[0])
      )
      .forEach((pt, idx) => {
        const centerPoint = turf.point(pt);
        addCircle(centerPoint, 10, idx);
        new maplibregl.Marker()
          .setLngLat(centerPoint.geometry.coordinates)
          .addTo(this.map);
      });
    addCircle(turf.point(this.routeCoordinates[0]), 3, "start.3nm");
  }

  renderHalfWayLines() {
    for (let i = 0; i < this.routeCoordinates.length - 1; i++) {
      addHalfWayLine(this.routeCoordinates[i], this.routeCoordinates[i + 1], i);
    }
  }

  setupFlightSim() {
    window.flightSim = new FlightSimulator(this.routeCoordinates, {
      zoom: 14,
      speedNm: 0.2,
      pitch: 60,
    });
  }

  updateRoute(newRouteKey) {
    // Stop previous flight simulation if running, and remember if it was running
    let wasRunning = false;
    if (window.flightSim && typeof window.flightSim.stop === "function") {
      wasRunning = window.flightSim.running;
      window.flightSim.stop();
    }
    this.currentRouteKey = newRouteKey;
    this.routeCoordinates = routes[this.currentRouteKey];
    this.airfields = getAirfieldsForRoute(this.routeCoordinates);
    this.renderAll();
    this.setupFlightSim();
    // Create new FlightSimulator and reset to start
    window.flightSim.reset();
    // Only start if previous simulation was running
    if (wasRunning) {
      window.flightSim.start();
    }

    if (!this._overviewMode) {
      this.showCockpitView();
    } else {
      this.showRouteOverview();
    }

    // this.map.easeTo({
    //   center: this.routeCoordinates[0],
    //   pitch: 60,
    //   bearing: turf.bearing(
    //     turf.point(this.routeCoordinates[0]),
    //     turf.point(this.routeCoordinates[1])
    //   ),
    //   zoom: 14,
    //   duration: 500,
    //   essential: true,
    // });
  }

  showRouteOverview() {
    // Fit the map to the bounds of the route in a top-down view
    const bounds = this.routeCoordinates.reduce((b, coord) => {
      return b.extend(coord);
    }, new maplibregl.LngLatBounds(this.routeCoordinates[0], this.routeCoordinates[0]));
    this.map.fitBounds(bounds, {
      padding: 50,
      pitch: 0,
      bearing: 0,
      duration: 500,
      essential: true,
    });
    this._overviewMode = true;
  }

  showCockpitView() {
    // Restore cockpit/fly-along view at start of route
    this.map.easeTo({
      center: this.routeCoordinates[0],
      pitch: 60,
      bearing: turf.bearing(
        turf.point(this.routeCoordinates[0]),
        turf.point(this.routeCoordinates[1])
      ),
      zoom: 14,
      duration: 500,
      essential: true,
    });
    this._overviewMode = false;
  }

  toggleView() {
    if (this._overviewMode) {
      this.showCockpitView();
    } else {
      this.showRouteOverview();
    }
  }
}

// FlightSimulator controller for start, pause, and step functionality
class FlightSimulator {
  constructor(route, options = {}) {
    this.route = route;
    this.pitch = options.pitch || 52;
    this.zoom = options.zoom || 10.7;
    this.speedNm = options.speedNm || 0.2;
    this.segmentDistances = [];
    this.cumulativeDistances = [0];
    this.totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const from = turf.point(route[i]);
      const to = turf.point(route[i + 1]);
      const dist = turf.distance(from, to, { units: "nauticalmiles" });
      this.segmentDistances.push(dist);
      this.totalDistance += dist;
      this.cumulativeDistances.push(this.totalDistance);
    }
    this.distanceTraveled = 0;
    this.running = false;
    this._frame = null;
  }

  interpolateCoord(coord1, coord2, t) {
    return [
      coord1[0] + (coord2[0] - coord1[0]) * t,
      coord1[1] + (coord2[1] - coord1[1]) * t,
    ];
  }

  _moveMap() {
    let seg = 0;
    while (
      seg < this.segmentDistances.length &&
      this.cumulativeDistances[seg + 1] < this.distanceTraveled
    ) {
      seg++;
    }
    if (seg >= this.segmentDistances.length) {
      seg = this.segmentDistances.length - 1;
    }
    const segStartDist = this.cumulativeDistances[seg];
    const segLength = this.segmentDistances[seg];
    const t =
      segLength === 0 ? 0 : (this.distanceTraveled - segStartDist) / segLength;
    const from = this.route[seg];
    const to = this.route[seg + 1];
    const position = this.interpolateCoord(from, to, t);
    const bearing = turf.bearing(turf.point(from), turf.point(to));
    mapController.map.easeTo({
      center: position,
      pitch: this.pitch,
      bearing: bearing,
      zoom: this.zoom,
      duration: 500,
      essential: true,
    });
  }

  _animateLeg(seg) {
    if (!this.running || seg >= this.route.length - 1) {
      this.running = false;
      return;
    }
    const from = this.route[seg];
    const to = this.route[seg + 1];
    const dist = this.segmentDistances[seg];
    const duration = (dist / this.speedNm) * 1000;
    mapController.map.setBearing(
      turf.bearing(turf.point(from), turf.point(to))
    );
    mapController.map.easeTo({
      center: to,
      pitch: this.pitch,
      bearing: turf.bearing(turf.point(from), turf.point(to)),
      zoom: this.zoom,
      duration: duration,
      essential: true,
    });
    mapController.map.once("moveend", () => {
      if (this.running) {
        this.distanceTraveled = this.cumulativeDistances[seg + 1];
        this._animateLeg(seg + 1);
      }
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    let seg = 0;
    while (
      seg < this.segmentDistances.length &&
      this.cumulativeDistances[seg + 1] < this.distanceTraveled
    ) {
      seg++;
    }
    this._animateLeg(seg);
  }

  stop() {
    this.running = false;
    mapController.map.stop();
  }

  step(multiplier = 1) {
    if (this.running) return;
    if (this.distanceTraveled < this.totalDistance) {
      this.distanceTraveled += multiplier * this.speedNm;
      this._moveMap();
    }
  }

  reset() {
    this.running = false;
    this.distanceTraveled = 0;
    this._moveMap();
  }

  moveToNearestOnPath() {
    const center = mapController.map.getCenter();
    const centerCoord = [center.lng, center.lat];
    let minDist = Infinity;
    let nearestSeg = 0;
    let nearestT = 0;
    for (let i = 0; i < this.route.length - 1; i++) {
      const from = this.route[i];
      const to = this.route[i + 1];
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const segLenSq = dx * dx + dy * dy;
      let t =
        segLenSq === 0
          ? 0
          : ((centerCoord[0] - from[0]) * dx +
              (centerCoord[1] - from[1]) * dy) /
            segLenSq;
      t = Math.max(0, Math.min(1, t));
      const proj = [from[0] + dx * t, from[1] + dy * t];
      const dist = turf.distance(turf.point(centerCoord), turf.point(proj), {
        units: "nauticalmiles",
      });
      if (dist < minDist) {
        minDist = dist;
        nearestSeg = i;
        nearestT = t;
      }
    }
    const segStartDist = this.cumulativeDistances[nearestSeg];
    const segLength = this.segmentDistances[nearestSeg];
    this.distanceTraveled = segStartDist + segLength * nearestT;
    this._moveMap();
  }
}

// Helper function to add a circle outline to the map
function addCircle(centerPoint, radius, idx) {
  const options = { steps: 128, units: "nauticalmiles" };
  const circlePolygon = turf.circle(centerPoint, radius, options);
  const circleOutline = turf.lineString(circlePolygon.geometry.coordinates[0]);
  const id = "circle-outline-af" + idx;
  // Add a GeoJSON source to the map
  if (mapController.map.getLayer(id)) {
    mapController.map.removeLayer(id);
  }
  if (mapController.map.getSource(id)) {
    mapController.map.removeSource(id);
  }
  mapController.map.addSource(id, {
    type: "geojson",
    data: circleOutline,
  });
  // Add a line layer to draw the circle outline
  mapController.map.addLayer({
    id: id,
    type: "line",
    source: id,
    paint: {
      "line-color": "#0f0",
      "line-width": 5,
    },
  });
}

// Helper function to add a half-way line and markers
function addHalfWayLine(point1, point2, id) {
  const start = turf.point(point1);
  const end = turf.point(point2);
  const midPoint = turf.midpoint(start, end);
  const routeDistance = turf.distance(start, end, { units: "nauticalmiles" });
  if (routeDistance < 10) return;
  const routeBearing = turf.bearing(start, end);
  const perpendicularBearing1 = (routeBearing + 90) % 360;
  const perpendicularBearing2 = (routeBearing - 90) % 360;
  const point1nm = turf.destination(midPoint, 5, perpendicularBearing1, {
    units: "nauticalmiles",
  });
  const point2nm = turf.destination(midPoint, 5, perpendicularBearing2, {
    units: "nauticalmiles",
  });
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
  if (mapController.map.getLayer(`halfway-line-${id}`)) {
    mapController.map.removeLayer(`halfway-line-${id}`);
  }
  if (mapController.map.getSource(`halfway-line-${id}`)) {
    mapController.map.removeSource(`halfway-line-${id}`);
  }
  mapController.map.addSource(`halfway-line-${id}`, {
    type: "geojson",
    data: halfwayLine,
  });
  mapController.map.addLayer({
    id: `halfway-line-${id}`,
    type: "line",
    source: `halfway-line-${id}`,
    layout: {},
    paint: {
      "line-color": "#0066ff",
      "line-width": 2,
    },
  });
  // Add markers for 1-in-60 rule
  for (let i = -5; i <= 5; i++) {
    if (i === 0) continue;
    const distance = Math.abs(i);
    const bearing = i > 0 ? perpendicularBearing1 : perpendicularBearing2;
    const nmPoint = turf.destination(midPoint, distance, bearing, {
      units: "nauticalmiles",
    });
    const correction = Math.ceil(2 * (distance / (routeDistance / 2)) * 60);
    const circleId = `nm-marker-${id}-${i}`;
    const pointFeature = {
      type: "Feature",
      properties: { correction: correction },
      geometry: { type: "Point", coordinates: nmPoint.geometry.coordinates },
    };

    if (mapController.map.getLayer(circleId)) {
      mapController.map.removeLayer(circleId);
      mapController.map.removeLayer(`${circleId}-text`);
    }
    if (mapController.map.getSource(circleId)) {
      mapController.map.removeSource(circleId);
    }

    mapController.map.addSource(circleId, {
      type: "geojson",
      data: pointFeature,
    });
    mapController.map.addLayer({
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
    mapController.map.addLayer({
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

var mapController = new MapController("map");
window.toggleMapView = function () {
  mapController.toggleView();
};

document.addEventListener("DOMContentLoaded", function () {
  var routeSelector = document.getElementById("routeSelector");
  if (routeSelector) {
    routeSelector.addEventListener("change", function (ev) {
      var selectedRoute = ev.target.value;
      mapController.updateRoute(selectedRoute);
    });
  }
});
