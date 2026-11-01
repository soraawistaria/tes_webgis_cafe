/* CafeYuk! — shared catalogue helpers.
   Reads the GeoJSON layers exported from QGIS and turns them into
   a compact, filter-friendly cafe catalogue. */
(function (global) {
  "use strict";

  var DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];

  var DAY_LABELS = {
    Sunday: "Minggu",
    Monday: "Senin",
    Tuesday: "Selasa",
    Wednesday: "Rabu",
    Thursday: "Kamis",
    Friday: "Jumat",
    Saturday: "Sabtu"
  };

  var areaFallbacks = [
    { name: "Banjarmasin", patterns: [/banjarmasin/i] },
    { name: "Banjar Baru", patterns: [/banjarbaru/i, /banjar\s*baru/i] },
    { name: "Tanah Laut", patterns: [/tanah\s*laut/i] },
    { name: "Tanah Bumbu", patterns: [/tanah\s*bumbu/i] },
    { name: "Kota Baru", patterns: [/kotabaru/i, /kota\s*baru/i] },
    { name: "Tabalong", patterns: [/tabalong/i] },
    { name: "Tapin", patterns: [/tapin/i] },
    { name: "Balangan", patterns: [/balangan/i] },
    { name: "Hulu Sungai Selatan", patterns: [/hulu\s*sungai\s*selatan/i] },
    { name: "Hulu Sungai Tengah", patterns: [/hulu\s*sungai\s*tengah/i] },
    { name: "Hulu Sungai Utara", patterns: [/hulu\s*sungai\s*utara/i] },
    { name: "Barito Kuala", patterns: [/barito\s*kuala/i] },
    {
      name: "Banjar",
      patterns: [/\bbanjar\b/i, /martapura/i, /kabupaten\s+banjar/i]
    }
  ];

  function cleanText(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/\uFFFD/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    return cleanText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function number(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback || 0;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("id-ID").format(value || 0);
  }

  function formatRating(value) {
    if (!value) return "Baru";
    return number(value).toLocaleString("id-ID", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  }

  function formatCompact(value) {
    var count = number(value);
    if (count >= 1000) {
      return (count / 1000).toLocaleString("id-ID", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }) + " rb";
    }
    return formatNumber(count);
  }

  /* ------------------------------------------------------------------ */
  /* Geometry helpers — used to read the regency from the QGIS polygon. */
  /* ------------------------------------------------------------------ */

  function pointInRing(lng, lat, ring) {
    var inside = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var xi = ring[i][0];
      var yi = ring[i][1];
      var xj = ring[j][0];
      var yj = ring[j][1];
      var intersects =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi || Number.EPSILON) + xi;
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function pointInPolygonRings(lng, lat, rings) {
    if (!rings || !rings.length || !pointInRing(lng, lat, rings[0])) return false;
    for (var i = 1; i < rings.length; i += 1) {
      if (pointInRing(lng, lat, rings[i])) return false;
    }
    return true;
  }

  function pointInGeometry(lng, lat, geometry) {
    if (!geometry) return false;
    if (geometry.type === "Polygon") {
      return pointInPolygonRings(lng, lat, geometry.coordinates);
    }
    if (geometry.type === "MultiPolygon") {
      for (var i = 0; i < geometry.coordinates.length; i += 1) {
        if (pointInPolygonRings(lng, lat, geometry.coordinates[i])) return true;
      }
    }
    return false;
  }

  function geometryBounds(geometry) {
    var b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    function walk(coords) {
      if (typeof coords[0] === "number") {
        b.minX = Math.min(b.minX, coords[0]);
        b.maxX = Math.max(b.maxX, coords[0]);
        b.minY = Math.min(b.minY, coords[1]);
        b.maxY = Math.max(b.maxY, coords[1]);
      } else {
        coords.forEach(walk);
      }
    }
    if (geometry && geometry.coordinates) walk(geometry.coordinates);
    return b;
  }

  function buildRegions() {
    if (typeof global.json_batas_kota_2 === "undefined") return [];
    var features = global.json_batas_kota_2.features || [];
    return features.map(function (feature) {
      var props = feature.properties || {};
      var name = cleanText(props.NAME_2);
      var type = cleanText(props.TYPE_2);
      return {
        name: name,
        type: type,
        label: (type === "Kota" ? "Kota " : "Kab. ") + name,
        bounds: geometryBounds(feature.geometry),
        geometry: feature.geometry
      };
    });
  }

  function regionAt(lng, lat, regions) {
    for (var i = 0; i < regions.length; i += 1) {
      var region = regions[i];
      var b = region.bounds;
      if (
        lng >= b.minX &&
        lng <= b.maxX &&
        lat >= b.minY &&
        lat <= b.maxY &&
        pointInGeometry(lng, lat, region.geometry)
      ) {
        return region;
      }
    }
    return null;
  }

  function regionFromAddress(address, regions) {
    for (var i = 0; i < areaFallbacks.length; i += 1) {
      var fallback = areaFallbacks[i];
      if (fallback.patterns.some(function (pattern) { return pattern.test(address); })) {
        for (var r = 0; r < regions.length; r += 1) {
          if (regions[r].name === fallback.name) return regions[r];
        }
      }
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Opening-hours parsing.                                             */
  /* ------------------------------------------------------------------ */

  function parseTime(hour, minute, meridiem) {
    var h = number(hour);
    var m = number(minute);
    if (meridiem === "pm" && h !== 12) h += 12;
    if (meridiem === "am" && h === 12) h = 0;
    return h * 60 + m;
  }

  function parseSlot(raw) {
    var text = cleanText(raw);
    if (!text) return null;
    if (/closed|tutup/i.test(text)) return { closed: true, raw: text };
    if (/open\s*24|24\s*hours|24\s*jam/i.test(text)) {
      return { is24: true, open: 0, close: 1440, raw: text };
    }

    var match = text.match(
      /(\d{1,2})[.:](\d{2})\s*\W*([ap])\.?\s*m?\s*[-–—]\s*(\d{1,2})[.:](\d{2})\s*\W*([ap])\.?\s*m?/i
    );
    if (!match) return { unparsed: true, raw: text };

    var open = parseTime(match[1], match[2], match[3].toLowerCase());
    var close = parseTime(match[4], match[5], match[6].toLowerCase());
    if (close <= open) close += 1440;

    return {
      open: open,
      close: close,
      raw: text,
      label: formatMinutes(open) + "–" + formatMinutes(close)
    };
  }

  function formatMinutes(minutes) {
    var m = number(minutes);
    if (m === 1440) return "24.00";
    var wrapped = ((m % 1440) + 1440) % 1440;
    var h = Math.floor(wrapped / 60);
    var min = wrapped % 60;
    return String(h).padStart(2, "0") + "." + String(min).padStart(2, "0");
  }

  function buildSchedule(openHours) {
    var schedule = {};
    DAY_NAMES.forEach(function (day) {
      var slots = openHours && openHours[day];
      if (!Array.isArray(slots)) slots = slots ? [slots] : [];
      var parsed = slots.map(parseSlot).filter(Boolean);
      schedule[day] = {
        slots: parsed,
        closed: parsed.length === 0 || parsed.every(function (slot) { return slot.closed; }),
        is24: parsed.some(function (slot) { return slot.is24; }),
        unparsed: parsed.every(function (slot) { return slot.unparsed; })
      };
    });
    return schedule;
  }

  function scheduleForToday(schedule, date) {
    return schedule[DAY_NAMES[date.getDay()]] || null;
  }

  function isOpenAt(schedule, date) {
    var today = scheduleForToday(schedule, date);
    var now = date.getHours() * 60 + date.getMinutes();

    if (today && today.is24) return true;
    if (today && !today.closed && !today.unparsed) {
      for (var i = 0; i < today.slots.length; i += 1) {
        var slot = today.slots[i];
        if (!slot.closed && !slot.unparsed && now >= slot.open && now < slot.close) {
          return true;
        }
      }
    }

    /* Yesterday's shift can continue after midnight. */
    var yesterday = schedule[DAY_NAMES[(date.getDay() + 6) % 7]];
    if (yesterday && !yesterday.closed) {
      for (var j = 0; j < yesterday.slots.length; j += 1) {
        var overnight = yesterday.slots[j];
        if (
          !overnight.closed &&
          !overnight.unparsed &&
          overnight.close > 1440 &&
          now + 1440 >= overnight.open &&
          now + 1440 < overnight.close
        ) {
          return true;
        }
      }
    }

    return false;
  }

  function hasUsableHours(schedule) {
    return DAY_NAMES.some(function (day) {
      return schedule[day] && schedule[day].slots.some(function (slot) {
        return slot.is24 || (!slot.closed && !slot.unparsed);
      });
    });
  }

  function todayHoursLabel(schedule, date) {
    var today = scheduleForToday(schedule, date);
    if (!today) return "Jam buka belum tersedia";
    if (today.is24) return "Buka 24 jam";
    if (today.closed) return "Tutup hari ini";
    if (today.unparsed) return today.slots[0] ? cleanText(today.slots[0].raw) : "Jam belum tersedia";
    return today.slots
      .filter(function (slot) { return slot.label; })
      .map(function (slot) { return slot.label; })
      .join(" · ");
  }

  function averageOpenHours(schedule) {
    var total = 0;
    var days = 0;
    DAY_NAMES.forEach(function (day) {
      var data = schedule[day];
      if (!data) return;
      days += 1;
      data.slots.forEach(function (slot) {
        if (slot.is24) total += 24;
        else if (!slot.closed && !slot.unparsed) total += (slot.close - slot.open) / 60;
      });
    });
    return days ? total / days : 0;
  }

  function earliestOpening(schedule) {
    var earliest = null;
    DAY_NAMES.forEach(function (day) {
      var data = schedule[day];
      if (!data) return;
      data.slots.forEach(function (slot) {
        if (!slot.closed && !slot.unparsed && !slot.is24) {
          if (earliest === null || slot.open < earliest) earliest = slot.open;
        }
      });
    });
    return earliest;
  }

  /* ------------------------------------------------------------------ */
  /* Vibe inference                                                     */
  /* ------------------------------------------------------------------ */

  function inferVibes(cafe) {
    var vibes = [];
    var rating = cafe.rating;
    var reviews = cafe.reviews;
    var peak = cafe.peakHour;
    var averageHours = cafe.averageOpenHours;
    var earliest = cafe.earliestOpen;
    var daytime = earliest !== null && earliest <= 9 * 60;

    if (
      (peak !== null && (peak >= 16 || peak <= 2)) ||
      reviews >= 220 ||
      cafe.category === "restaurant"
    ) {
      vibes.push("Nongkrong");
    }

    if (daytime && averageHours >= 7.5 && rating >= 4.2) {
      vibes.push("Belajar");
    }

    if (cafe.is24h || averageHours >= 10) {
      vibes.push("WFC");
    }

    if (cafe.is24h) {
      vibes.push("Buka 24 Jam");
    }

    if (rating >= 4.6 && reviews > 0 && reviews <= 90) {
      vibes.push("Hidden gem");
    }

    if (rating >= 4.5 && reviews >= 300) {
      vibes.push("Favorit warga");
    }

    if (!vibes.length) {
      vibes.push(cafe.category === "restaurant" ? "Makan santai" : "Nongkrong");
    }

    return vibes;
  }

  function normalizeCategory(category) {
    var value = cleanText(category).toLowerCase();
    if (value === "restaurant") return { key: "restaurant", label: "Resto & Cafe" };
    if (value === "cafe") return { key: "cafe", label: "Cafe" };
    if (value === "coffeeshop") return { key: "coffee", label: "Coffee Shop" };
    if (value === "coffee shop") return { key: "coffee", label: "Coffee Shop" };
    return { key: "other", label: cleanText(category) || "Tempat nongkrong" };
  }

  function normaliseTitle(title) {
    return cleanText(title).replace(/\[TDT\]\s*/i, "");
  }

  function peakLabel(day, hour) {
    if (!day) return "";
    var label = DAY_LABELS[day] || day;
    if (hour === null || hour === undefined) return label;
    return label + ", " + String(number(hour)).padStart(2, "0") + ".00";
  }

  function buildCatalogue() {
    var source = global.json_clean_dataset_cafe_kalsel_1;
    if (!source || !Array.isArray(source.features)) {
      throw new Error("Layer cafe QGIS tidak ditemukan.");
    }

    var regions = buildRegions();
    var now = new Date();
    var cafes = [];

    source.features.forEach(function (feature, index) {
      var props = feature.properties || {};
      var category = normalizeCategory(props.category);
      if (category.key === "other") return;

      var coords = feature.geometry && feature.geometry.coordinates;
      if (!coords || coords.length < 2) return;

      var lng = number(coords[0]);
      var lat = number(coords[1]);
      var address = cleanText(props.address);
      var region = regions.length ? regionAt(lng, lat, regions) : null;
      if (!region) region = regionFromAddress(address, regions);

      var areaName = region ? region.name : "Lainnya";
      var areaLabel = region ? region.label : "Kalimantan Selatan";
      var schedule = buildSchedule(props.open_hours);
      var hasHours = hasUsableHours(schedule);
      var open = hasHours ? isOpenAt(schedule, now) : false;
      var is24h = DAY_NAMES.some(function (day) {
        return schedule[day] && schedule[day].is24;
      });

      var cafe = {
        id: cleanText(props.place_id) || "cafe-" + index,
        name: normaliseTitle(props.title),
        address: address,
        category: category.key,
        categoryLabel: category.label,
        rawCategory: cleanText(props.category),
        area: areaName,
        areaLabel: areaLabel,
        lat: lat,
        lng: lng,
        rating: number(props.review_rating),
        reviews: number(props.review_count),
        peakDay: cleanText(props.peak_day),
        peakHour: props.peak_hour === null || props.peak_hour === undefined ? null : number(props.peak_hour),
        schedule: schedule,
        hasHours: hasHours,
        isOpen: open,
        is24h: is24h,
        todayHours: todayHoursLabel(schedule, now),
        averageOpenHours: averageOpenHours(schedule),
        earliestOpen: earliestOpening(schedule)
      };

      cafe.peakLabel = peakLabel(cafe.peakDay, cafe.peakHour);
      cafe.statusLabel = !hasHours
        ? "Jam tidak tersedia"
        : cafe.isOpen
          ? "Buka sekarang"
          : "Tutup sekarang";
      cafe.vibes = inferVibes(cafe);

      var score = 0;
      if (cafe.rating) score += cafe.rating * 18;
      score += Math.log10(cafe.reviews + 1) * 10;
      score += cafe.isOpen ? 4 : 0;
      score += Math.min(cafe.vibes.length, 3) * 1.5;
      cafe.score = score;

      cafe.searchText = [
        cafe.name,
        cafe.address,
        cafe.area,
        cafe.areaLabel,
        cafe.categoryLabel,
        cafe.vibes.join(" "),
        cafe.statusLabel
      ]
        .join(" ")
        .toLowerCase();

      cafes.push(cafe);
    });

    cafes.sort(function (a, b) {
      return b.score - a.score || b.reviews - a.reviews || a.name.localeCompare(b.name, "id");
    });

    var rated = cafes.filter(function (cafe) { return cafe.rating > 0; });
    var ratingTotal = rated.reduce(function (sum, cafe) { return sum + cafe.rating; }, 0);
    var areaMap = {};
    cafes.forEach(function (cafe) {
      areaMap[cafe.area] = (areaMap[cafe.area] || 0) + 1;
    });

    var fullAreas = (regions.length ? regions : []).map(function (region) {
      return {
        name: region.name,
        label: region.label,
        count: areaMap[region.name] || 0
      };
    });

    if (!fullAreas.length) {
      Object.keys(areaMap).forEach(function (name) {
        fullAreas.push({ name: name, label: name, count: areaMap[name] });
      });
    }

    fullAreas.sort(function (a, b) {
      if (a.name === "Banjarmasin") return -1;
      if (b.name === "Banjarmasin") return 1;
      if (a.name === "Banjar Baru") return -1;
      if (b.name === "Banjar Baru") return 1;
      return a.name.localeCompare(b.name, "id");
    });

    return {
      cafes: cafes,
      areas: fullAreas,
      stats: {
        total: cafes.length,
        areaCount: fullAreas.filter(function (area) { return area.count > 0; }).length,
        ratedCount: rated.length,
        averageRating: rated.length ? ratingTotal / rated.length : 0,
        openNow: cafes.filter(function (cafe) { return cafe.isOpen; }).length,
        open24: cafes.filter(function (cafe) { return cafe.is24h; }).length,
        rating45: cafes.filter(function (cafe) { return cafe.rating >= 4.5; }).length,
        totalReviews: cafes.reduce(function (sum, cafe) { return sum + cafe.reviews; }, 0)
      }
    };
  }

  var catalogue;
  try {
    catalogue = buildCatalogue();
  } catch (error) {
    catalogue = {
      cafes: [],
      areas: [],
      stats: {
        total: 0,
        areaCount: 0,
        ratedCount: 0,
        averageRating: 0,
        openNow: 0,
        open24: 0,
        rating45: 0,
        totalReviews: 0
      },
      error: error
    };
    console.error(error);
  }

  global.CafeYuk = {
    cafes: catalogue.cafes,
    areas: catalogue.areas,
    stats: catalogue.stats,
    error: catalogue.error,
    utils: {
      cleanText: cleanText,
      escapeHtml: escapeHtml,
      formatNumber: formatNumber,
      formatRating: formatRating,
      formatCompact: formatCompact,
      formatMinutes: formatMinutes,
      dayLabels: DAY_LABELS,
      pointInGeometry: pointInGeometry
    }
  };
})(window);
