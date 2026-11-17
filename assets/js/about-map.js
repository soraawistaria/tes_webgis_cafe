/* CafeYuk! — compact coverage map for the About page. */
(function () {
  "use strict";

  var CY = window.CafeYuk;
  var U = CY && CY.utils;

  function showError(message) {
    var node = document.querySelector("[data-catalog-error]");
    if (!node) return;
    node.hidden = false;
    node.textContent = message;
  }

  if (!CY || CY.error || !CY.cafes.length) {
    showError(
      "Data cafe belum bisa dimuat. Pastikan folder export QGIS tetap berada di samping about.html."
    );
    return;
  }

  var BOUNDS = [
    [-4.236447637, 113.715741938],
    [-1.529848562, 117.007376287]
  ];

  var KALSEL_BOUNDS = [
    [-4.55, 113.2],
    [-1.25, 117.35]
  ];

  var COLORS = {
    coffee: "#4a2c1a",
    cafe: "#dc8b4d",
    restaurant: "#758f64"
  };

  function hydrateStats() {
    document.querySelectorAll("[data-stat]").forEach(function (node) {
      var key = node.getAttribute("data-stat");
      var value = CY.stats[key];
      if (key === "averageRating") value = U.formatRating(value);
      else value = U.formatNumber(value);
      node.textContent = value;
    });
  }

  function createMap() {
    if (!window.L) {
      showError("Pustaka peta gagal dimuat. Coba muat ulang halaman.");
      return;
    }

    var map = L.map("about-map", {
      zoomControl: false,
      minZoom: 7,
      maxZoom: 16,
      maxBounds: L.latLngBounds(KALSEL_BOUNDS).pad(0.08),
      maxBoundsViscosity: 0.65,
      scrollWheelZoom: false,
      preferCanvas: true
    });

    map.fitBounds(BOUNDS, { padding: [10, 10] });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      subdomains: "abc",
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(map);

    if (typeof json_batas_kota_2 !== "undefined") {
      L.geoJSON(json_batas_kota_2, {
        interactive: false,
        style: {
          color: "#4a2c1a",
          weight: 1.1,
          opacity: 0.55,
          fillColor: "#f2e6dc",
          fillOpacity: 0.1,
          dashArray: "5 4"
        }
      }).addTo(map);
    }

    var renderer = L.canvas({ padding: 0.45 });
    var dots = L.layerGroup();

    CY.cafes.forEach(function (cafe) {
      var marker = L.circleMarker([cafe.lat, cafe.lng], {
        renderer: renderer,
        radius: 2.6,
        color: "#000500",
        weight: 0.6,
        opacity: 0.55,
        fillColor: COLORS[cafe.category] || COLORS.cafe,
        fillOpacity: 0.92,
        bubblingMouseEvents: false
      });

      marker.bindTooltip(U.escapeHtml(cafe.name), {
        className: "cafe-tooltip",
        direction: "top",
        offset: [0, -4],
        sticky: true,
        opacity: 1
      });

      dots.addLayer(marker);
    });

    dots.addTo(map);

    L.control
      .zoom({
        position: "topright",
        zoomInTitle: "Perbesar peta",
        zoomOutTitle: "Perkecil peta"
      })
      .addTo(map);

    L.control
      .scale({
        position: "bottomright",
        imperial: false,
        maxWidth: 100
      })
      .addTo(map);

    map.attributionControl.setPrefix('<a href="index.html">CafeYuk!</a>');
    map.attributionControl.addAttribution("Data: QGIS CafeYuk!");

    window.setTimeout(function () {
      map.invalidateSize();
    }, 120);
  }

  hydrateStats();
  createMap();
})();
