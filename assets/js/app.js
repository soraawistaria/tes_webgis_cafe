/* CafeYuk! — interactive map and catalogue experience. */
(function () {
  "use strict";

  var CY = window.CafeYuk;
  var U = CY && CY.utils;

  if (!CY || CY.error || !CY.cafes.length) {
    var errorNode = document.querySelector("[data-catalog-error]");
    if (errorNode) {
      errorNode.hidden = false;
      errorNode.textContent =
        "Data cafe belum bisa dimuat. Pastikan folder export QGIS tetap berada di samping index.html.";
    }
    return;
  }

  var KALSEL_BOUNDS = [
    [-4.55, 113.2],
    [-1.25, 117.35]
  ];
  var INITIAL_BOUNDS = [
    [-4.236447637, 113.715741938],
    [-1.529848562, 117.007376287]
  ];

  var ICONS = {
    search:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.6"></circle><path d="m16 16 4.2 4.2"></path></svg>',
    filter:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"></path><circle cx="8" cy="6" r="1.7" fill="currentColor" stroke="none"></circle><circle cx="15" cy="12" r="1.7" fill="currentColor" stroke="none"></circle><circle cx="12" cy="18" r="1.7" fill="currentColor" stroke="none"></circle></svg>',
    pin:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5.2-8 11-8 11S4 15.2 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.6"></circle></svg>',
    star:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.2 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.2 5.9-.9L12 3.5Z"></path></svg>',
    x:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>',
    reset:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5A8 8 0 1 1 4.5 14"></path><path d="M5 3v5.5h5.5"></path></svg>',
    arrow:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"></path></svg>',
    clock:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.2"></circle><path d="M12 7.5V12l3 1.8"></path></svg>',
    coffee:
      '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 20h23v8.5A9.5 9.5 0 0 1 25.5 38h-4A9.5 9.5 0 0 1 12 28.5V20Z"></path><path d="M35 22h3.5a5 5 0 0 1 0 10H35"></path><path d="M9 42h29"></path><path d="M17 13c0-2.5 3-2.8 3-5M24 13c0-2.5 3-2.8 3-5M31 13c0-2.5 3-2.8 3-5"></path></svg>',
    cafe:
      '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M13 19h20v9a8 8 0 0 1-8 8h-4a8 8 0 0 1-8-8v-9Z"></path><path d="M33 21h3.5a4.5 4.5 0 0 1 0 9H33"></path><path d="M10 40h28"></path><path d="M17 13c0-2 2.5-2.3 2.5-4M24 13c0-2 2.5-2.3 2.5-4M31 13c0-2 2.5-2.3 2.5-4"></path></svg>',
    restaurant:
      '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M15 8v13M11 8v9a4 4 0 0 0 4 4v19M19 8v9a4 4 0 0 1-4 4M32 8c2.2 4 3.3 8 3.3 12 0 3-1.7 5-4.3 5V40M31 8v17"></path></svg>',
    spark:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.7 5.1 2.9 7.4 8 8-5.1.7-7.4 2.9-8 8-.7-5.1-2.9-7.4-8-8 5.1-.7 7.4-2.9 8-8Z"></path></svg>',
    map:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 5.5 5.5-2 6 2 5.5-2v15l-5.5 2-6-2-5.5 2v-15Z"></path><path d="M9 3.5v15M15 5.5v15"></path></svg>'
  };

  var CATEGORY = {
    coffee: {
      label: "Coffee Shop",
      color: "#4a2c1a",
      soft: "#e4cfc0",
      icon: ICONS.coffee
    },
    cafe: {
      label: "Cafe",
      color: "#dc8b4d",
      soft: "#f5d2ad",
      icon: ICONS.cafe
    },
    restaurant: {
      label: "Resto & Cafe",
      color: "#758f64",
      soft: "#d6dfcb",
      icon: ICONS.restaurant
    }
  };

  var QUICK_LABELS = {
    all: "Semua",
    nongkrong: "Nongkrong",
    belajar: "Belajar",
    wfc: "WFC",
    open24: "Buka 24 Jam",
    rating45: "Rating 4.5+"
  };

  var state = {
    query: "",
    area: "Semua",
    category: "Semua",
    minRating: 0,
    vibes: [],
    openNow: false,
    quick: "all",
    sort: "relevance",
    visible: 10,
    selectedId: null
  };

  var map;
  var cluster;
  var initialTileLayer;
  var markerById = new Map();
  var cafeById = new Map();
  var searchTimer;
  var toastTimer;

  var els = {
    search: document.getElementById("cafe-search"),
    searchClear: document.getElementById("search-clear"),
    sort: document.getElementById("cafe-sort"),
    quickRow: document.getElementById("quick-filters"),
    filterButton: document.getElementById("open-filter"),
    filterCount: document.getElementById("filter-count"),
    filterDialog: document.getElementById("filter-dialog"),
    filterForm: document.getElementById("filter-form"),
    filterArea: document.getElementById("filter-area"),
    filterPreview: document.getElementById("filter-preview"),
    closeFilter: document.getElementById("close-filter"),
    resetFilter: document.getElementById("reset-filter"),
    list: document.getElementById("cafe-list"),
    resultCount: document.getElementById("result-count"),
    resultMeta: document.getElementById("result-meta"),
    activeFilters: document.getElementById("active-filters"),
    loadMore: document.getElementById("load-more"),
    mapCount: document.getElementById("map-visible-count"),
    mapEmpty: document.getElementById("map-empty"),
    resetMap: document.getElementById("reset-map"),
    toast: document.getElementById("toast")
  };

  function icon(name) {
    return ICONS[name] || ICONS.spark;
  }

  function category(cafe) {
    return CATEGORY[cafe.category] || CATEGORY.cafe;
  }

  function formatNumber(value) {
    return U.formatNumber(value);
  }

  function formatRating(value) {
    return U.formatRating(value);
  }

  function escapeHtml(value) {
    return U.escapeHtml(value);
  }

  function isFiltered(filters) {
    return (
      Boolean(filters.query) ||
      filters.area !== "Semua" ||
      filters.category !== "Semua" ||
      Number(filters.minRating) > 0 ||
      filters.vibes.length > 0 ||
      filters.openNow ||
      filters.quick !== "all"
    );
  }

  function matches(cafe, filters) {
    if (filters.query) {
      var terms = filters.query
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      if (!terms.every(function (term) { return cafe.searchText.indexOf(term) !== -1; })) {
        return false;
      }
    }

    if (filters.area !== "Semua" && cafe.area !== filters.area) return false;
    if (filters.category !== "Semua" && cafe.category !== filters.category) return false;
    if (Number(filters.minRating) > 0 && cafe.rating < Number(filters.minRating)) return false;
    if (filters.openNow && !cafe.isOpen) return false;

    if (
      filters.vibes.length &&
      !filters.vibes.every(function (vibe) { return cafe.vibes.indexOf(vibe) !== -1; })
    ) {
      return false;
    }

    if (filters.quick === "nongkrong" && cafe.vibes.indexOf("Nongkrong") === -1) return false;
    if (filters.quick === "belajar" && cafe.vibes.indexOf("Belajar") === -1) return false;
    if (filters.quick === "wfc" && cafe.vibes.indexOf("WFC") === -1) return false;
    if (filters.quick === "open24" && !cafe.is24h) return false;
    if (filters.quick === "rating45" && cafe.rating < 4.5) return false;

    return true;
  }

  function filteredCafes(filters) {
    var result = CY.cafes.filter(function (cafe) { return matches(cafe, filters); });
    return result.sort(function (a, b) {
      if (filters.sort === "rating") {
        return b.rating - a.rating || b.reviews - a.reviews || a.name.localeCompare(b.name, "id");
      }
      if (filters.sort === "reviews") {
        return b.reviews - a.reviews || b.rating - a.rating || a.name.localeCompare(b.name, "id");
      }
      if (filters.sort === "name") {
        return a.name.localeCompare(b.name, "id");
      }
      return b.score - a.score || b.reviews - a.reviews || a.name.localeCompare(b.name, "id");
    });
  }

  function fullFilterCount() {
    var count = 0;
    if (state.area !== "Semua") count += 1;
    if (state.category !== "Semua") count += 1;
    if (state.minRating > 0) count += 1;
    if (state.vibes.length) count += 1;
    if (state.openNow) count += 1;
    if (state.quick !== "all") count += 1;
    return count;
  }

  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      els.toast.classList.remove("is-visible");
    }, 2800);
  }

  /* ------------------------------------------------------------------ */
  /* Map                                                                */
  /* ------------------------------------------------------------------ */

  function markerIcon(cafe) {
    return L.divIcon({
      className: "cafe-pin cafe-pin-" + cafe.category,
      html: '<span class="cafe-pin-dot"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
  }

  function tooltipHtml(cafe) {
    return (
      '<div class="map-tip">' +
      '<strong>' + escapeHtml(cafe.name) + "</strong>" +
      '<span class="map-tip-address">' + escapeHtml(cafe.address) + "</span>" +
      "</div>"
    );
  }

  function popupHtml(cafe) {
    var cat = category(cafe);
    var rating =
      cafe.rating > 0
        ? '<span class="popup-rating">' + icon("star") + formatRating(cafe.rating) +
          "<small>(" + formatNumber(cafe.reviews) + " ulasan)</small></span>"
        : '<span class="popup-rating is-new">Baru · belum ada ulasan</span>';

    var tags = cafe.vibes
      .slice(0, 3)
      .map(function (vibe) { return "<span>" + escapeHtml(vibe) + "</span>"; })
      .join("");

    return (
      '<div class="popup-card" style="--cat-color:' + cat.color + '">' +
      '<div class="popup-top">' +
      '<span class="popup-cat">' + icon(cafe.category) + escapeHtml(cat.label) + "</span>" +
      '<span class="popup-status ' + (cafe.isOpen ? "is-open" : "") + '">' +
      '<i></i>' + escapeHtml(cafe.statusLabel) + "</span>" +
      "</div>" +
      '<h3>' + escapeHtml(cafe.name) + "</h3>" +
      rating +
      '<p class="popup-address">' + escapeHtml(cafe.address) + "</p>" +
      '<div class="popup-details">' +
      '<span>' + icon("pin") + escapeHtml(cafe.areaLabel) + "</span>" +
      '<span>' + icon("clock") + escapeHtml(cafe.todayHours) + "</span>" +
      "</div>" +
      '<div class="popup-tags">' + tags + "</div>" +
      '<a class="popup-link" href="https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(cafe.lat + "," + cafe.lng) +
      '" target="_blank" rel="noopener">Buka rute di Google Maps' + icon("arrow") + "</a>" +
      "</div>"
    );
  }

  function createMap() {
    if (!window.L) {
      showToast("Pustaka peta gagal dimuat.");
      return;
    }

    map = L.map("map", {
      zoomControl: false,
      minZoom: 7,
      maxZoom: 18,
      maxBounds: L.latLngBounds(KALSEL_BOUNDS).pad(0.08),
      maxBoundsViscosity: 0.65,
      preferCanvas: true,
      scrollWheelZoom: true
    });

    map.fitBounds(INITIAL_BOUNDS, { padding: [12, 12] });

    initialTileLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        subdomains: "abc",
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
      }
    ).addTo(map);

    if (typeof json_batas_kota_2 !== "undefined") {
      L.geoJSON(json_batas_kota_2, {
        interactive: false,
        style: {
          color: "#4a2c1a",
          weight: 1.15,
          opacity: 0.6,
          fillColor: "#f2e6dc",
          fillOpacity: 0.08,
          dashArray: "5 4"
        }
      }).addTo(map);
    }

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
        maxWidth: 110
      })
      .addTo(map);

    map.attributionControl.setPrefix(
      '<a href="index.html">CafeYuk!</a>'
    );
    map.attributionControl.addAttribution("Data peta: QGIS CafeYuk!");

    cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 14,
      maxClusterRadius: 48,
      iconCreateFunction: function (group) {
        var count = group.getChildCount();
        var size = count < 10 ? "sm" : count < 100 ? "md" : "lg";
        return L.divIcon({
          html: '<span class="cluster-bubble ' + size + '">' + formatNumber(count) + "</span>",
          className: "cafe-cluster",
          iconSize: L.point(48, 48),
          iconAnchor: [24, 24]
        });
      }
    });
    map.addLayer(cluster);

    CY.cafes.forEach(function (cafe) {
      cafeById.set(cafe.id, cafe);
      var marker = L.marker([cafe.lat, cafe.lng], {
        icon: markerIcon(cafe),
        riseOnHover: true,
        title: cafe.name
      });
      marker.bindTooltip(tooltipHtml(cafe), {
        className: "cafe-tooltip",
        direction: "top",
        offset: [0, -7],
        opacity: 1,
        sticky: true
      });
      marker.bindPopup(popupHtml(cafe), {
        className: "cafe-popup",
        maxWidth: 330,
        minWidth: 292,
        autoPanPadding: [26, 26]
      });

      marker.on("mouseover", function () {
        var element = marker.getElement();
        if (element) element.classList.add("is-hover");
      });
      marker.on("mouseout", function () {
        var element = marker.getElement();
        if (element) element.classList.remove("is-hover");
      });
      marker.on("popupopen", function () {
        setSelectedCafe(cafe.id, false);
      });
      marker.on("popupclose", function () {
        if (state.selectedId === cafe.id) setSelectedCafe(null);
      });

      markerById.set(cafe.id, marker);
    });

    document.getElementById("map-loading").classList.add("is-hidden");
    map.invalidateSize();
  }

  function renderMap(cafes) {
    if (!cluster) return;
    cluster.clearLayers();
    var markers = [];
    cafes.forEach(function (cafe) {
      var marker = markerById.get(cafe.id);
      if (marker) markers.push(marker);
    });
    cluster.addLayers(markers);

    if (els.mapCount) els.mapCount.textContent = formatNumber(cafes.length);
    if (els.mapEmpty) els.mapEmpty.hidden = cafes.length > 0 ? true : false;

    if (state.selectedId && cafes.every(function (cafe) { return cafe.id !== state.selectedId; })) {
      state.selectedId = null;
    }
  }

  function fitMapTo(cafes, animate) {
    if (!map) return;
    if (!cafes.length) return;
    if (cafes.length === CY.cafes.length) {
      map.fitBounds(INITIAL_BOUNDS, { padding: [16, 16], animate: Boolean(animate) });
      return;
    }

    var bounds = L.latLngBounds(cafes.map(function (cafe) { return [cafe.lat, cafe.lng]; }));
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.12), {
        padding: [32, 32],
        maxZoom: 14,
        animate: Boolean(animate)
      });
    }
  }

  function setSelectedCafe(id, scrollToCard) {
    state.selectedId = id;
    document.querySelectorAll(".cafe-card.is-selected").forEach(function (node) {
      node.classList.remove("is-selected");
      node.setAttribute("aria-pressed", "false");
    });
    document.querySelectorAll(".cafe-pin.is-selected").forEach(function (node) {
      node.classList.remove("is-selected");
    });

    if (!id) return;
    var card = document.querySelector('.cafe-card[data-cafe-id="' + cssEscape(id) + '"]');
    if (card) {
      card.classList.add("is-selected");
      card.setAttribute("aria-pressed", "true");
      if (scrollToCard) card.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    var marker = markerById.get(id);
    if (marker && marker.getElement()) {
      marker.getElement().classList.add("is-selected");
    }
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function revealMap() {
    if (!window.matchMedia("(max-width: 960px)").matches) return;
    var frame = document.querySelector(".map-frame");
    if (frame) frame.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function focusCafe(cafe) {
    if (!map) return;
    var marker = markerById.get(cafe.id);
    if (!marker) return;
    state.visible = Math.max(state.visible, 10);
    setSelectedCafe(cafe.id, true);

    if (cluster && typeof cluster.zoomToShowLayer === "function") {
      cluster.zoomToShowLayer(marker, function () {
        marker.openPopup();
        revealMap();
      });
    } else {
      map.flyTo([cafe.lat, cafe.lng], 14, { duration: 0.7 });
      map.once("moveend", function () {
        marker.openPopup();
        revealMap();
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Results list                                                       */
  /* ------------------------------------------------------------------ */

  function cardTemplate(cafe, index) {
    var cat = category(cafe);
    var tags = cafe.vibes
      .filter(function (vibe) { return vibe !== "Buka 24 Jam"; })
      .slice(0, 2)
      .map(function (vibe) { return "<span>" + escapeHtml(vibe) + "</span>"; })
      .join("");

    var rating =
      cafe.rating > 0
        ? '<span class="card-rating">' + icon("star") + "<b>" + formatRating(cafe.rating) +
          "</b><small>(" + formatNumber(cafe.reviews) + ")</small></span>"
        : '<span class="card-rating is-new">Baru</span>';

    return (
      '<article class="cafe-card' + (state.selectedId === cafe.id ? " is-selected" : "") +
      '" data-cafe-id="' + escapeHtml(cafe.id) + '" tabindex="0" role="button" aria-pressed="' +
      (state.selectedId === cafe.id ? "true" : "false") +
      '" aria-label="Lihat ' + escapeHtml(cafe.name) + ' di peta">' +
      '<div class="cafe-thumb cat-' + cafe.category + '">' +
      '<span class="cafe-rank">' + String(index + 1).padStart(2, "0") + "</span>" +
      '<span class="thumb-icon">' + cat.icon + "</span>" +
      '<span class="thumb-orbit"></span>' +
      "</div>" +
      '<div class="cafe-card-body">' +
      '<div class="card-topline">' +
      '<span class="card-cat">' + escapeHtml(cat.label) + "</span>" +
      '<span class="card-open ' + (cafe.isOpen ? "is-open" : "") + '"><i></i>' +
      escapeHtml(cafe.statusLabel) + "</span>" +
      "</div>" +
      "<h3>" + escapeHtml(cafe.name) + "</h3>" +
      '<p class="card-address">' + escapeHtml(cafe.address) + "</p>" +
      '<div class="card-meta">' +
      rating +
      '<span class="card-area">' + icon("pin") + escapeHtml(cafe.areaLabel) + "</span>" +
      "</div>" +
      '<div class="card-tags">' + tags + "</div>" +
      "</div>" +
      "</article>"
    );
  }

  function renderResults(cafes) {
    var total = cafes.length;
    var visible = cafes.slice(0, state.visible);

    if (els.resultCount) els.resultCount.textContent = formatNumber(total);
    if (els.resultMeta) {
      var copy = total
        ? "Menampilkan " + formatNumber(visible.length) + " dari " + formatNumber(total) + " cafe"
        : "Belum ada cafe yang cocok";
      if (total && isFiltered(state)) copy += " sesuai filtermu";
      els.resultMeta.textContent = copy;
    }

    if (!total) {
      els.list.innerHTML =
        '<div class="empty-state">' +
        '<span class="empty-icon">' + icon("search") + "</span>" +
        "<h3>Belum ketemu, nih.</h3>" +
        "<p>Coba kata kunci lain atau longgarkan filter biar pilihanmu makin luas.</p>" +
        '<button type="button" class="button button-outline" data-clear-all>Bersihkan filter</button>' +
        "</div>";
      els.loadMore.hidden = true;
      return;
    }

    els.list.innerHTML = visible.map(cardTemplate).join("");

    var remaining = total - visible.length;
    els.loadMore.hidden = remaining <= 0;
    if (remaining > 0) {
      els.loadMore.textContent =
        "Tampilkan " + Math.min(10, remaining) + " cafe lagi (" + formatNumber(remaining) + " tersisa)";
    }

    var selected = document.querySelector(
      '.cafe-card[data-cafe-id="' + cssEscape(state.selectedId || "") + '"]'
    );
    if (selected) selected.classList.add("is-selected");
  }

  /* ------------------------------------------------------------------ */
  /* Active filter chips                                                */
  /* ------------------------------------------------------------------ */

  function activeChips() {
    var chips = [];

    if (state.query) {
      chips.push({ key: "query", label: 'Cari: "' + state.query + '"' });
    }
    if (state.quick !== "all") {
      chips.push({ key: "quick", label: QUICK_LABELS[state.quick] });
    }
    if (state.area !== "Semua") {
      var area = CY.areas.find(function (item) { return item.name === state.area; });
      chips.push({ key: "area", label: area ? area.label : state.area });
    }
    if (state.category !== "Semua") {
      chips.push({ key: "category", label: category({ category: state.category }).label });
    }
    if (state.minRating > 0) {
      chips.push({ key: "rating", label: "Rating " + formatRating(state.minRating) + "+" });
    }
    state.vibes.forEach(function (vibe) {
      chips.push({ key: "vibe", value: vibe, label: vibe });
    });
    if (state.openNow) {
      chips.push({ key: "openNow", label: "Buka sekarang" });
    }

    return chips;
  }

  function renderActiveFilters() {
    if (!els.activeFilters) return;
    var chips = activeChips();

    if (!chips.length) {
      els.activeFilters.hidden = true;
      els.activeFilters.innerHTML = "";
      return;
    }

    els.activeFilters.hidden = false;
    els.activeFilters.innerHTML =
      '<div class="active-filter-list">' +
      chips
        .map(function (chip) {
          return (
            '<button type="button" class="active-chip" data-remove-filter="' + chip.key + '"' +
            (chip.value ? ' data-filter-value="' + escapeHtml(chip.value) + '"' : "") +
            ' aria-label="Hapus filter ' + escapeHtml(chip.label) + '">' +
            escapeHtml(chip.label) + icon("x") + "</button>"
          );
        })
        .join("") +
      "</div>" +
      '<button type="button" class="clear-filters" data-clear-all>Hapus semua</button>';
  }

  function syncFilterButton() {
    var count = fullFilterCount();
    if (els.filterCount) {
      els.filterCount.textContent = String(count);
      els.filterCount.hidden = count === 0;
    }
    if (els.filterButton) {
      els.filterButton.classList.toggle("has-filters", count > 0);
    }
  }

  function syncQuickFilters() {
    if (!els.quickRow) return;
    els.quickRow.querySelectorAll("[data-quick]").forEach(function (button) {
      var active = button.getAttribute("data-quick") === state.quick;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  /* ------------------------------------------------------------------ */
  /* Main render                                                        */
  /* ------------------------------------------------------------------ */

  function render(options) {
    var opts = options || {};
    var cafes = filteredCafes(state);

    if (opts.resetVisible) state.visible = 10;
    if (state.visible < 10) state.visible = 10;

    renderResults(cafes);
    renderMap(cafes);
    renderActiveFilters();
    syncFilterButton();
    syncQuickFilters();

    if (opts.fitMap) fitMapTo(cafes, true);
    if (state.selectedId) setSelectedCafe(state.selectedId, false);
  }

  function resetAllFilters() {
    state.query = "";
    state.area = "Semua";
    state.category = "Semua";
    state.minRating = 0;
    state.vibes = [];
    state.openNow = false;
    state.quick = "all";
    state.selectedId = null;
    if (els.search) els.search.value = "";
    if (els.searchClear) els.searchClear.hidden = true;
    render({ resetVisible: true, fitMap: true });
    showToast("Filter sudah dibersihkan.");
  }

  /* ------------------------------------------------------------------ */
  /* Filter dialog                                                      */
  /* ------------------------------------------------------------------ */

  function fillAreaOptions() {
    if (!els.filterArea) return;
    var options = ['<option value="Semua">Semua area</option>'];
    CY.areas.forEach(function (area) {
      options.push(
        '<option value="' + escapeHtml(area.name) + '">' +
        escapeHtml(area.label) + " (" + formatNumber(area.count) + ")" +
        "</option>"
      );
    });
    els.filterArea.innerHTML = options.join("");
  }

  function populateFilterForm() {
    if (els.filterArea) els.filterArea.value = state.area;

    var categoryValue = state.category;
    document.querySelectorAll('input[name="filter-category"]').forEach(function (input) {
      input.checked = input.value === categoryValue;
    });

    document.querySelectorAll('input[name="filter-rating"]').forEach(function (input) {
      input.checked = Number(input.value) === Number(state.minRating);
    });

    document.querySelectorAll('input[name="filter-vibe"]').forEach(function (input) {
      input.checked = state.vibes.indexOf(input.value) !== -1;
    });

    var openNow = document.getElementById("filter-open-now");
    if (openNow) openNow.checked = state.openNow;

    updateFilterPreview();
  }

  function readFilterDraft() {
    var selectedVibes = [];
    document.querySelectorAll('input[name="filter-vibe"]:checked').forEach(function (input) {
      selectedVibes.push(input.value);
    });

    var ratingInput = document.querySelector('input[name="filter-rating"]:checked');
    var categoryInput = document.querySelector('input[name="filter-category"]:checked');
    var openNow = document.getElementById("filter-open-now");

    return {
      query: state.query,
      area: els.filterArea ? els.filterArea.value : "Semua",
      category: categoryInput ? categoryInput.value : "Semua",
      minRating: ratingInput ? Number(ratingInput.value) : 0,
      vibes: selectedVibes,
      openNow: Boolean(openNow && openNow.checked),
      quick: state.quick,
      sort: state.sort
    };
  }

  function updateFilterPreview() {
    if (!els.filterPreview) return;
    var draft = readFilterDraft();
    var count = CY.cafes.filter(function (cafe) { return matches(cafe, draft); }).length;
    els.filterPreview.textContent = count ? formatNumber(count) + " cafe" : "Tidak ada cafe";
  }

  function openFilterDialog() {
    if (!els.filterDialog) return;
    populateFilterForm();
    document.body.classList.add("modal-open");

    if (typeof els.filterDialog.showModal === "function") {
      if (!els.filterDialog.open) els.filterDialog.showModal();
    } else {
      els.filterDialog.setAttribute("open", "");
    }
  }

  function closeFilterDialog() {
    if (!els.filterDialog) return;
    if (typeof els.filterDialog.close === "function" && els.filterDialog.open) {
      els.filterDialog.close();
    } else {
      els.filterDialog.removeAttribute("open");
    }
    document.body.classList.remove("modal-open");
  }

  function applyFilters(event) {
    if (event) event.preventDefault();
    var draft = readFilterDraft();
    state.area = draft.area;
    state.category = draft.category;
    state.minRating = draft.minRating;
    state.vibes = draft.vibes;
    state.openNow = draft.openNow;
    state.selectedId = null;
    closeFilterDialog();
    render({ resetVisible: true, fitMap: true });
    showToast(
      filteredCafes(state).length
        ? "Filter diterapkan. Ketemu " + formatNumber(filteredCafes(state).length) + " cafe."
        : "Tidak ada cafe dengan kombinasi filter ini."
    );
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                             */
  /* ------------------------------------------------------------------ */

  function bindEvents() {
    if (els.search) {
      els.search.addEventListener("input", function () {
        state.query = els.search.value.trim();
        if (els.searchClear) els.searchClear.hidden = !els.search.value;
        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(function () {
          state.selectedId = null;
          render({ resetVisible: true });
        }, 180);
      });
    }

    var searchForm = document.querySelector(".search-form");
    if (searchForm) {
      searchForm.addEventListener("submit", function (event) {
        event.preventDefault();
        state.query = els.search ? els.search.value.trim() : "";
        state.selectedId = null;
        render({ resetVisible: true });
        document.getElementById("jelajah").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    if (els.searchClear) {
      els.searchClear.addEventListener("click", function () {
        els.search.value = "";
        state.query = "";
        els.searchClear.hidden = true;
        state.selectedId = null;
        els.search.focus();
        render({ resetVisible: true, fitMap: true });
      });
    }

    if (els.quickRow) {
      els.quickRow.addEventListener("click", function (event) {
        var button = event.target.closest("[data-quick]");
        if (!button) return;
        var value = button.getAttribute("data-quick");
        state.quick = state.quick === value && value !== "all" ? "all" : value;
        state.selectedId = null;
        render({ resetVisible: true, fitMap: true });
      });
    }

    if (els.sort) {
      els.sort.addEventListener("change", function () {
        state.sort = els.sort.value;
        render({ resetVisible: true });
      });
    }

    if (els.filterButton) els.filterButton.addEventListener("click", openFilterDialog);
    if (els.closeFilter) els.closeFilter.addEventListener("click", closeFilterDialog);
    if (els.filterForm) {
      els.filterForm.addEventListener("change", updateFilterPreview);
      els.filterForm.addEventListener("submit", applyFilters);
    }

    if (els.resetFilter) {
      els.resetFilter.addEventListener("click", function () {
        if (els.filterArea) els.filterArea.value = "Semua";
        document.querySelectorAll('input[name="filter-category"]').forEach(function (input) {
          input.checked = input.value === "Semua";
        });
        document.querySelectorAll('input[name="filter-rating"]').forEach(function (input) {
          input.checked = Number(input.value) === 0;
        });
        document.querySelectorAll('input[name="filter-vibe"]').forEach(function (input) {
          input.checked = false;
        });
        var openNow = document.getElementById("filter-open-now");
        if (openNow) openNow.checked = false;
        updateFilterPreview();
      });
    }

    if (els.filterDialog) {
      els.filterDialog.addEventListener("click", function (event) {
        if (event.target === els.filterDialog) closeFilterDialog();
      });
      els.filterDialog.addEventListener("close", function () {
        document.body.classList.remove("modal-open");
      });
    }

    if (els.list) {
      els.list.addEventListener("click", function (event) {
        if (event.target.closest("[data-clear-all]")) {
          resetAllFilters();
          return;
        }
        var card = event.target.closest(".cafe-card");
        if (!card) return;
        var cafe = cafeById.get(card.getAttribute("data-cafe-id"));
        if (cafe) focusCafe(cafe);
      });

      els.list.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        var card = event.target.closest(".cafe-card");
        if (!card) return;
        event.preventDefault();
        var cafe = cafeById.get(card.getAttribute("data-cafe-id"));
        if (cafe) focusCafe(cafe);
      });
    }

    if (els.loadMore) {
      els.loadMore.addEventListener("click", function () {
        state.visible += 10;
        renderResults(filteredCafes(state));
      });
    }

    if (els.activeFilters) {
      els.activeFilters.addEventListener("click", function (event) {
        if (event.target.closest("[data-clear-all]")) {
          resetAllFilters();
          return;
        }

        var remove = event.target.closest("[data-remove-filter]");
        if (!remove) return;
        var key = remove.getAttribute("data-remove-filter");

        if (key === "query") {
          state.query = "";
          if (els.search) els.search.value = "";
          if (els.searchClear) els.searchClear.hidden = true;
        }
        if (key === "quick") state.quick = "all";
        if (key === "area") state.area = "Semua";
        if (key === "category") state.category = "Semua";
        if (key === "rating") state.minRating = 0;
        if (key === "openNow") state.openNow = false;
        if (key === "vibe") {
          var value = remove.getAttribute("data-filter-value");
          state.vibes = state.vibes.filter(function (vibe) { return vibe !== value; });
        }

        state.selectedId = null;
        render({ resetVisible: true, fitMap: true });
      });
    }

    if (els.resetMap) {
      els.resetMap.addEventListener("click", function () {
        if (!map) return;
        map.closePopup();
        map.fitBounds(INITIAL_BOUNDS, { padding: [16, 16], animate: true });
        setSelectedCafe(null);
        showToast("Peta kembali ke Kalimantan Selatan.");
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && els.filterDialog && els.filterDialog.open) {
        closeFilterDialog();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                               */
  /* ------------------------------------------------------------------ */

  function hydrateStaticStats() {
    document.querySelectorAll("[data-stat]").forEach(function (node) {
      var key = node.getAttribute("data-stat");
      var value = CY.stats[key];
      if (key === "averageRating") value = formatRating(value);
      else value = formatNumber(value);
      node.textContent = value;
    });

    document.querySelectorAll("[data-count]").forEach(function (node) {
      var key = node.getAttribute("data-count");
      node.textContent = formatNumber(CY.stats[key] || 0);
    });

    document.querySelectorAll("[data-data-note]").forEach(function (node) {
      node.textContent =
        formatNumber(CY.stats.total) + " cafe · " +
        formatNumber(CY.stats.areaCount) + " kabupaten/kota · data QGIS";
    });
  }

  function init() {
    hydrateStaticStats();
    fillAreaOptions();
    bindEvents();
    createMap();
    render({ resetVisible: true });

    if (els.resultCount) {
      els.resultCount.textContent = formatNumber(CY.cafes.length);
    }

    /* Keep the interaction hint visible for a moment, then let the map breathe. */
    var hint = document.querySelector(".map-hint");
    if (hint) {
      window.setTimeout(function () {
        hint.classList.add("is-muted");
      }, 5200);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
