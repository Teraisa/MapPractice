// declaring global variables
var map;
var infoWindow;
var bounds;
var location;

// google maps init
function initMap() {
    var nevada = {
        lat: 38.802610,
        lng: -116.419389
    };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 4,
        center: nevada,
        mapTypeControl: false
    });

    infoWindow = new google.maps.InfoWindow();

    bounds = new google.maps.LatLngBounds();

    ko.applyBindings(new ViewModel());
}

// handle map error
function googleMapsError() {
    alert("An error occurred with Google Maps!");
}

/* Location Marker */
var LocationMarker = function(data) {
    var self = this;

    this.title = data.title;
    this.position = data.location;
    this.street = "",
    this.city = "";

    this.visible = ko.observable(true);

    // location marker style
    var defaultIcon = makeMarkerIcon("DC143C");
    // highlight location marker with different color when hovered over
    var highlightedIcon = makeMarkerIcon("000000");

    var clientID = "BIDMVS0LHC4MHG1LMOW0ET20XWALXQHNCO5CCRR24OGSXYWE";
    var clientSecret = "UUUC0ZLOUYSLIGNJAKV4RMTGDFNWBMKV5IGHU1ZMEZPXS122";

    // get JSON request foursquare data
    var reqURL = "https://api.foursquare.com/v2/venues/search?ll=" + this.position.lat + "," + this.position.lng + "&client_id=" + clientID + "&client_secret=" + clientSecret + "&v=20160118" + "&query=" + this.title;

    $.getJSON(reqURL).done(function(data) {
        var results = data.response.venues[0];
        self.street = results.location.formattedAddress[0] ? results.location.formattedAddress[0]: "N/A";
        self.city = results.location.formattedAddress[1] ? results.location.formattedAddress[1]: "N/A";
    }).fail(function() {
        alert("OOPS, something's wrong with foursquare");
    });

    // marker per location in array
    this.marker = new google.maps.Marker({
        position: this.position,
        title: this.title,
        animation: google.maps.Animation.DROP,
        icon: defaultIcon
    });

    self.filterMarkers = ko.computed(function () {
        // set marker and extend bounds (showListings)
        if(self.visible() === true) {
            self.marker.setMap(map);
            bounds.extend(self.marker.position);
            map.fitBounds(bounds);
        } else {
            self.marker.setMap(null);
        }
    });

    // create click to infoWindow
    this.marker.addListener("click", function() {
        populateInfoWindow(self.this, self.street, self.city, infoWindow);
        toggleBounce(this);
        map.panTo(this.getPosition());
    });

    // event listener mouseover and mouse out
    this.marker.addListener("mouseover", function() {
        this.setIcon(highlightedIcon);
    });
    this.marker.addListener("mouseout", function() {
        this.setIcon(defaultIcon);
    });

    // showItem selected from list
    this.show = function(location) {
        google.maps.event.trigger(self.marker, "click");
    };

    // selected creates bounce
    this.bounce = function(place) {
        google.maps.event.trigger(self.marker, "click");
    };

};

/* View Model */
var ViewModel = function() {
    var self = this;

    this.searchItem = ko.observable("");

    this.mapList = ko.observableArray([]);

    // added location markers for each location
    locations.forEach(function(location) {
        self.mapList.push( new LocationMarker(location) );
    });

    // locations viewed on map
    this.locationList = ko.computed(function() {
        var searchFilter = self.searchItem().toLowerCase();
        if (searchFilter) {
            return ko.utils.arrayFilter(self.mapList(), function(location) {
                var str = location.title.toLowerCase();
                var result = str.includes(searchFilter);
                location.visible(result);
                return result;
            });
        }
        self.mapList().forEach(function(location) {
            location.visible(true);
        });
        return self.mapList();
    }, self);
};

// This function populates the infowindow when the marker is clicked. We'll only allow
// one infowindow which will open at the marker that is clicked, and populate based
// on that markers position.
function populateInfoWindow(marker, street, city, infowindow) {
    // check if infowindow is not already opened on this marker.
    if (infowindow.marker != marker) {
        // clear the infowindow content to give the streetview time to load.
        infowindow.setContent("");
        infowindow.marker = marker;

        // make sure the marker property is cleared if the infowindow is closed.
        infowindow.addListener("closeclick", function() {
            infowindow.marker = null;
        });
        var streetViewService = new google.maps.StreetViewService();
        var radius = 50;

        var windowContent = "<h4>" + marker.title + "</h4>" +
            "<p>" + street + "<br>" + city + "<br>" + "</p>";

        // in case the status is OK, which means the pano was found, compute the
        // position of the streetview image, then calculate the heading, then get a
        // panorama from that and set the options
        var getStreetView = function (data, status) {
            if (status == google.maps.StreetViewStatus.OK) {
                var nearStreetViewLocation = data.location.latLng;
                var heading = google.maps.geometry.spherical.computeHeading(
                    nearStreetViewLocation, marker.position);
                infowindow.setContent(windowContent + "<div id='pano'></div>");
                var panoramaOptions = {
                    position: nearStreetViewLocation,
                    pov: {
                        heading: heading,
                        pitch: 20
                    }
                };
                var panorama = new google.maps.StreetViewPanorama(
                    document.getElementById("pano"), panoramaOptions);
            } else {
                infowindow.setContent(windowContent + "<div style='color: red'>Address-less crime</div>");
            }
        };
        // use streetview service to get closest streetview image within
        // 50 meters of the markers position
        streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
        // open the infowindow on the correct marker
        infowindow.open(map, marker);
    }
}

function toggleBounce(marker) {
  if (marker.getAnimation() !== null) {
    marker.setAnimation(null);
  } else {
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function() {
        marker.setAnimation(null);
    }, 1400);
  }
}

// this function takes in a COLOR, creates a new marker and creates a new
//21 px wide by 34 high icon, anchored at 10, 34
function makeMarkerIcon(markerColor) {
    var markerImage = new google.maps.MarkerImage(
        "http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|" + markerColor +
        "|40|_|%E2%80%A2",
        new google.maps.Size(21, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(10, 34),
        new google.maps.Size(21, 34));
    return markerImage;
}
