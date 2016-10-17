
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

  google.maps.event.addDomListener(window, 'load', initialize);

  function initialize() {
    var latlng = new google.maps.LatLng(40.71, -73.32);

    var mapOptions = {
      center: latlng,
      scrollWheel: false,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      zoom: 13,
      disableDefaultUI: true
    };

    var marker = new google.maps.Marker({
      position: latlng,
      url: '/',
      animation: google.maps.Animation.DROP
    });

    var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    marker.setMap(map);
  }
});
