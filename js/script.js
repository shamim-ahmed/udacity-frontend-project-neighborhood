var Location = function(name, latlng) {
  this.name = name;
  this.latlng = latlng;
  this.isIncluded = ko.observable(true);
};

var map = null;
var markerArray = [];
var locations;
var center;

$(document).ready(function(){
  $('#sidebar-control').click(function() {
    if ($(this).data('state') == 'show') {
      $('#sidebar').hide();
      $(this).data('state', 'hide');
    } else {
      $('#sidebar').show();
      $(this).data('state', 'show');
    }
  });

  locations = [
    new Location('Sydney Opera House', new google.maps.LatLng(-33.856783, 151.215290)),
    new Location('Government House', new google.maps.LatLng(-33.859621, 151.214850)),
    new Location('Pancakes on The Rocks', new google.maps.LatLng(-33.857165, 151.208761)),
    new Location('Mrs Macquarie\'s Chair', new google.maps.LatLng(-33.860096, 151.222564)),
    new Location('The Spice Room', new google.maps.LatLng(-33.861767, 151.212383)),
    new Location('Frankie\'s Pizza', new google.maps.LatLng(-33.865958, 151.209511))
  ];

  center = locations[0].latlng;
  google.maps.event.addDomListener(window, 'load', initializeMap);

  // at this point, we have map and markers initialized.
});

function initializeMap() {
  var mapOptions = {
    center: center,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    zoom: 16,
    disableDefaultUI: true
  };

  map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
  createMarkers();
  renderMarkers();
}

function createMarkers() {
  var i, loc, marker;

  for (i = 0; i < locations.length; i++) {
    loc = locations[i];
    marker = new google.maps.Marker({
      position: loc.latlng,
      animation: google.maps.Animation.DROP
    });

    markerArray.push(marker);
  }
}

function renderMarkers() {
  var i, loc, marker;

  for (i = 0; i < locations.length; i++) {
    loc = locations[i];
    marker = markerArray[i];

    if (loc.isIncluded()) {
      marker.setMap(map);
    } else {
      marker.setMap(null);
    }
  }
}
