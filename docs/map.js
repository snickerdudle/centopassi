var map, path = [], cursor, line, markers = [];
var cur_map = "google";

const piediluco = { lat: 42.53567, lng: 12.75402507 };
const radii = [50000, 100000, 150000, 200000, 250000, 300000, 350000, 400000, 450000]; // radii in meters
// Define colors for different types of points
var colors = {
    "PP": "blue",  // Color for PP points
    "GP": "red"    // Color for GP points
};

var last_circle_5 = null;
var last_circle_15 = null;

var center = [piediluco.lat, piediluco.lng];
var zoom = 9;


function initLeafletMap() {
    console.log(center);
    // unset the google map
    var container = L.DomUtil.get('map');
    if (container != null) {
        container._leaflet_id = null;
    }
    var map = L.map('map').setView(center, zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var finish_line = L.marker([piediluco.lat, piediluco.lng]).addTo(map);

    radii.forEach(radius => {
        var circle = L.circle([piediluco.lat, piediluco.lng], {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.0,
            radius: radius
        }).addTo(map);
    });


    // you can set .my-div-icon styles in CSS

    // Fetch the data from the JSON file in the GitHub repository
    fetch('https://raw.githubusercontent.com/snickerdudle/centopassi/main/centopassi_2024.json')
        .then(response => response.json())
        .then(data => {
            Object.keys(data).forEach(key => {
                const [pointType, lat, lng] = data[key];
                var color = colors[pointType] || "green"; // Default color if type not found

                if (color == "red") {
                    var myIcon = L.divIcon({ className: 'marker-tag gp_marker', html: key });
                } else {
                    var myIcon = L.divIcon({ className: 'marker-tag', html: key });
                }

                L.marker([lat, lng], { icon: myIcon }).addTo(map);

            });
        });
}

// Initialize and add the map
function initMap() {
    console.log(center);
    // Clear the map if it already exists
    if (map) {
        map = null;
    }

    map = new google.maps.Map(document.getElementById('map'), {
        zoom: zoom,
        center: { lat: center[0], lng: center[1] },
        mapId: "CENTOPASSI_2024_EDITOR"
    });


    // Draw circles of 50 to 400 km in radius around Piediluco
    radii.forEach(radius => {
        new google.maps.Circle({
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0.0,
            map: map,
            center: piediluco,
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
        center: piediluco,
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

    // Fetch the data from the JSON file in the GitHub repository
    fetch('https://raw.githubusercontent.com/snickerdudle/centopassi/main/centopassi_2024.json')
        .then(response => response.json())
        .then(data => {
            Object.keys(data).forEach(key => {
                const [pointType, lat, lng] = data[key];
                var color = colors[pointType] || "green"; // Default color if type not found

                createNewMarker(key, color, lat, lng)
            });
        });

    // Add a black marker for the finish line
    createNewMarker("FIN", "black", piediluco.lat, piediluco.lng);

    // Initialize the polyline
    line = new google.maps.Polyline({
        strokeColor: '#000000',
        strokeOpacity: 1.0,
        strokeWeight: 3,
        map: map
    });

    $("#maps-count").val(20);
}

function updatePath() {
    const panel = document.getElementById('path-panel-contents');
    const countDiv = document.getElementById('path-count');
    panel.innerHTML = ''; // Clear existing entries

    // Update the path count
    countDiv.textContent = 'Path Items: ' + path.length;

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
    }

    // Enable reordering via jQuery UI
    $("#path-panel-contents").sortable({
        update: function (event, ui) {
            reorderPath($(this).sortable('toArray', { attribute: 'data-index' }));
        }
    });
    $("#path-panel-contents").disableSelection();

    const pathCoordinates = path.map(marker => marker.position);
    line.setPath(pathCoordinates);
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

function switchMapType() {
    center = [map.getCenter().lat(), map.getCenter().lng()];
    zoom = map.getZoom();
    if (cur_map == "leaflet") {
        // Set the cookie to "google"
        cur_map = "google";
        // Reload the page
        initMap();
    } else {
        // Set the cookie to "leaflet"
        cur_map = "leaflet";
        // Reload the page
        initLeafletMap();
    }
}

if (cur_map == "leaflet") {
    // Call initMap to render the map
    window.onload = initLeafletMap;
} else {
    // Call initMap to render the map
    window.onload = initMap;
}

