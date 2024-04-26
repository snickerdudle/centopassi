// Initialize and add the map
function initMap() {
    // The location of the initial map center
    var initialLocation = {lat: 44.0, lng: 10.5};

    // The map, centered at initialLocation
    var map = new google.maps.Map(
        document.getElementById('map'), {zoom: 8, center: initialLocation});

    // Define colors for different types of points
    var colors = {
        "PP": "blue",  // Color for PP points
        "GP": "red"    // Color for GP points
    };

    // Fetch the data from the JSON file in the GitHub repository
    fetch('https://raw.githubusercontent.com/snickerdudle/centopassi/main/centopassi_2024.json')
        .then(response => response.json())
        .then(data => {
            // Loop through the data to place markers
            Object.keys(data).forEach(function(key) {
                var pointType = data[key][0];
                var lat = data[key][1];
                var lng = data[key][2];
                var color = colors[pointType] || "green"; // Default color if type not found

                // Create a marker with the specific color based on the point type
                var marker = new google.maps.Marker({
                    position: new google.maps.LatLng(lat, lng),
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8, // Size of the marker
                        fillColor: color,
                        fillOpacity: 1.0,
                        strokeColor: color,
                        strokeWeight: 2
                    }
                });
            });
        });
}

// Call initMap to render the map
window.onload = initMap;
