var Location = function(name, latlng) {
  this.name = name;
  this.latlng = latlng;
  this.isIncluded = ko.observable(true);
};

var ViewModel = function(map, locations, markers) {
  var self = this;

  self.map = map;
  self.locations = locations;
  self.markers = markers;

  self.searchInput = ko.observable();
  self.searchInput.subscribe(function(val) {
    filterLocations(val);
  });

  function filterLocations(val) {
    val = val.toLowerCase();

    self.locations.forEach(function(loc) {
      var name = loc.name.toLowerCase();

      if (name.indexOf(val) != -1) {
        loc.isIncluded(true);
      } else {
        loc.isIncluded(false);
      }

      updateMarker(loc);
    });
  }

  function updateMarker(loc) {
    var i;

    for (i = 0; i < self.locations.length; i++) {
      if (loc == self.locations[i]) {
        break;
      }
    }

    if (i >= self.markers.length) {
      return;
    }

    var val = loc.isIncluded() ? self.map : null;
    self.markers[i].setMap(val);
  }
};

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

  var map = null;

  var locations = [
    new Location('Sydney Opera House', new google.maps.LatLng(-33.856783, 151.215290)),
    new Location('Government House', new google.maps.LatLng(-33.859621, 151.214850)),
    new Location('Pancakes on The Rocks', new google.maps.LatLng(-33.857165, 151.208761)),
    new Location('Mrs Macquarie\'s Chair', new google.maps.LatLng(-33.860096, 151.222564)),
    new Location('The Spice Room', new google.maps.LatLng(-33.861767, 151.212383)),
    new Location('Frankie\'s Pizza', new google.maps.LatLng(-33.865958, 151.209511))
  ];

  var center = locations[0].latlng;
  var markers = [];
  google.maps.event.addDomListener(window, 'load', initialize);

  // this function is used to initialize the map with the right center and markers
  function initialize() {
    var mapOptions = {
      center: center,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      zoom: 16,
      disableDefaultUI: true
    };

    map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    var i, loc, marker;

    for (i = 0; i < locations.length; i++) {
      loc = locations[i];

      marker = createMarker(loc);
      markers.push(marker);

      if (loc.isIncluded()) {
        marker.setMap(map);
      }
    }

    // at this point, we have all required data to create a ViewModel
    createViewModel();
  }

  function createMarker(loc) {
    var marker = new google.maps.Marker({
      position: loc.latlng,
      animation: google.maps.Animation.DROP
    });

    var addr = loc.latlng.lat() + ',' + loc.latlng.lng();
    var imageUrl = 'http://maps.googleapis.com/maps/api/streetview';
    imageUrl += '?' + $.param({'size': '200x120'});
    imageUrl += '&' + $.param({'location': addr});

    var infoContent = document.createElement('div');
    $(infoContent).append('<img src="' + imageUrl + '" alt="' + loc.name + '"/>');

    var infoWindow = new google.maps.InfoWindow({
      content: infoContent,
      maxWidth: 220
    });

    marker.addListener('click', function() {
      infoWindow.open(map, marker);
    });

    var venueSearchResponseHandler = function(data) {
      var venue = data.response.venues[0];
      var venueId = venue.id;
      var venueName = venue.name;
      var venueLocation = venue.location;
      var fullAddress = '';

      if (venueLocation.formattedAddress) {
        var i;
        var n = venueLocation.formattedAddress.length;

        for (i = 0; i < n; i++) {
          fullAddress += venueLocation.formattedAddress[i];

          if (i < n - 1) {
            fullAddress += ', ';
          }
        }
      }
      var category = venue.categories[0].name;

      $(infoContent).append('<div><span>Name: </span><span>' + venueName + '</span></div>');
      $(infoContent).append('<div><span>Address: </span><span>' + fullAddress + '</span></div>');
      $(infoContent).append('<div><span>Category: </span><span>' + category + '</span></div>');

      var venueTipsUrl = 'https://api.foursquare.com/v2/venues/' + venueId + '/tips'
      var params = {
        'sort': 'recent',
        'client_id': '2XWQOVE4P4V5ZULBKS0LJ5LH3XSYVAFSPEU250QAFVV1RBSA',
        'client_secret': '4DSQNJCSZ3Y05EV5Q0TSDOFI2TWIWT0UMOQBDZUAQLZWHXZX',
        'v': '20161020',
        'm': 'foursquare',
        'limit': 3
      };

      $.getJSON(venueTipsUrl, params, tipSearchResponseHandler).fail(genericErrorHandler);
    };

    var tipSearchResponseHandler = function(data) {
      $(infoContent).append('<div>' + 'comments are received !!' + '</div>');
    };

    var genericErrorHandler = function(ex) {
      console.log('An error occurred: ' + ex);
    };

    var fourSquareUrl = 'https://api.foursquare.com/v2/venues/search';
    var latlngStr = loc.latlng.lat() + ',' + loc.latlng.lng();
    var params = {
      'll': latlngStr,
      'client_id': '2XWQOVE4P4V5ZULBKS0LJ5LH3XSYVAFSPEU250QAFVV1RBSA',
      'client_secret': '4DSQNJCSZ3Y05EV5Q0TSDOFI2TWIWT0UMOQBDZUAQLZWHXZX',
      'v': '20161020',
      'm': 'foursquare',
      'query': loc.name,
      'limit': 1
    };

    $.getJSON(fourSquareUrl, params, venueSearchResponseHandler).fail(genericErrorHandler);

    return marker;
  }

  function createViewModel() {
    var viewModel = new ViewModel(map, locations, markers);
    ko.applyBindings(viewModel);
  }
});
