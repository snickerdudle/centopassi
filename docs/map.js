let map, path = [], line, markers = [];


// Initialize and add the map
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 8,
        center: {lat: 44.0, lng: 10.5}
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
                var marker = new google.maps.Marker({
                    position: new google.maps.LatLng(lat, lng),
                    map: map,
                    title: key,
                    label: {
                        text: key,
                        color: 'white',
                        fontSize: "10px"
                    },
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8, // Size of the marker
                        fillColor: color,
                        fillOpacity: 1.0,
                        strokeColor: color,
                        strokeWeight: 2
                    }
                });
                markers.push(marker);

                // Click listener for each marker
                marker.addListener('click', function() {
                    addToPath(marker);
                });

                // Right-click listener to copy coordinates
                marker.addListener('rightclick', function() {
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


function addToPath(marker) {
    if (path.includes(marker)) return; // Prevent adding the same marker twice

    path.push(marker);
    updatePathPanel();
    updatePolyline();
}

function updatePolyline() {
    const pathCoordinates = path.map(marker => marker.getPosition());
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
        div.textContent = marker.getTitle();
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



// Call initMap to render the map
window.onload = initMap;
