// Add this at the start of app.js
console.log("Script loaded!");
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded");
});
class CSVMapVisualizer {
    // ... existing code ...

    async processAddresses(data) {
        this.clearMap();
        this.updateStatus(`Geocoding ${data.length} addresses...`, 'processing');
        
        // Initialize marker clusterer
        this.markerCluster = new markerClusterer.MarkerClusterer({
            map: this.map,
            markers: [],
            renderer: {
                render: ({ count, position }) => {
                    // Custom cluster icon with count
                    return new google.maps.Marker({
                        position,
                        label: { text: String(count), color: "white" },
                        zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
                        icon: this.getClusterIcon(count),
                        // Store all markers in this cluster
                        clusterData: []
                    });
                }
            }
        });

        // Batch process with progress updates
        const batchSize = 10;
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            await Promise.all(batch.map(item => this.geocodeAddress(item)));
            this.showProgress((i / data.length) * 100);
        }

        this.showProgress(100);
        this.updateStatus(`Successfully mapped ${this.markers.length} locations`, 'success');
        this.autoGroupLocations();
    }

    getClusterIcon(count) {
        // Different icons based on cluster size
        const size = Math.min(50 + Math.sqrt(count) * 10, 100);
        return {
            url: `https://chart.googleapis.com/chart?chst=d_map_spin&chld=1|0|4285F4|12|_|${count}`,
            size: new google.maps.Size(size, size),
            scaledSize: new google.maps.Size(size, size)
        };
    }

    async geocodeAddress(item) {
        try {
            const response = await this.geocoder.geocode({ address: item.address });
            if (response.results[0]) {
                const location = response.results[0].geometry.location;
                const marker = this.createMarker(location, item);
                
                // Store original data with marker
                marker.itemData = item;
                this.markers.push(marker);
                this.markerCluster.addMarker(marker);
                
                return marker;
            }
        } catch (error) {
            console.error(`Geocoding failed for: ${item.address}`, error);
        }
        return null;
    }

    createMarker(position, data) {
        const marker = new google.maps.Marker({
            position,
            map: this.map,
            title: data.name || data.address,
            icon: this.getPinIcon(data.category || data.IconColor),
            optimized: false
        });

        // Enhanced info window with all details
        marker.addListener('click', () => {
            this.showMarkerDetails(marker);
        });

        return marker;
    }

    showMarkerDetails(marker) {
        const content = `
            <div class="info-window">
                <h3>${marker.itemData.name || 'Location'}</h3>
                <p><strong>Address:</strong> ${marker.itemData.address}</p>
                ${marker.itemData.contact ? `<p><strong>Contact:</strong> ${marker.itemData.contact}</p>` : ''}
                ${marker.itemData.category ? `<p><strong>Category:</strong> ${marker.itemData.category}</p>` : ''}
                <div class="actions">
                    <button onclick="window.visualizer.showNearby('${marker.itemData.address}')">
                        Show Nearby
                    </button>
                </div>
            </div>
        `;
        
        this.infoWindow.setContent(content);
        this.infoWindow.open(this.map, marker);
    }

    autoGroupLocations() {
        if (this.markers.length === 0) return;

        // First zoom to include all markers
        const bounds = new google.maps.LatLngBounds();
        this.markers.forEach(marker => bounds.extend(marker.getPosition()));
        this.map.fitBounds(bounds);

        // Add cluster click handler to show grouped locations
        this.markerCluster.addListener('click', (cluster) => {
            const markers = cluster.markers;
            const content = this.createClusterInfoContent(markers);
            
            this.infoWindow.setContent(content);
            this.infoWindow.setPosition(cluster.position);
            this.infoWindow.open(this.map);
        });

        // Add heatmap overlay
        this.addHeatmap();
    }

    createClusterInfoContent(markers) {
        let content = `<div class="cluster-info"><h3>${markers.length} Locations</h3><ul>`;
        
        markers.slice(0, 10).forEach(marker => {
            content += `<li>
                <strong>${marker.itemData.name || 'Location'}:</strong> 
                ${marker.itemData.address}
            </li>`;
        });

        if (markers.length > 10) {
            content += `<li>...and ${markers.length - 10} more</li>`;
        }

        content += `</ul>
            <button onclick="window.visualizer.zoomToCluster(${markers[0].getPosition().lat()}, 
                           ${markers[0].getPosition().lng()})">
                Zoom to Area
            </button>
        </div>`;

        return content;
    }

    addHeatmap() {
        const heatmapData = this.markers.map(marker => {
            return {
                location: marker.getPosition(),
                weight: 1
            };
        });

        new google.maps.visualization.HeatmapLayer({
            data: heatmapData,
            map: this.map,
            radius: 30,
            dissipating: true
        });
    }

    zoomToCluster(lat, lng) {
        this.map.setCenter({ lat, lng });
        this.map.setZoom(this.map.getZoom() + 2);
    }

    showNearby(address) {
        // Find the reference marker
        const refMarker = this.markers.find(m => m.itemData.address === address);
        if (!refMarker) return;

        const center = refMarker.getPosition();
        const nearbyRadius = 500; // meters

        // Show nearby markers
        this.markers.forEach(marker => {
            const distance = google.maps.geometry.spherical.computeDistanceBetween(
                center, marker.getPosition()
            );
            marker.setVisible(distance <= nearbyRadius);
        });

        // Zoom to area
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(center);
        this.markers
            .filter(m => m.getVisible())
            .forEach(m => bounds.extend(m.getPosition()));
        
        this.map.fitBounds(bounds);
        this.infoWindow.close();
    }
}

// Make available in global scope
window.visualizer = new CSVMapVisualizer();
