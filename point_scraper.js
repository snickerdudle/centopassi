// Function to extract data from a leaflet map

function getChildData(data) {
    // Create a new hash to store the output
    var output = {};

    for (var key in data) {
        var child = data[key];
        // Check if icon is present
        if (!child.options.icon) {
            continue;
        }

        var iconUrl = child.options.icon.options.iconUrl;
        // If "pushpin" is in the iconUrl, replace it with "Point". Otherwise,
        // replace it with "GP" for "Golden Point".
        if (iconUrl.includes("pushpin")) {
            iconUrl = "PP";
        } else if (iconUrl.includes("sunny")) {
            iconUrl = "GP";
        } else {
            iconUrl = "PP";
        }


        var lat = child._latlng.lat;
        var lng = child._latlng.lng;
        var popup = child._popup._content;

        // Popup is a string that looks like <h2>123
        // We want to extract the number from this string and make it the popup
        // value.
        var popup = popup.slice(4);
        popup = popup.replace(".", "");
        if (popup in output) {
            console.log("Duplicate popup value: " + popup);
            console.log("Existing point: " + output[popup] + ". Replacing with the new point (" + [iconUrl, lat, lng, popup] + ").");
        }
        output[popup] = [iconUrl, lat, lng];
    }
    return output;
}
