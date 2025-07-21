const axios = require("axios");

const GOOGLE_API_KEY = "AIzaSyC58JRaLlXPfWGzU2POxSsHJo1lBUSIGCU";

export default async function handler(req, res) {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ error: "Start and end are required." });
  }

  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin: start,
          destination: end,
          alternatives: true,
          key: GOOGLE_API_KEY,
        },
      }
    );

    if (response.data.status !== "OK") {
      return res.status(500).json({
        error: "Google Directions API Error",
        detail: response.data.error_message || response.data.status,
      });
    }

    const routes = response.data.routes.map((route) => {
      const leg = route.legs[0];
      const km = leg.distance.value / 1000;
      const miles = km * 0.621371;
      const durationMin = Math.round(leg.duration.value / 60);
      const costPerKm = 550;
      const costByDuration = durationMin * 450;

      return {
        start: leg.start_address,
        end: leg.end_address,
        distance_km: km.toFixed(2),
        distance_miles: miles.toFixed(2),
        duration: leg.duration.text,
        duration_minutes: durationMin,
        charge_by_distance: Math.round(km * costPerKm),
        charge_by_duration: Math.round(costByDuration),
        polyline: route.overview_polyline.points,
      };
    });

    routes.sort((a, b) => a.duration_minutes - b.duration_minutes);
    const shortest = routes[0];

    res.json({ routes, shortest });
  } catch (err) {
    res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}
