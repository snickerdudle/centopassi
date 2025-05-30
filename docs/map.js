var map, path = [], cursor, line, markers = [];
var cur_map = "google";

// 
// IMPORTANT: CHANGE THESE VALUES WHEN CHANGING THE YEAR:
const CURRENT_YEAR = 2025;
let FINISH_LINE_COORDS = { lat: 41.88988786190099, lng: 12.492331797827742 }; // Default, will be overwritten from the JSON
// IMPORTANT: CHANGE THESE VALUES WHEN CHANGING THE YEAR:

const radii = [50000, 100000, 150000, 200000, 250000, 300000, 350000, 400000, 450000]; // radii in meters, 50km gap between each radius
// Define colors for different types of points
var colors = {
    "PP": "blue",  // Color for PP points
    "GP": "red"    // Color for GP points
};
const past_years = [];
for (let i = 2024; i < CURRENT_YEAR; i++) {
    past_years.push(i.toString());
}

// Set the page title to Centopassi CURRENT_YEAR Planner
document.title = `Centopassi ${CURRENT_YEAR} Planner`;

var last_circle_5 = null;
var last_circle_15 = null;
var gps_tolerance_radius_gp = null;
var gps_tolerance_radius_pp = null;

var initial_map_center = [];
var zoom = 9;

function drawGeoJsonRegions() {
    fetch('https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_IT_regions.geojson')
        .then(response => response.json())
        .then(data => {
            console.log(data.features);
            map.data.addGeoJson(data);
            map.data.setStyle({
                strokeColor: "gray",
                strokeOpacity: 0.5,
                fillColor: "gray",
                fillOpacity: 0.0
            })
        });
}

// Initialize and add the map
async function initMap() {
    if (map) {
        map = null;
    }

    // Fetch the data from the JSON file in the GitHub repository and set FINISH_LINE_COORDS and center first
    let url = `https://raw.githubusercontent.com/snickerdudle/centopassi/main/centopassi_${CURRENT_YEAR}.json`;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("old") == "use") {
        const previous_year = past_years[past_years.length - 1];
        url = `https://raw.githubusercontent.com/snickerdudle/centopassi/main/centopassi_${previous_year}.json`;
    }

    const response = await fetch(url);
    const data = await response.json();

    // Set FINISH_LINE_COORDS from the JSON if present
    if (data["FIN"]) {
        console.log(data["FIN"]);
        FINISH_LINE_COORDS = {
            lat: data["FIN"][1],
            lng: data["FIN"][2]
        };
        initial_map_center = [FINISH_LINE_COORDS.lat, FINISH_LINE_COORDS.lng];
    } else {
        alert("No finish line coordinates found in the JSON file. Please add 'FIN' to the JSON file.");
        return;
    }

    // Now initialize the map and everything else
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: zoom,
        center: { lat: initial_map_center[0], lng: initial_map_center[1] },
        mapId: `CENTOPASSI_${CURRENT_YEAR}_EDITOR`
    });

    // Draw circles of 50 to 400 km in radius around finish line
    radii.forEach(radius => {
        new google.maps.Circle({
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0.0,
            map: map,
            center: FINISH_LINE_COORDS,
            radius: radius
        });
    });

    new google.maps.Circle({
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.0,
        map: map,
        center: FINISH_LINE_COORDS,
        radius: 1000
    });

    const createNewMarker = (m_id, color, lat, lng) => {
        const markerTag = document.createElement("div");

        if (color == "red") {
            markerTag.className = "marker-tag gp_marker";
        } else if (color == "black") {
            markerTag.className = "marker-tag fin_marker"
        } else {
            markerTag.className = "marker-tag";
        }
        markerTag.textContent = m_id;

        var marker = new google.maps.marker.AdvancedMarkerElement({
            position: new google.maps.LatLng(lat, lng),
            map: map,
            title: m_id,
            content: markerTag
        });
        markers.push(marker);

        // Click listener for each marker
        marker.addListener('click', function () {
            addToPath(marker);
        });

        // Right-click listener to copy coordinates
        markerTag.addEventListener("contextmenu", (e) => {
            copyToClipboard(lat, lng);
        });
    }

    // Create all the markers
    Object.keys(data).forEach(key => {
        const [pointType, lat, lng] = data[key];
        if (key === "FIN" || pointType === "FIN") return; // Skip FIN as a regular point
        var color = colors[pointType] || "green"; // Default color if type not found

        createNewMarker(key, color, lat, lng)
    });
    // Add a black marker for the finish line (after coords are set)
    createNewMarker("FIN", "black", FINISH_LINE_COORDS.lat, FINISH_LINE_COORDS.lng);

    if (urlParams.get("old") == "show") {
        const previous_year = past_years[past_years.length - 1];
        const previous_year_data = await fetch(`https://raw.githubusercontent.com/snickerdudle/centopassi/main/centopassi_${previous_year}.json`);
        const previous_year_data_json = await previous_year_data.json();
        Object.keys(previous_year_data_json).forEach(key => {
            if (key === "FIN" || previous_year_data_json[key][0] === "FIN") return; // Skip FIN as a regular point
            const [pointType, lat, lng] = previous_year_data_json[key];
            const markerTag = document.createElement("div");
            markerTag.className = "marker-tag old_marker";
            new google.maps.marker.AdvancedMarkerElement({
                position: new google.maps.LatLng(lat, lng),
                map: map,
                title: key,
                content: markerTag
            });
        });
    }

    drawGeoJsonRegions();

    // Initialize the polyline
    line = new google.maps.Polyline({
        strokeColor: '#000000',
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: map,
        zIndex: 10,
        icons: [{
            icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 3,
                strokeColor: '#000',
                strokeWeight: 2,
                fillColor: '#fff',
                fillOpacity: 1
            },
            offset: '100%'
        }]
    });

    $("#maps-count").val(20);
}

function updatePath() {
    const panel = document.getElementById('path-panel-contents');
    const countDiv = document.getElementById('path-count');
    panel.innerHTML = ''; // Clear existing entries

    // Update the path count
    // Check if the marker wit the title "FIN" is in the path
    if (path.map(marker => marker.title).includes("FIN")) {
        countDiv.textContent = 'Path Items: ' + (path.length - 1) + " + 1 (Finish line)";
    } else {
        countDiv.textContent = 'Path Items: ' + (path.length) + " (no finish)";
    }

    markers.forEach(marker => {
        // remove marker_path class
        marker.content.classList.remove("marker_path");
    });
    path.forEach(marker => {
        marker.content.classList.add("marker_path");
    });

    path.forEach((marker, index) => {
        const div = document.createElement('div');
        div.className = 'path-item';
        div.textContent = marker.title;
        div.setAttribute('data-index', index);
        if (marker === cursor)
            div.classList.add('cursor');

        const removeBtn = document.createElement('span');
        removeBtn.textContent = 'x';
        removeBtn.className = 'path-remove';
        removeBtn.onclick = function () {
            removeFromPath(index);
        };

        div.appendChild(removeBtn);
        panel.appendChild(div);
    });

    // For the last point in the path, draw a circle around it
    if (last_circle_5) {
        last_circle_5.setMap(null);
    }
    if (last_circle_15) {
        last_circle_15.setMap(null);
    }
    if (gps_tolerance_radius_pp) {
        gps_tolerance_radius_pp.setMap(null);
    }
    if (gps_tolerance_radius_gp) {
        gps_tolerance_radius_gp.setMap(null);
    }
    if (cursor) {
        last_circle_5 = new google.maps.Circle({
            strokeColor: '#0000FF',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0.0,
            map: map,
            center: cursor.position,
            radius: 5000
        });
        last_circle_15 = new google.maps.Circle({
            strokeColor: '#0000FF',
            strokeOpacity: 0.4,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0.0,
            map: map,
            center: cursor.position,
            radius: 15000
        });
        if (cursor.content.className.includes("gp_marker")) {
            gps_tolerance_radius_gp = new google.maps.Circle({
                strokeColor: '#FFFF00',
                strokeOpacity: 0.4,
                strokeWeight: 2,
                fillColor: '#FFFF00',
                fillOpacity: 0.1,
                map: map,
                center: cursor.position,
                radius: 100
            });
        } else {
            gps_tolerance_radius_pp = new google.maps.Circle({
                strokeColor: '#FF0000',
                strokeOpacity: 0.4,
                strokeWeight: 2,
                fillColor: '#FF0000',
                fillOpacity: 0.1,
                map: map,
                center: cursor.position,
                radius: 150
            });
        }
    }

    // Enable reordering via jQuery UI
    $("#path-panel-contents").sortable({
        update: function (event, ui) {
            reorderPath($(this).sortable('toArray', { attribute: 'data-index' }));
        }
    });
    $("#path-panel-contents").disableSelection();

    // Update the polyline path and arrows dynamically
    const pathCoordinates = path.map(marker => marker.position);
    line.setPath(pathCoordinates);
    // Add arrows at regular intervals along the path
    const arrowIcons = [];
    const arrowCount = path.length; // Number of arrows (segments)
    for (let i = 1; i < arrowCount; i++) {
        arrowIcons.push({
            icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 3,
                strokeColor: '#000',
                strokeWeight: 2,
                fillColor: '#fff',
                fillOpacity: 1
            },
            offset: `${(i * 100) / arrowCount}%`
        });
    }
    line.setOptions({
        icons: arrowIcons
    });
}

// Add calls to updatePathPanel in addToPath and removeFromPath to ensure the count updates
function addToPath(marker) {
    if (!path.includes(marker))
        path.splice(path.indexOf(cursor) + 1, 0, marker);
    cursor = marker;
    updatePath();
}

function removeFromPath(index) {
    path.splice(index, 1);
    if (!path.includes(cursor) && path.length > 0)
        cursor = path[path.length - 1];
    updatePath();
}

function reorderPath(newOrder) {
    path = newOrder.map(index => path[index]);
    updatePath();
}

function reversePath() {
    path.reverse();
    if (cursor == path[0])
        cursor = path[path.length - 1];
    updatePath();
}

function exportPath() {
    const pathKeys = path.map(marker => marker.title); // Extract marker IDs
    const dataStr = JSON.stringify(pathKeys);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'path-data.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function importPath() {
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const keys = JSON.parse(e.target.result);
                path = []; // Clear existing path
                keys.forEach(key => {
                    const marker = markers.find(m => m.title === key);
                    if (marker) {
                        addToPath(marker);
                    }
                });
            };
            reader.readAsText(file);
        }
    });
    fileInput.click(); // Open file dialog
}

function copyToClipboard(lat, lng) {
    const coordText = `${lat}, ${lng}`;
    navigator.clipboard.writeText(coordText).then(() => {
        console.log('Coordinates copied to clipboard:', coordText);
    }).catch(err => {
        console.error('Failed to copy coordinates to clipboard:', err);
    });
}

function generateAndOpenGoogleMapsLink() {
    const n = $("#maps-count").val();
    var pathx = path.slice(0, path.indexOf(cursor) + 1);
    if (n < pathx.length) {
        pathx = pathx.slice(pathx.length - n);
    }

    if (pathx.length === 0) {
        alert("No markers in the path.");
        return;
    }

    const baseUrl = 'https://www.google.com/maps/dir/';
    const coordinates = pathx.map(marker => marker.position.lat + "," + marker.position.lng).join('/');
    const url = baseUrl + coordinates;

    // Optional: Set a specific zoom level and map center if needed
    const centerLat = (pathx[0].position.lat + pathx[pathx.length - 1].position.lat) / 2;
    const centerLng = (pathx[0].position.lng + pathx[pathx.length - 1].position.lng) / 2;
    const zoomLevel = '8z'; // You might want to adjust this based on your requirements
    const completeUrl = `${url}/@${centerLat},${centerLng},${zoomLevel}`;

    // Copy to clipboard
    navigator.clipboard.writeText(completeUrl).then(() => {
        console.log('Google Maps URL copied to clipboard:', completeUrl);
        // Redirect to the Google Maps URL
        window.open(completeUrl, '_blank');
    }).catch(err => {
        console.error('Failed to copy URL to clipboard:', err);
    });
}

function generateAndOpenGoogleMapsLinks() {
    if (path.length === 0) {
        alert("No markers in the path.");
        return;
    }

    const count = 16;
    var pathx = path;
    while (pathx.length > 0) {
        const baseUrl = 'https://www.google.com/maps/dir/';
        const coordinates = pathx.slice(0, count).map(marker => marker.position.lat + "," + marker.position.lng).join('/');
        const url = baseUrl + coordinates;

        // Optional: Set a specific zoom level and map center if needed
        const centerLat = (path[0].position.lat + path[path.length - 1].position.lat) / 2;
        const centerLng = (path[0].position.lng + path[path.length - 1].position.lng) / 2;
        const zoomLevel = '8z'; // You might want to adjust this based on your requirements
        const completeUrl = `${url}/@${centerLat},${centerLng},${zoomLevel}`;

        window.open(completeUrl, '_blank');
        pathx = pathx.slice(count - 1);
    }
}

// Function to store value "map_selection" in the cookies
function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}
function eraseCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

// Highlight the markers that would be included in the Google Maps link
function previewGoogleMapsLinkMarkers() {
    const n = $("#maps-count").val();
    if (!cursor || path.length === 0) return;
    let pathx = path.slice(0, path.indexOf(cursor) + 1);
    if (n < pathx.length) {
        pathx = pathx.slice(pathx.length - n);
    }
    markers.forEach(marker => {
        marker.content.classList.remove("marker-highlight");
    });
    pathx.forEach(marker => {
        marker.content.classList.add("marker-highlight");
    });
}

// Remove highlight from all markers
function clearPreviewGoogleMapsLinkMarkers() {
    markers.forEach(marker => {
        marker.content.classList.remove("marker-highlight");
    });
}

// Call initMap to render the map
window.onload = initMap;

