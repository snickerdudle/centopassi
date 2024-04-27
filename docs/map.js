let map, path = [], line, markers = [];


// Initialize and add the map
function initMap() {
    const piediluco = {lat: 42.53567, lng: 12.75402507};

    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 8,
        center: piediluco,
        mapId: "CENTOPASSI_2024_EDITOR"
    });

    // Draw circles of 50 to 400 km in radius around Piediluco
    const radii = [50000, 100000, 150000, 200000, 250000, 300000, 350000, 400000, 450000]; // radii in meters
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


    // Define colors for different types of points
    var colors = {
        "PP": "blue",  // Color for PP points
        "GP": "red"    // Color for GP points
    };

    // Fetch the data from the JSON file in the GitHub repository
    fetch('https://raw.githubusercontent.com/snickerdudle/centopassi/main/centopassi_2024.json')
        .then(response => response.json())
        .then(data => {
            Object.keys(data).forEach(key => {
                const [pointType, lat, lng] = data[key];
                var color = colors[pointType] || "green"; // Default color if type not found

                const markerTag = document.createElement("div");


                if (color == "red") {
                    markerTag.className = "marker-tag gp_marker";
                } else {
                    markerTag.className = "marker-tag";
                }
                markerTag.textContent = key;

                var marker = new google.maps.marker.AdvancedMarkerElement({
                    position: new google.maps.LatLng(lat, lng),
                    map: map,
                    title: key,
                    content: markerTag
                    // label: {
                    //     text: key,
                    //     color: 'white',
                    //     fontSize: "10px"
                    // },
                    // icon: {
                    //     path: google.maps.SymbolPath.CIRCLE,
                    //     scale: 8, // Size of the marker
                    //     fillColor: color,
                    //     fillOpacity: 1.0,
                    //     strokeColor: color,
                    //     strokeWeight: 2
                    // }
                });
                markers.push(marker);

                // Click listener for each marker
                marker.addListener('click', function() {
                    addToPath(marker);
                });

                // Right-click listener to copy coordinates
                markerTag.addEventListener("contextmenu", (e) => {
                    copyToClipboard(lat, lng);
                });
            });
        });

    // Initialize the polyline
    line = new google.maps.Polyline({
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2,
        map: map
    });
}

function updatePolyline() {
    const pathCoordinates = path.map(marker => marker.position);
    line.setPath(pathCoordinates);
}

function updatePathPanel() {
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

        const removeBtn = document.createElement('span');
        removeBtn.textContent = 'x';
        removeBtn.className = 'path-remove';
        removeBtn.onclick = function() {
            removeFromPath(index);
        };

        div.appendChild(removeBtn);
        panel.appendChild(div);
    });

    // Enable reordering via jQuery UI
    $( "#path-panel-contents" ).sortable({
        update: function(event, ui) {
            reorderPath($(this).sortable('toArray', {attribute: 'data-index'}));
        }
    });
    $( "#path-panel-contents" ).disableSelection();
}

// Add calls to updatePathPanel in addToPath and removeFromPath to ensure the count updates
function addToPath(marker) {
    if (path.includes(marker)) return; // Prevent adding the same marker twice

    path.push(marker);
    updatePathPanel();
    updatePolyline();
}

function removeFromPath(index) {
    path.splice(index, 1);
    updatePathPanel();
    updatePolyline();
}

function reorderPath(newOrder) {
    path = newOrder.map(index => path[index]);
    updatePathPanel();
    updatePolyline();
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
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
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


function reversePath() {
    path.reverse(); // Reverse the array of path markers
    updatePathPanel(); // Update the UI panel displaying the path
    updatePolyline(); // Redraw the polyline to reflect the new order
}


function generateAndOpenGoogleMapsLink() {
    if (path.length === 0) {
        alert("No markers in the path.");
        return;
    }

    const baseUrl = 'https://www.google.com/maps/dir/';
    const coordinates = path.map(marker => marker.position.lat + "," + marker.position.lng).join('/');
    const url = baseUrl + coordinates;

    // Optional: Set a specific zoom level and map center if needed
    const centerLat = (path[0].position.lat + path[path.length - 1].position.lat) / 2;
    const centerLng = (path[0].position.lng + path[path.length - 1].position.lng) / 2;
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

// Call initMap to render the map
window.onload = initMap;
