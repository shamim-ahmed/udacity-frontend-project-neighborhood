var Location = function(uniqueId, name, latlng) {
  this.uniqueId = uniqueId;
  this.name = name;
  this.latlng = latlng;
  this.isIncluded = ko.observable(true);
};

var ViewModel = function(map, locations, markers, infoWindows) {
  var self = this;

  self.map = map;
  self.locations = locations;
  self.markers = markers;
  self.infoWindows = infoWindows;

  self.searchInput = ko.observable();
  self.searchInput.subscribe(function(val) {
    filterLocations(val);
  });

  self.locationSelected = function(selectedLoc) {
    var marker = markers[selectedLoc.uniqueId];
    google.maps.event.trigger(marker, 'click');
  };

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
    var marker = self.markers[loc.uniqueId];
    var val = loc.isIncluded() ? self.map : null;

    // check if location is excluded for current input and close the corresponding infowindow
    if (val === null) {
      var iw = infoWindows[loc.uniqueId];
      iw.close();
    }

    marker.setMap(val);
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
  var currentInfoWindow = null;

  var locationNames = ['Sydney Opera House', 'Government House', 'Pancakes on The Rocks', 'Mrs Macquarie\'s Chair', 'The Spice Room', 'Frankie\'s Pizza'];
  var locationCoords = [new google.maps.LatLng(-33.856783, 151.215290), new google.maps.LatLng(-33.859621, 151.214850), new google.maps.LatLng(-33.857165, 151.208761),
            new google.maps.LatLng(-33.860096, 151.222564), new google.maps.LatLng(-33.861767, 151.212383), new google.maps.LatLng(-33.865958, 151.209511)];

  var locations = [];

  var i, locId;
  for (i = 0; i < locationNames.length; i++) {
    locId = 'location_' + i;
    locations[i] = new Location(locId, locationNames[i], locationCoords[i]);
  }

  var center = locations[0].latlng;
  var markers = {};
  var infoWindows = {};
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
      markers[loc.uniqueId] = marker;

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
    imageUrl += '?' + $.param({'size': '300x180'});
    imageUrl += '&' + $.param({'location': addr});

    var infoContent = null;

    var infoWindow = new google.maps.InfoWindow({
      maxWidth: 300
    });

    infoWindow.setZIndex(10);
    infoWindows[loc.uniqueId] = infoWindow;

    marker.addListener('click', function() {
      if (currentInfoWindow !== null) {
        currentInfoWindow.close();
      }

      // check if the infowindow content has already been fetched from external sources
      if (infoContent !== null) {
        infoWindow.open(map, marker);
        currentInfoWindow = infoWindow;
        return;
      }

      // Initially, we show a wait message
      infoWindow.setContent('<div>Please wait...</div>');
      infoWindow.open(map, marker);
      currentInfoWindow = infoWindow;

      // we have to fetch location specific info from external sources
      // we start by creating the parent div
      infoContent = document.createElement('div');
      $(infoContent).append('<img src="' + imageUrl + '" alt="' + loc.name + '"/>');

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

      var venueTipsUrl = 'https://api.foursquare.com/v2/venues/' + venueId + '/tips';
      var params = {
        'client_id': '2XWQOVE4P4V5ZULBKS0LJ5LH3XSYVAFSPEU250QAFVV1RBSA',
        'client_secret': '4DSQNJCSZ3Y05EV5Q0TSDOFI2TWIWT0UMOQBDZUAQLZWHXZX',
        'v': '20161020',
        'm': 'foursquare',
        'sort': 'popular',
        'limit': 1
      };

      $.getJSON(venueTipsUrl, params, tipSearchResponseHandler).fail(genericErrorHandler);
    };

    var tipSearchResponseHandler = function(data) {
      var tip = data.response.tips.items[0];
      $(infoContent).append('<div><span>Review: <span><span>' + tip.text + '</span></div>');
      infoWindow.setContent(infoContent);
    };

    var genericErrorHandler = function(jqXHR, textStatus, errorThrown) {
      console.log('An error occurred during Ajax request: ' + errorThrown);
      infoWindow.setContent(infoContent);
    };

    return marker;
  }

  function createViewModel() {
    var viewModel = new ViewModel(map, locations, markers, infoWindows);
    ko.applyBindings(viewModel);
  }
});
