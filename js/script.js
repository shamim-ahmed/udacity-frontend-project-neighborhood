var Location = function(uniqueId, name, latlng) {
  this.uniqueId = uniqueId;
  this.name = name;
  this.latlng = latlng;
  this.isIncluded = ko.observable(true);
  this.isSelected = ko.observable(false);
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
    self.locations.forEach(function(loc) {
      if (loc.isSelected()) {
        loc.isSelected(false);
      }
    });

    selectedLoc.isSelected(true);

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
      marker.setIcon('images/red-dot.png');
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
  var currentLocation = null;

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

  var center = locations[0].latlng;
  var markers = {};
  var infoWindows = {};
  google.maps.event.addDomListener(window, 'load', initialize);

  // this function is used to initialize the map with the right center and markers
  function initialize() {
    var mapOptions = {
      center: center,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      zoom: 14,
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
      animation: google.maps.Animation.DROP,
      icon: 'images/red-dot.png'
    });

    var addr = loc.latlng.lat() + ',' + loc.latlng.lng();
    var imageUrl = 'http://maps.googleapis.com/maps/api/streetview';
    imageUrl += '?' + $.param({'size': '250x150'});
    imageUrl += '&' + $.param({'location': addr});

    var infoContent = null;

    var infoWindow = new google.maps.InfoWindow({
      maxWidth: 250
    });

    infoWindow.setZIndex(10);
    infoWindows[loc.uniqueId] = infoWindow;

    google.maps.event.addListener(infoWindow, 'closeclick', function() {
      if (currentLocation !== null) {
        currentLocation.isSelected(false);
      }

      marker.setIcon('images/red-dot.png');
    });

    marker.addListener('click', function() {
      if (currentLocation !== null) {
        currentLocation.isSelected(false);

        var iw = infoWindows[currentLocation.uniqueId];
        iw.close();

        var mk = markers[currentLocation.uniqueId];
        mk.setIcon('images/red-dot.png');
      }

      loc.isSelected(true);
      currentLocation = loc;
      marker.setIcon('images/purple-dot.png');

      // check if the infowindow content has already been fetched from external sources
      if (infoContent !== null) {
        infoWindow.open(map, marker);
        return;
      }

      // Initially, we show a wait message
      infoWindow.setContent('<div>Please wait...</div>');
      infoWindow.open(map, marker);

      // we have to fetch location specific info from external sources
      // we start by creating the parent div
      infoContent = document.createElement('div');
      $(infoContent).addClass('info-container');
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
      $(infoContent).append('<h3>Info from Foursquare</h3>');
      $(infoContent).append('<div class="info"><span class="key">Name: </span><span>' + venueName + '</span></div>');
      $(infoContent).append('<div class="info"><span class="key">Address: </span><span>' + fullAddress + '</span></div>');
      $(infoContent).append('<div class="info"><span class="key">Category: </span><span>' + category + '</span></div>');

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
      $(infoContent).append('<div class="info"><span class="key">Review: </span><span>' + tip.text + '</span></div>');
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
