// Global map variable
let map;

// Initialize map (called by Google Maps API callback)
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 0, lng: 0 },
        zoom: 2
    });
    
    // Set up event listeners after map loads
    document.getElementById('processBtn').addEventListener('click', processCSV);
}

// Rest of your existing processing code...
function processCSV() {
    // Your CSV processing logic here
}
