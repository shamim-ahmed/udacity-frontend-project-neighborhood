var appConfig = {
  locations: [],
  center: {lat: -33.85, lng: 151.21}
};

var map;

function initMap() {
  map = new google.maps.Map(document.getElementById('map-container'), {center: appConfig.center, zoom: 13});
}
