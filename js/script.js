// definition of the Location class, which acts as the model
var Location = function(uniqueId, name, latlng) {
  this.uniqueId = uniqueId;
  this.name = name;
  this.latlng = latlng;
  this.isIncluded = ko.observable(true);
  this.isSelected = ko.observable(false);
};

// definition of the ViewModel
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
    self.locations.forEach(function(loc) {
      if (loc.isSelected()) {
        loc.isSelected(false);
      }
    });

    selectedLoc.isSelected(true);

    var marker = markers[selectedLoc.uniqueId];
    google.maps.event.trigger(marker, 'click');
  };

  // This function determines which locations should be included in the
  // location list based on the current user input
  function filterLocations(val) {
    val = val.toLowerCase();

    self.locations.forEach(function(loc) {
      var name = loc.name.toLowerCase();

      if (name.indexOf(val) != -1) {
        loc.isIncluded(true);
      }
      else {
        loc.isIncluded(false);
      }

      updateMarker(loc);
    });
  }

  // This function determines whether a marker will be visible or not depending on user input.
  // It also closes any open InfoWindow for a location that is not included in the list.
  function updateMarker(loc) {
    var marker = self.markers[loc.uniqueId];
    var val = loc.isIncluded() ? self.map : null;

    // check if location is excluded for current input and close the corresponding InfoWindow
    if (val === null) {
      marker.setIcon('images/red-dot.png');
      var iw = infoWindows[loc.uniqueId];
      iw.close();

      // this ensures that an excluded item does not remain selected in the list
      loc.isSelected(false);
    }

    marker.setMap(val);
  }
};

$(document).ready(function() {
  // sidebar show-hide functionality for devices with small screen
  $('#sidebar-control').click(function() {
    if ($(this).data('state') == 'show') {
      $('#sidebar').hide();
      $(this).data('state', 'hide');
    }
    else {
      $('#sidebar').show();
      $(this).data('state', 'show');
    }
  });
});

function initialize() {
  // variable declaration and initialization
  var locationNames = [
    'Sydney Opera House',
    'Pancakes on The Rocks',
    'Mrs Macquarie\'s Chair',
    'The Spice Room',
    'Frankie\'s Pizza',
    'Sea Life Aquarium',
    'St Mary\'s Cathedral',
    'Queen Victoria Building'
  ];
  var locationCoords = [
    new google.maps.LatLng(-33.856783, 151.215290),
    new google.maps.LatLng(-33.857165, 151.208761),
    new google.maps.LatLng(-33.860096, 151.222564),
    new google.maps.LatLng(-33.861767, 151.212383),
    new google.maps.LatLng(-33.865896, 151.209513),
    new google.maps.LatLng(-33.869974, 151.202115),
    new google.maps.LatLng(-33.871254, 151.213429),
    new google.maps.LatLng(-33.871803, 151.206664)
  ];

  var locations = [];

  var i, locId;
  for (i = 0; i < locationNames.length; i++) {
    locId = 'location_' + i;
    locations[i] = new Location(locId, locationNames[i], locationCoords[i]);
  }

  var markers = {};
  var infoWindows = {};

  var mapOptions = {
    center: locations[0].latlng,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    zoom: 14,
    disableDefaultUI: true
  };

  var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
  var currentLocation = null;

  locations.forEach(function(loc) {
    var mk = createMarker(loc);
    markers[loc.uniqueId] = mk;

    if (loc.isIncluded()) {
      mk.setMap(map);
    }
  });

  // at this point, we have all required data to create a ViewModel
  var viewModel = new ViewModel(map, locations, markers, infoWindows);
  ko.applyBindings(viewModel);

  // Create a marker and related InfoWindow for a given location
  // The InfoWindow content is initialized when the marker is first clicked.
  function createMarker(loc) {
    var marker = new google.maps.Marker({
      position: loc.latlng,
      animation: google.maps.Animation.DROP,
      icon: 'images/red-dot.png'
    });

    var addr = loc.latlng.lat() + ',' + loc.latlng.lng();
    var imageUrl = 'https://maps.googleapis.com/maps/api/streetview';
    imageUrl += '?' + $.param({
      'size': '250x150'
    });
    imageUrl += '&' + $.param({
      'location': addr
    });
    imageUrl += '&' + $.param({
      'key': 'AIzaSyCVntsEb5exmG2Iwot9nZlTkSNxSy7ia2k'
    });

    var infoContent = null;

    var infoWindow = new google.maps.InfoWindow({
      maxWidth: 250
    });

    infoWindow.setZIndex(10);
    infoWindows[loc.uniqueId] = infoWindow;

    // handler for InfoWindow close event
    google.maps.event.addListener(infoWindow, 'closeclick', function() {
      if (currentLocation !== null) {
        currentLocation.isSelected(false);
      }

      marker.setIcon('images/red-dot.png');
    });

    // handler for marker click event
    marker.addListener('click', function() {
      // if a location is already selected, we ensure that it is un-selected.
      // marker icon is changed and the corresponding InfoWindow gets closed.
      if (currentLocation !== null) {
        currentLocation.isSelected(false);

        var iw = infoWindows[currentLocation.uniqueId];
        iw.close();

        var mk = markers[currentLocation.uniqueId];
        mk.setIcon('images/red-dot.png');
      }

      loc.isSelected(true);
      currentLocation = loc;

      // animate the marker
      marker.setIcon('images/purple-dot.png');
      marker.setAnimation(google.maps.Animation.BOUNCE);
      setTimeout(function() {
        marker.setAnimation(null);
      }, 200);

      // check if the InfoWindow content has already been fetched from external sources
      if (infoContent !== null) {
        infoWindow.open(map, marker);
        return;
      }

      // We have to fetch InfoWindow content via Ajax.
      // Initially, we show a wait message
      infoWindow.setContent('<div>Please wait...</div>');
      infoWindow.open(map, marker);

      // Create the parent div that will act as the container shown in InfoWindow
      infoContent = document.createElement('div');
      $(infoContent).addClass('info-container');
      $(infoContent).append('<img src="' + imageUrl + '" alt="' + loc.name + '"/>');

      // initiate the search for venue
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

    // handle the response for venue search request
    var venueSearchResponseHandler = function(data) {
      var venue = data.response.venues[0];
      var venueId = venue.id;
      var venueName = venue.name;
      var venueLocation = venue.location;
      var fullAddress = '';

      if (venueLocation.formattedAddress) {
        var j;
        var n = venueLocation.formattedAddress.length;

        for (j = 0; j < n; j++) {
          fullAddress += venueLocation.formattedAddress[j];

          if (j < n - 1) {
            fullAddress += ', ';
          }
        }
      }

      var category = venue.categories[0].name;

      // add data to InfoWindow container
      $(infoContent).append('<h3>Info from Foursquare</h3>');
      $(infoContent).append('<div class="info"><span class="key">Name: </span><span>' + venueName + '</span></div>');
      $(infoContent).append('<div class="info"><span class="key">Address: </span><span>' + fullAddress + '</span></div>');
      $(infoContent).append('<div class="info"><span class="key">Category: </span><span>' + category + '</span></div>');

      // initiate the search for reviews
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

    // handle the response for review search request
    var tipSearchResponseHandler = function(data) {
      var tip = data.response.tips.items[0];
      $(infoContent).append('<div class="info"><span class="key">Review: </span><span>' + tip.text + '</span></div>');
      infoWindow.setContent(infoContent);
    };

    // handle Ajax error in a generic manner
    var genericErrorHandler = function(jqXHR, textStatus, errorThrown) {
      alert('An error occurred while loading location info: ' + errorThrown);
      infoWindow.setContent(infoContent);
    };

    return marker;
  }
}

function googleMapError() {
  alert("An error occurred while loading Google map");
}
