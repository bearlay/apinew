let map;
let routeLayers = [];
let routesData = [];

function initMap() {
  map = L.map('map').setView([16.8409, 96.1735], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(map);
}

function clearRoutes() {
  routeLayers.forEach((layer) => map.removeLayer(layer));
  routeLayers = [];
}

function decodePolyline(polylineStr) {
  return polyline.decode(polylineStr).map(([lat, lng]) => [lat, lng]);
}

function durationToMinutes(durationStr) {
  let total = 0;
  const h = durationStr.match(/(\d+)\s*hour/);
  const m = durationStr.match(/(\d+)\s*min/);
  if (h) total += parseInt(h[1]) * 60;
  if (m) total += parseInt(m[1]);
  return total;
}

function highlightRoute(index) {
  clearRoutes();
  routesData.forEach((route, idx) => {
    const latlngs = decodePolyline(route.polyline);
    const polylineLayer = L.polyline(latlngs, {
      color: idx === index ? 'red' : 'gray',
      weight: idx === index ? 7 : 3,
      opacity: idx === index ? 0.9 : 0.3,
    }).addTo(map);
    routeLayers.push(polylineLayer);
  });

  const route = routesData[index];
  document.getElementById('route-result').innerHTML = `
    <b>Route:</b> ${route.start} → ${route.end}<br>
    <b>Distance:</b> ${route.distance} km<br>
    <b>Duration:</b> ${route.duration}<br>
    <b>Charge:</b> ${route.charge} MMK
  `;
  map.fitBounds(L.latLngBounds(decodePolyline(route.polyline)));
}

function showRoutes(routes) {
  let content = '<b>Select a route:</b><br><ul style="list-style:none;padding-left:0">';
  routes.forEach((route, idx) => {
    content += `<li style="cursor:pointer;margin-bottom:8px;color:blue" data-index="${idx}">
      ${route.start} → ${route.end}<br>
      Distance: ${route.distance} km, Duration: ${route.duration}<br>
      Charge: ${route.charge} MMK
    </li>`;
  });
  content += '</ul><small>Click to highlight a route.</small>';

  const popup = L.popup()
    .setLatLng(map.getCenter())
    .setContent(content)
    .openOn(map);

  popup.getElement().querySelectorAll('li[data-index]').forEach((li) => {
    li.addEventListener('click', () => {
      const idx = Number(li.getAttribute('data-index'));
      highlightRoute(idx);
      map.closePopup();
    });
  });
}

function initAutocomplete() {
  new google.maps.places.Autocomplete(document.getElementById('start-location'), {
    types: ['geocode'], componentRestrictions: { country: 'mm' }
  });
  new google.maps.places.Autocomplete(document.getElementById('end-location'), {
    types: ['geocode'], componentRestrictions: { country: 'mm' }
  });
}

async function fetchRoutes(start, end) {
  try {
    const res = await fetch(`/calculate-route?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    return data.routes;
  } catch (err) {
    alert('Error fetching routes: ' + err.message);
    return [];
  }
}

window.onload = () => {
  initMap();
  initAutocomplete();

  document.getElementById('route-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('route-result').textContent = 'Calculating routes...';

    const start = document.getElementById('start-location').value.trim();
    const end = document.getElementById('end-location').value.trim();
    if (!start || !end) return alert('Enter both locations');

    routesData = await fetchRoutes(start, end);
    if (routesData.length === 0) {
      document.getElementById('route-result').textContent = 'No routes found.';
      clearRoutes();
      return;
    }

    const fastestIndex = routesData.reduce((minIdx, route, idx, arr) =>
      durationToMinutes(route.duration) < durationToMinutes(arr[minIdx].duration) ? idx : minIdx, 0);

    highlightRoute(fastestIndex);
    showRoutes(routesData);
  });
};
