// ===============================
// بيانات المستخدم التجريبي
// ===============================

const demoUser = {
    email: "admin@tourism.gov.ly",
    password: "admin123",
    name: "مدير النظام"
};

// ===============================
// المتغيرات العامة
// ===============================

let facilities = [];
let licenses = [];
let occupancyReports = [];
let capacityHistory = [];
let auditLog = [];
let currentReportRows = [];
let currentLicensesStatusReportRows = [];
let currentAdvancedReport = null;
let currentEditingFacilityCode = "";
let facilitiesLoadError = "";
let currentFacilitiesPage = 1;
let libyaCities = [];
let libyaMunicipalities = [];
let officialFacilitiesCache = [];
let defaultReportOutputTemplate = "";
const facilitiesPageSize = 20;

let map = null;
let marker = null;

const defaultLat = 32.8872;
const defaultLng = 13.1913;

// ===============================
// شاشة الدخول والخروج
// ===============================

function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem("tas_logged_in");

    if (isLoggedIn === "true") {
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById("loginPage").classList.remove("hidden");
    document.getElementById("appContainer").classList.add("hidden");
}

function showApp() {
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("appContainer").classList.remove("hidden");
}

function logout() {
    localStorage.removeItem("tas_logged_in");
    showLogin();
}

// ===============================
// أدوات عامة
// ===============================

function getNumberValue(id) {
    const element = document.getElementById(id);

    if (!element) {
        return 0;
    }

    const value = Number(element.value || 0);

    if (!Number.isFinite(value) || value < 0) {
        return 0;
    }

    return value;
}

function getTextValue(id) {
    const element = document.getElementById(id);
    return element ? String(element.value || "").trim() : "";
}

function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value;
    }
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function setSelectValue(id, value) {
    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    const normalizedValue = String(value || "");
    const existingOption = Array.from(element.options).find(option => option.value === normalizedValue);

    if (!existingOption && normalizedValue) {
        const option = document.createElement("option");
        option.value = normalizedValue;
        option.textContent = normalizedValue;
        element.appendChild(option);
    }

    element.value = normalizedValue;
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeCsvValue(value) {
    const text = String(value ?? "");

    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
}


function normalizeFacilityStatus(status) {
    const value = String(status || "").trim();

    if (!value || value === "يعمل") {
        return "نشط";
    }

    return value;
}

function getFacilityClassificationStatus(facility) {
    const savedStatus = String(facility.classification_status || "").trim();

    if (savedStatus) {
        return savedStatus;
    }

    const classification = String(facility.classification || "").trim();

    if (!classification || classification === "-" || classification === "غير مصنف") {
        return "غير مصنف";
    }

    return "مصنف";
}

function getTotalWorkers(facility) {
    const genderTotal = Number(facility.national_male_workers || facility.local_male_workers || 0) +
        Number(facility.national_female_workers || facility.local_female_workers || 0) +
        Number(facility.foreign_male_workers || 0) +
        Number(facility.foreign_female_workers || 0);

    if (genderTotal > 0) {
        return genderTotal;
    }

    return Number(facility.total_workers || 0) ||
        Number(facility.local_workers || 0) + Number(facility.foreign_workers || 0);
}

function getFacilityLicenseStatus(facility) {
    if (facility.licenseStatus) {
        return facility.licenseStatus;
    }

    const license = licenses.find(item => item.facility_code === facility.facility_code);
    return license ? license.license_status : "";
}

function getCurrentFacilityName(facilityCode, fallbackName = "") {
    const facility = getFacilityByCode(facilityCode);
    return facility ? facility.name : (fallbackName || "-");
}

function getReportFacilityName(report) {
    return getCurrentFacilityName(report.facility_code, report.facility_name);
}

function formatPercent(value) {
    return `${(Number.isFinite(value) ? value : 0).toFixed(2)}%`;
}

function formatStay(value) {
    return `${(Number.isFinite(value) ? value : 0).toFixed(2)} ليلة`;
}

function addOneYear(dateValue) {
    if (!dateValue) {
        return "";
    }

    const [year, month, day] = dateValue.split("-").map(Number);

    if (!year || !month || !day) {
        return "";
    }

    const date = new Date(Date.UTC(year + 1, month - 1, day));

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toISOString().slice(0, 10);
}

function parseDateOnly(dateValue) {
    if (!dateValue) {
        return null;
    }

    const [year, month, day] = String(dateValue).slice(0, 10).split("-").map(Number);

    if (!year || !month || !day) {
        return null;
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) ? null : date;
}

function getTodayDateOnly() {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function formatDateOnly(dateValue) {
    return dateValue ? String(dateValue).slice(0, 10) : "غير محدد";
}

function getLicenseExpiryDateValue(license) {
    return license.expiry_date ||
        license.licenseExpiryDate ||
        license.license_expiry_date ||
        "";
}

function getLicenseIssueDateValue(license) {
    return license.issue_date ||
        license.licenseIssueDate ||
        license.license_issue_date ||
        "";
}

function normalizeLicenseStatusValue(status) {
    const value = String(status || "").trim();
    const normalized = normalizeArabicText(value);

    if (value === "Active" || normalized === normalizeArabicText("ساري")) {
        return "Active";
    }

    if (value === "Expired" || normalized === normalizeArabicText("منتهي")) {
        return "Expired";
    }

    if (value === "Pending" || normalized === normalizeArabicText("قيد الإجراء")) {
        return "Pending";
    }

    if (value === "Suspended" || normalized === normalizeArabicText("موقوف")) {
        return "Suspended";
    }

    return value || "Pending";
}

function getFacilityDisplayName(facility) {
    const branch = facility.branch_name ? ` - ${facility.branch_name}` : "";
    const group = facility.group_name ? ` - ${facility.group_name}` : "";
    return `${facility.name || "مرفق بدون اسم"}${branch}${group} - ${facility.type || ""} - ${facility.city || ""}`;
}

function normalizeArabicText(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/ـ/g, "")
        .replace(/[أإآا]/g, "ا")
        .replace(/[ى]/g, "ي")
        .replace(/[ة]/g, "ه")
        .replace(/[ؤ]/g, "و")
        .replace(/[ئ]/g, "ي")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeArabicSearchText(text) {
    return normalizeArabicText(text)
        .replace(/(^|\s)ال/g, "$1")
        .replace(/(^|\s)ا(?=\S)/g, "$1")
        .replace(/\s+/g, " ")
        .trim();
}

function compactSearchText(text) {
    return normalizeArabicSearchText(text).replace(/\s+/g, "");
}

function textMatchesArabicSearch(text, query) {
    const normalizedText = normalizeArabicText(text);
    const normalizedQuery = normalizeArabicText(query);
    const searchText = normalizeArabicSearchText(text);
    const searchQuery = normalizeArabicSearchText(query);

    if (!normalizedQuery) {
        return true;
    }

    return normalizedText.includes(normalizedQuery) ||
        searchText.includes(searchQuery) ||
        compactSearchText(text).includes(compactSearchText(query));
}

function getFacilitySearchText(facility) {
    return normalizeArabicText([
        facility.name,
        facility.name_en,
        facility.branch_name,
        facility.group_name,
        facility.group_code,
        facility.type,
        facility.city,
        facility.municipality,
        facility.facility_code,
        facility.classification,
        getFacilityClassificationStatus(facility),
        normalizeFacilityStatus(facility.status),
        getLicenseStatusArabic(getFacilityLicenseStatus(facility)),
        getFacilityLicenseStatus(facility)
    ].join(" "));
}

function getFacilityAutocompleteLabel(facility) {
    const branch = facility.branch_name ? ` - ${facility.branch_name}` : "";
    const group = facility.group_name ? ` - ${facility.group_name}` : "";
    return `${facility.name || "مرفق بدون اسم"}${branch}${group} - ${facility.type || "-"} - ${facility.municipality || "-"} - ${facility.city || "-"} - ${facility.facility_code || "-"}`;
}

function searchFacilities(query = "", filters = {}) {
    const normalizedQuery = String(query || "").trim();

    return facilities.filter(facility => {
        if (normalizedQuery && !textMatchesArabicSearch(getFacilitySearchText(facility), normalizedQuery)) {
            return false;
        }

        if (filters.type && facility.type !== filters.type) {
            return false;
        }

        if (filters.municipality && facility.municipality !== filters.municipality) {
            return false;
        }

        if (filters.city && facility.city !== filters.city) {
            return false;
        }

        if (filters.licenseStatus && normalizeLicenseStatusValue(getFacilityLicenseStatus(facility)) !== filters.licenseStatus) {
            return false;
        }

        if (filters.status && normalizeFacilityStatus(facility.status) !== filters.status) {
            return false;
        }

        if (filters.classification) {
            const classificationValue = facility.classification || "غير مصنف";
            const classificationStatus = getFacilityClassificationStatus(facility);

            if (classificationValue !== filters.classification && classificationStatus !== filters.classification) {
                return false;
            }
        }

        return true;
    });
}

function renderAutocompleteResults(containerId, results, onSelect, emptyMessage = "لا توجد نتائج مطابقة") {
    const container = document.getElementById(containerId);

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!Array.isArray(results) || results.length === 0) {
        container.innerHTML = `<div class="search-no-results">${emptyMessage}</div>`;
        container.classList.remove("hidden");
        return;
    }

    results.slice(0, 25).forEach(facility => {
        const item = document.createElement("div");
        item.className = "search-result-item";
        item.innerHTML = `
            <strong>${escapeHtml(facility.name || "مرفق بدون اسم")}</strong>
            <br>
            ${escapeHtml(facility.type || "-")} - ${escapeHtml(facility.municipality || "-")} - ${escapeHtml(facility.city || "-")} - ${escapeHtml(facility.facility_code || "-")}
        `;
        item.addEventListener("mousedown", function(event) {
            event.preventDefault();
            onSelect(facility);
        });
        container.appendChild(item);
    });

    container.classList.remove("hidden");
}

function hideAutocompleteResults(containerId) {
    const container = document.getElementById(containerId);

    if (container) {
        container.innerHTML = "";
        container.classList.add("hidden");
    }
}

function findSingleMatchingFacility(query) {
    const searchText = String(query || "").trim();

    if (!searchText) {
        return null;
    }

    const exactMatches = facilities.filter(facility => {
        return normalizeArabicText(getFacilityDisplayName(facility)) === normalizeArabicText(searchText) ||
            normalizeArabicText(facility.name) === normalizeArabicText(searchText) ||
            normalizeArabicText(facility.facility_code) === normalizeArabicText(searchText);
    });

    if (exactMatches.length === 1) {
        return exactMatches[0];
    }

    const matches = searchFacilities(searchText);
    return matches.length === 1 ? matches[0] : null;
}

function resolveFacilityAutocompleteSelection(hiddenInputId, searchInputId, selectHandler) {
    const selectedCode = getTextValue(hiddenInputId);
    const selectedFacility = getFacilityByCode(selectedCode);

    if (selectedFacility) {
        return selectedFacility;
    }

    const singleMatch = findSingleMatchingFacility(getTextValue(searchInputId));

    if (singleMatch) {
        selectHandler(singleMatch);
        return singleMatch;
    }

    return null;
}

function updateSelectedFacilityNote(elementId, facility) {
    const note = document.getElementById(elementId);

    if (!note) {
        return;
    }

    if (!facility) {
        note.textContent = "";
        note.classList.add("hidden");
        return;
    }

    note.textContent = `المرفق المختار: ${getFacilityAutocompleteLabel(facility)}`;
    note.classList.remove("hidden");
}

function clearFacilityAutocompleteSelection(hiddenInputId, searchInputId, resultsContainerId, selectedNoteId) {
    setValue(hiddenInputId, "");
    setValue(searchInputId, "");
    hideAutocompleteResults(resultsContainerId);
    updateSelectedFacilityNote(selectedNoteId, null);
}

function renderFacilityAutocompleteFromInput(searchInputId, hiddenInputId, resultsContainerId, onSelect) {
    const searchInput = document.getElementById(searchInputId);

    if (!searchInput) {
        return;
    }

    const query = searchInput.value.trim();
    setValue(hiddenInputId, "");

    if (!query) {
        hideAutocompleteResults(resultsContainerId);
        return;
    }

    renderAutocompleteResults(
        resultsContainerId,
        searchFacilities(query),
        onSelect,
        "لا توجد مرافق مطابقة"
    );
}

function selectFacilityForLicense(facility) {
    setValue("licenseFacilitySearch", getFacilityAutocompleteLabel(facility));
    setValue("licenseFacility", facility.facility_code || "");
    hideAutocompleteResults("licenseFacilityResults");
    updateSelectedFacilityNote("licenseFacilitySelected", facility);
}

function selectFacilityForOccupancy(facility) {
    setValue("occupancyFacilitySearch", getFacilityAutocompleteLabel(facility));
    setValue("occupancyFacility", facility.facility_code || "");
    hideAutocompleteResults("occupancyFacilityResults");
    updateSelectedFacilityNote("occupancyFacilitySelected", facility);
    fillFacilityCapacityForOccupancy();
}

function getDataFilePaths(fileName) {
    const pathname = typeof window !== "undefined" && window.location && window.location.pathname
        ? window.location.pathname
        : "";
    const isFrontendPath = pathname.includes("/frontend/");

    return isFrontendPath
        ? [`../data/${fileName}`, `data/${fileName}`]
        : [`data/${fileName}`, `../data/${fileName}`];
}

async function fetchFirstJson(fileName) {
    const paths = getDataFilePaths(fileName);
    let lastError = null;

    for (const path of paths) {
        try {
            const response = await fetch(path);

            if (response.ok) {
                return {
                    data: await response.json(),
                    path
                };
            }

            lastError = new Error(`HTTP ${response.status} عند تحميل ${path}`);
        } catch (error) {
            lastError = error;
        }
    }

    throw new Error(`تعذر تحميل ${fileName} من المسارات: ${paths.join(", ")}${lastError ? ` - ${lastError.message}` : ""}`);
}

function extractOfficialFacilities(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (data && Array.isArray(data.facilities)) {
        return data.facilities;
    }

    return [];
}

function getReferenceNames(data, collectionKey) {
    const items = Array.isArray(data)
        ? data
        : (data && Array.isArray(data[collectionKey]) ? data[collectionKey] : []);
    const names = items
        .map(item => {
            if (typeof item === "string") {
                return item;
            }

            return item.name_ar || item.name || item.city || "";
        })
        .map(name => String(name || "").trim())
        .filter(Boolean);

    return [...new Set(names)].sort((first, second) => first.localeCompare(second, "ar"));
}

function getNumberField(item, fields) {
    for (const field of fields) {
        const value = Number(item[field]);

        if (Number.isFinite(value) && value > 0) {
            return value;
        }
    }

    return 0;
}

function isSeasonalWorkersYes(value) {
    return value === true ||
        value === "yes" ||
        value === "نعم" ||
        value === "يوجد";
}


const defaultRoomDetailTypes = [
    "فردية",
    "زوجية",
    "ثلاثية",
    "رباعية",
    "مزدوجة",
    "غرف مجهزة لذوي الاحتياجات الخاصة"
];

const defaultSuiteDetailTypes = [
    "أجنحة رئاسية",
    "أجنحة ممتازة",
    "أجنحة عادية"
];

function isYesValue(value) {
    return value === true || value === "yes" || value === "نعم" || value === "متوفر" || value === "متوفرة";
}

function getCheckboxValue(id) {
    const element = document.getElementById(id);
    return Boolean(element && element.checked);
}

function setChecked(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.checked = Boolean(value);
    }
}

function normalizeRoomDetails(facility) {
    const savedRows = Array.isArray(facility.room_details) ? facility.room_details : [];
    return defaultRoomDetailTypes.map(roomType => {
        const saved = savedRows.find(row => row.room_type === roomType) || {};
        return {
            room_type: roomType,
            rooms_count: Number(saved.rooms_count || 0),
            beds_count: Number(saved.beds_count || 0),
            room_rate: Number(saved.room_rate || 0),
            notes: saved.notes || ""
        };
    });
}

function normalizeSuiteDetails(facility) {
    const savedRows = Array.isArray(facility.suite_details) ? facility.suite_details : [];
    return defaultSuiteDetailTypes.map(suiteType => {
        const saved = savedRows.find(row => row.suite_type === suiteType) || {};
        return {
            suite_type: suiteType,
            suites_count: Number(saved.suites_count || 0),
            beds_count: Number(saved.beds_count || 0),
            suite_rate: Number(saved.suite_rate || 0),
            notes: saved.notes || ""
        };
    });
}

function normalizeRestaurantCafeDetails(facility) {
    return Array.isArray(facility.restaurant_cafe_details)
        ? facility.restaurant_cafe_details.map((row, index) => ({
            sequence: Number(row.sequence || index + 1),
            name: row.name || "",
            seats_count: Number(row.seats_count || 0),
            tables_count: Number(row.tables_count || 0),
            notes: row.notes || ""
        }))
        : [];
}

function normalizeMeetingHallDetails(facility) {
    return Array.isArray(facility.meeting_hall_details)
        ? facility.meeting_hall_details.map((row, index) => ({
            sequence: Number(row.sequence || index + 1),
            name: row.name || "",
            seats_count: Number(row.seats_count || 0),
            notes: row.notes || ""
        }))
        : [];
}

function getRestaurantCafeTotalsFromData(rows) {
    const items = Array.isArray(rows) ? rows : [];
    return {
        count: items.filter(row => row.name || Number(row.seats_count || 0) > 0 || Number(row.tables_count || 0) > 0).length,
        seats: items.reduce((sum, row) => sum + Number(row.seats_count || 0), 0),
        tables: items.reduce((sum, row) => sum + Number(row.tables_count || 0), 0)
    };
}

function getMeetingHallTotalsFromData(rows) {
    const items = Array.isArray(rows) ? rows : [];
    return {
        count: items.filter(row => row.name || Number(row.seats_count || 0) > 0).length,
        seats: items.reduce((sum, row) => sum + Number(row.seats_count || 0), 0)
    };
}

function normalizeServices(facility) {
    const services = facility.services || {};
    const restaurantRows = normalizeRestaurantCafeDetails(facility);
    const hallRows = normalizeMeetingHallDetails(facility);
    const restaurantTotals = getRestaurantCafeTotalsFromData(restaurantRows);
    const hallTotals = getMeetingHallTotalsFromData(hallRows);
    const recreation = services.recreation || {};

    return {
        restaurants_available: isYesValue(services.restaurants_available) || restaurantTotals.count > 0,
        restaurants_count: Number(services.restaurants_count || restaurantTotals.count || 0),
        meeting_halls_available: isYesValue(services.meeting_halls_available) || hallTotals.count > 0,
        meeting_halls_capacity: Number(services.meeting_halls_capacity || hallTotals.seats || 0),
        recreation: {
            pool: Boolean(recreation.pool),
            gym: Boolean(recreation.gym),
            spa: Boolean(recreation.spa),
            kids_area: Boolean(recreation.kids_area),
            playgrounds: Boolean(recreation.playgrounds),
            swimming_pools: Boolean(recreation.swimming_pools)
        },
        parking_available: isYesValue(services.parking_available),
        parking_capacity: Number(services.parking_capacity || 0),
        wifi_status: services.wifi_status || "غير متوفر"
    };
}

function normalizeAccessibility(facility) {
    const accessibility = facility.accessibility || {};
    return {
        accessible_rooms_available: isYesValue(accessibility.accessible_rooms_available),
        accessible_entrances_available: isYesValue(accessibility.accessible_entrances_available),
        accessible_elevators_available: isYesValue(accessibility.accessible_elevators_available),
        accessible_bathrooms_available: isYesValue(accessibility.accessible_bathrooms_available),
        notes: accessibility.notes || ""
    };
}

function normalizeSafety(facility) {
    const safety = facility.safety || {};
    return {
        fire_system_status: safety.fire_system_status || "غير معتمدة / تحت التجهيز",
        cctv_status: safety.cctv_status || "غير متوفرة",
        emergency_exits_status: safety.emergency_exits_status || "غير مطابقة",
        first_aid_available: isYesValue(safety.first_aid_available)
    };
}

function normalizeSustainability(facility) {
    const sustainability = facility.sustainability || {};
    return {
        solar_energy: Boolean(sustainability.solar_energy),
        water_recycling: Boolean(sustainability.water_recycling),
        energy_saving_systems: Boolean(sustainability.energy_saving_systems)
    };
}

function normalizeFacilityDocuments(facility) {
    const documents = facility.documents || {};
    return {
        passport_file: documents.passport_file || "",
        national_id_file: documents.national_id_file || "",
        facility_documents: Array.isArray(documents.facility_documents) ? documents.facility_documents : [],
        commercial_register_file: documents.commercial_register_file || "",
        tourism_license_file: documents.tourism_license_file || "",
        facility_photos: Array.isArray(documents.facility_photos) ? documents.facility_photos : [],
        inspection_report_file: documents.inspection_report_file || ""
    };
}

function getDetailInputNumber(input) {
    const value = Number(input && input.value ? input.value : 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
}

function getInputInRow(row, selector) {
    return row ? row.querySelector(selector) : null;
}

function getRoomDetailsFromForm() {
    return Array.from(document.querySelectorAll("#roomDetailsTable tbody tr")).map(row => ({
        room_type: row.dataset.roomType || "",
        rooms_count: getDetailInputNumber(getInputInRow(row, ".room-detail-rooms")),
        beds_count: getDetailInputNumber(getInputInRow(row, ".room-detail-beds")),
        room_rate: getDetailInputNumber(getInputInRow(row, ".room-detail-rate")),
        notes: (getInputInRow(row, ".room-detail-notes") || {}).value || ""
    }));
}

function getSuiteDetailsFromForm() {
    return Array.from(document.querySelectorAll("#suiteDetailsTable tbody tr")).map(row => ({
        suite_type: row.dataset.suiteType || "",
        suites_count: getDetailInputNumber(getInputInRow(row, ".suite-detail-suites")),
        beds_count: getDetailInputNumber(getInputInRow(row, ".suite-detail-beds")),
        suite_rate: getDetailInputNumber(getInputInRow(row, ".suite-detail-rate")),
        notes: (getInputInRow(row, ".suite-detail-notes") || {}).value || ""
    }));
}

function getRestaurantCafeDetailsFromForm() {
    return Array.from(document.querySelectorAll("#restaurantCafeDetailsTable tbody tr")).map((row, index) => ({
        sequence: index + 1,
        name: (getInputInRow(row, ".restaurant-name") || {}).value || "",
        seats_count: getDetailInputNumber(getInputInRow(row, ".restaurant-seats")),
        tables_count: getDetailInputNumber(getInputInRow(row, ".restaurant-tables")),
        notes: (getInputInRow(row, ".restaurant-notes") || {}).value || ""
    })).filter(row => row.name || row.seats_count > 0 || row.tables_count > 0 || row.notes);
}

function getMeetingHallDetailsFromForm() {
    return Array.from(document.querySelectorAll("#meetingHallDetailsTable tbody tr")).map((row, index) => ({
        sequence: index + 1,
        name: (getInputInRow(row, ".meeting-hall-name") || {}).value || "",
        seats_count: getDetailInputNumber(getInputInRow(row, ".meeting-hall-seats")),
        notes: (getInputInRow(row, ".meeting-hall-notes") || {}).value || ""
    })).filter(row => row.name || row.seats_count > 0 || row.notes);
}

function calculateRoomDetailsTotals() {
    const rows = getRoomDetailsFromForm();
    const totalRooms = rows.reduce((sum, row) => sum + Number(row.rooms_count || 0), 0);
    const totalBeds = rows.reduce((sum, row) => sum + Number(row.beds_count || 0), 0);
    const rateRows = rows.filter(row => Number(row.room_rate || 0) > 0);
    const averageRate = rateRows.length
        ? rateRows.reduce((sum, row) => sum + Number(row.room_rate || 0), 0) / rateRows.length
        : 0;

    setText("roomDetailsTotalRooms", totalRooms);
    setText("roomDetailsTotalBeds", totalBeds);
    setText("roomDetailsAverageRate", averageRate.toFixed(2));

    return { totalRooms, totalBeds, averageRate };
}

function calculateSuiteDetailsTotals() {
    const rows = getSuiteDetailsFromForm();
    const totalSuites = rows.reduce((sum, row) => sum + Number(row.suites_count || 0), 0);
    const totalBeds = rows.reduce((sum, row) => sum + Number(row.beds_count || 0), 0);
    const rateRows = rows.filter(row => Number(row.suite_rate || 0) > 0);
    const averageRate = rateRows.length
        ? rateRows.reduce((sum, row) => sum + Number(row.suite_rate || 0), 0) / rateRows.length
        : 0;

    setText("suiteDetailsTotalSuites", totalSuites);
    setText("suiteDetailsTotalBeds", totalBeds);
    setText("suiteDetailsAverageRate", averageRate.toFixed(2));

    return { totalSuites, totalBeds, averageRate };
}

function calculateRestaurantCafeTotals() {
    const rows = getRestaurantCafeDetailsFromForm();
    const totals = getRestaurantCafeTotalsFromData(rows);

    setText("restaurantCafeTotalCount", totals.count);
    setText("restaurantCafeTotalSeats", totals.seats);
    setText("restaurantCafeTotalTables", totals.tables);

    if (totals.count > 0) {
        setSelectValue("restaurantsAvailable", "yes");
        setValue("restaurantsCount", totals.count);
    }

    return totals;
}

function calculateMeetingHallTotals() {
    const rows = getMeetingHallDetailsFromForm();
    const totals = getMeetingHallTotalsFromData(rows);

    setText("meetingHallTotalCount", totals.count);
    setText("meetingHallTotalSeats", totals.seats);

    if (totals.count > 0) {
        setSelectValue("meetingHallsAvailable", "yes");
        setValue("meetingHallsCapacity", totals.seats);
    }

    return totals;
}

function calculateCapacityFromRoomDetails() {
    const totals = calculateRoomDetailsTotals();

    if (totals.totalRooms > 0 || totals.totalBeds > 0) {
        const type = getTextValue("facilityType");
        if (type === "فندق") {
            setValue("roomsCount", totals.totalRooms);
            setValue("bedsCount", totals.totalBeds);
            if (totals.totalRooms > 0 && totals.totalBeds > 0) {
                setValue("bedsPerRoom", (totals.totalBeds / totals.totalRooms).toFixed(2));
            }
        } else if (type === "قرية سياحية" || type === "منتجع") {
            setValue("vrRoomsCount", totals.totalRooms);
            setValue("vrBedsCount", totals.totalBeds);
            if (totals.totalRooms > 0 && totals.totalBeds > 0) {
                setValue("vrAverageBedsPerRoom", (totals.totalBeds / totals.totalRooms).toFixed(2));
            }
        } else if (type === "شقق فندقية") {
            setValue("apRoomsCount", totals.totalRooms);
            setValue("apBedsCount", totals.totalBeds);
            if (totals.totalRooms > 0 && totals.totalBeds > 0) {
                setValue("apAverageBedsPerRoom", (totals.totalBeds / totals.totalRooms).toFixed(2));
            }
        } else {
            setValue("hsRoomsCount", totals.totalRooms);
            setValue("hsBedsCount", totals.totalBeds);
            if (totals.totalRooms > 0 && totals.totalBeds > 0) {
                setValue("hsAverageBedsPerRoom", (totals.totalBeds / totals.totalRooms).toFixed(2));
            }
        }
    }

    return totals;
}

function calculateAccessibilityIndicators() {
    const hasAccessibleRooms = getTextValue("accessibleRoomsAvailable") === "yes" ||
        getRoomDetailsFromForm().some(row => row.room_type === "غرف مجهزة لذوي الاحتياجات الخاصة" && Number(row.rooms_count || 0) > 0);

    if (hasAccessibleRooms) {
        setSelectValue("accessibleRoomsAvailable", "yes");
    }

    return {
        accessible_rooms_available: hasAccessibleRooms,
        accessible_entrances_available: getTextValue("accessibleEntrancesAvailable") === "yes",
        accessible_elevators_available: getTextValue("accessibleElevatorsAvailable") === "yes",
        accessible_bathrooms_available: getTextValue("accessibleBathroomsAvailable") === "yes"
    };
}

function updateFacilityCapacityTotals() {
    calculateCapacityFromRoomDetails();
    const suiteTotals = calculateSuiteDetailsTotals();
    if (suiteTotals.totalSuites > 0) {
        setValue("suitesCount", suiteTotals.totalSuites);
    }
    calculateRestaurantCafeTotals();
    calculateMeetingHallTotals();
    calculateAccessibilityIndicators();
}

function normalizeSeasonalWorkers(facility) {
    const seasonal = facility.seasonal_workers || {};
    const nationalMale = getNumberField(seasonal, ["national_male_workers", "local_male", "local_male_workers"]);
    const nationalFemale = getNumberField(seasonal, ["national_female_workers", "local_female", "local_female_workers"]);
    const foreignMale = getNumberField(seasonal, ["foreign_male_workers", "foreign_male"]);
    const foreignFemale = getNumberField(seasonal, ["foreign_female_workers", "foreign_female"]);
    const total = Number(seasonal.total_workers || 0) || nationalMale + nationalFemale + foreignMale + foreignFemale;

    return {
        ...seasonal,
        has_seasonal_workers: isSeasonalWorkersYes(seasonal.has_seasonal_workers),
        national_male_workers: nationalMale,
        national_female_workers: nationalFemale,
        foreign_male_workers: foreignMale,
        foreign_female_workers: foreignFemale,
        total_workers: total,
        season_start: seasonal.season_start || "",
        season_end: seasonal.season_end || "",
        notes: seasonal.notes || ""
    };
}

function normalizeFacilityRecord(facility) {
    const rooms = getNumberField(facility, ["rooms", "total_units", "chalets", "apartments"]);
    const beds = getNumberField(facility, ["beds"]);
    const nationalMale = getNumberField(facility, ["national_male_workers", "local_male_workers"]);
    const nationalFemale = getNumberField(facility, ["national_female_workers", "local_female_workers"]);
    const foreignMale = getNumberField(facility, ["foreign_male_workers"]);
    const foreignFemale = getNumberField(facility, ["foreign_female_workers"]);
    const localWorkers = Number(facility.local_workers || 0) || nationalMale + nationalFemale;
    const foreignWorkers = Number(facility.foreign_workers || 0) || foreignMale + foreignFemale;
    const totalWorkers = Number(facility.total_workers || 0) || localWorkers + foreignWorkers;
    const averageBedsPerRoom = Number(facility.average_beds_per_room || facility.beds_per_room || facility.beds_per_unit || 0) ||
        (rooms > 0 && beds > 0 ? Number((beds / rooms).toFixed(2)) : 0);
    const roomDetails = normalizeRoomDetails(facility);
    const suiteDetails = normalizeSuiteDetails(facility);
    const restaurantCafeDetails = normalizeRestaurantCafeDetails(facility);
    const meetingHallDetails = normalizeMeetingHallDetails(facility);
    const roomDetailsTotalRooms = roomDetails.reduce((sum, row) => sum + Number(row.rooms_count || 0), 0);
    const roomDetailsTotalBeds = roomDetails.reduce((sum, row) => sum + Number(row.beds_count || 0), 0);
    const suiteDetailsTotalSuites = suiteDetails.reduce((sum, row) => sum + Number(row.suites_count || 0), 0);
    const normalizedRooms = roomDetailsTotalRooms || rooms;
    const normalizedBeds = roomDetailsTotalBeds || beds;
    const normalizedAverageBeds = Number(facility.average_beds_per_room || facility.beds_per_room || 0) ||
        (normalizedRooms > 0 && normalizedBeds > 0 ? Number((normalizedBeds / normalizedRooms).toFixed(2)) : averageBedsPerRoom);

    return {
        ...facility,
        facility_code: facility.facility_code || "",
        name_en: facility.name_en || "",
        national_number: facility.national_number || "",
        record_type: normalizeFacilityRecordType(facility.record_type),
        has_group: Boolean(facility.has_group || facility.group_code),
        group_name: facility.group_name || "",
        group_code: facility.group_code || "",
        branch_name: facility.branch_name || "",
        status: normalizeFacilityStatus(facility.status),
        licenseStatus: facility.licenseStatus || facility.license_status || "Pending",
        classification_status: facility.classification_status || getFacilityClassificationStatus(facility),
        floors_count: Number(facility.floors_count || 0),
        rooms: normalizedRooms,
        beds: normalizedBeds,
        suites: suiteDetailsTotalSuites || Number(facility.suites || 0),
        average_beds_per_room: normalizedAverageBeds,
        beds_per_room: normalizedAverageBeds,
        local_workers: localWorkers,
        foreign_workers: foreignWorkers,
        national_male_workers: nationalMale,
        national_female_workers: nationalFemale,
        foreign_male_workers: foreignMale,
        foreign_female_workers: foreignFemale,
        total_workers: totalWorkers,
        room_details: roomDetails,
        suite_details: suiteDetails,
        services: normalizeServices({ ...facility, restaurant_cafe_details: restaurantCafeDetails, meeting_hall_details: meetingHallDetails }),
        accessibility: normalizeAccessibility(facility),
        restaurant_cafe_details: restaurantCafeDetails,
        meeting_hall_details: meetingHallDetails,
        safety: normalizeSafety(facility),
        sustainability: normalizeSustainability(facility),
        documents: normalizeFacilityDocuments(facility),
        form_filled_by: facility.form_filled_by || "",
        form_filled_by_position: facility.form_filled_by_position || "",
        form_filled_date: facility.form_filled_date || "",
        seasonal_workers: normalizeSeasonalWorkers(facility)
    };
}

function normalizeFacilitiesCollection(items) {
    return Array.isArray(items)
        ? items.map(normalizeFacilityRecord)
        : [];
}

async function loadOfficialFacilitySource() {
    const result = await fetchFirstJson("official_accommodation_facilities_tas.json");
    const officialItems = extractOfficialFacilities(result.data);

    if (!Array.isArray(officialItems) || officialItems.length === 0) {
        throw new Error("ملف المرافق الرسمي لا يحتوي على بيانات صالحة");
    }

    officialFacilitiesCache = normalizeFacilitiesCollection(officialItems);
    return officialFacilitiesCache;
}

// ===============================
// تحميل وحفظ بيانات المرافق
// ===============================

async function loadFacilitiesData() {
    const savedFacilities = localStorage.getItem("tas_facilities");
    let savedFacilitiesLoaded = false;

    if (savedFacilities) {
        try {
            facilities = JSON.parse(savedFacilities);

            if (Array.isArray(facilities) && facilities.length > 0) {
                savedFacilitiesLoaded = true;
            } else {
                localStorage.removeItem("tas_facilities");
            }
        } catch (error) {
            console.error("خطأ في قراءة بيانات المرافق المحفوظة:", error);
            localStorage.removeItem("tas_facilities");
        }
    }

    try {
        if (savedFacilitiesLoaded) {
            facilities = normalizeFacilitiesCollection(facilities);
        } else {
            let loadedFacilities = [];

            try {
                loadedFacilities = await loadOfficialFacilitySource();
            } catch (officialError) {
                console.warn("تعذر تحميل ملف المرافق الرسمي، سيتم استخدام ملف facilities.json:", officialError);
                const fallbackResult = await fetchFirstJson("facilities.json");

                if (!Array.isArray(fallbackResult.data)) {
                    throw new Error("ملف بيانات المرافق لا يحتوي على قائمة صالحة");
                }

                loadedFacilities = normalizeFacilitiesCollection(fallbackResult.data);
            }

            facilities = loadedFacilities;
            saveFacilitiesToLocalStorage();
        }

        facilitiesLoadError = "";
        loadCapacityHistoryData();
        ensureInitialCapacityHistoryForFacilities();

        refreshAllFacilityDropdowns();
        seedLicensesFromFacilitiesIfNeeded();
        updateDashboard();
        renderFacilitiesTable();
        updateStatisticsSection();

    } catch (error) {
        if (savedFacilitiesLoaded) {
            facilitiesLoadError = "";
            loadCapacityHistoryData();
            ensureInitialCapacityHistoryForFacilities();
            refreshAllFacilityDropdowns();
            seedLicensesFromFacilitiesIfNeeded();
            updateDashboard();
            renderFacilitiesTable();
            updateStatisticsSection();
            return;
        }

        facilitiesLoadError = error.message || "تعذر تحميل ملف بيانات المرافق";
        console.error("خطأ في تحميل بيانات المرافق:", error);

        facilities = [];

        refreshAllFacilityDropdowns();
        updateDashboard();
        renderFacilitiesTable();
        updateStatisticsSection();
    }
}

async function importOfficialFacilities() {
    const confirmed = confirm(
        "سيتم استبدال سجل المرافق الحالي في هذا المتصفح بالبيانات الرسمية الكاملة (458 مرفقاً). هل تريد المتابعة؟"
    );

    if (!confirmed) {
        return;
    }

    try {
        facilities = await loadOfficialFacilitySource();
        facilitiesLoadError = "";
        saveFacilitiesToLocalStorage();
        loadCapacityHistoryData();
        ensureInitialCapacityHistoryForFacilities();

        refreshAllFacilityDropdowns();
        seedLicensesFromFacilitiesIfNeeded();
        updateDashboard();
        renderFacilitiesTable();
        renderLicensesTable();
        renderOccupancyTable();
        updateStatisticsSection();

        alert(`تم استيراد البيانات الرسمية بنجاح
إجمالي المرافق: ${facilities.length}`);
    } catch (error) {
        console.error("تعذر استيراد البيانات الرسمية:", error);
        alert(`تعذر استيراد البيانات الرسمية: ${error.message || "خطأ غير معروف"}`);
    }
}

function saveFacilitiesToLocalStorage() {
    localStorage.setItem("tas_facilities", JSON.stringify(facilities));
}

function mergeFacilitiesData(savedItems, sourceItems) {
    const savedByCode = new Map();

    savedItems.forEach(item => {
        if (item && item.facility_code) {
            savedByCode.set(item.facility_code, item);
        }
    });

    const merged = sourceItems.map(item => {
        const savedItem = savedByCode.get(item.facility_code);
        return savedItem ? { ...item, ...savedItem } : item;
    });

    const sourceCodes = new Set(sourceItems.map(item => item.facility_code));
    savedItems.forEach(item => {
        if (item && item.facility_code && !sourceCodes.has(item.facility_code)) {
            merged.push(item);
        }
    });

    return merged;
}

function refreshAllFacilityDropdowns() {
    populateFacilitiesFilters();
    populateFacilitySelect();
    populateOccupancyFacilitySelect();
    populateReportFacilitySelect();
}

async function loadLibyaReferenceData() {
    try {
        const citiesResult = await fetchFirstJson("libya_cities.json");
        libyaCities = getReferenceNames(citiesResult.data, "cities");
    } catch (error) {
        console.warn("تعذر تحميل ملف المدن الليبية:", error);
        libyaCities = [];
    }

    try {
        const municipalitiesResult = await fetchFirstJson("libya_municipalities.json");
        libyaMunicipalities = getReferenceNames(municipalitiesResult.data, "municipalities");
        populateMunicipalityOptions();
    } catch (error) {
        console.warn("تعذر تحميل ملف البلديات الليبية:", error);
        libyaMunicipalities = [];
    }
}

function populateMunicipalityOptions() {
    const options = document.getElementById("facilityMunicipalityOptions");

    if (!options) {
        return;
    }

    options.innerHTML = "";

    libyaMunicipalities.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        options.appendChild(option);
    });
}

function filterFacilityCities() {
    const cityInput = document.getElementById("facilityCity");
    const resultsBox = document.getElementById("facilityCityResults");

    if (!cityInput || !resultsBox) {
        return;
    }

    const searchText = normalizeArabicText(cityInput.value);
    resultsBox.innerHTML = "";

    if (!searchText) {
        resultsBox.classList.add("hidden");
        return;
    }

    if (!Array.isArray(libyaCities) || libyaCities.length === 0) {
        resultsBox.innerHTML = `<div class="search-no-results">تعذر تحميل قائمة المدن</div>`;
        resultsBox.classList.remove("hidden");
        return;
    }

    const matchedCities = libyaCities
        .filter(name => normalizeArabicText(name).includes(searchText))
        .slice(0, 12);

    if (matchedCities.length === 0) {
        resultsBox.innerHTML = `<div class="search-no-results">لا توجد مدينة مطابقة</div>`;
        resultsBox.classList.remove("hidden");
        return;
    }

    matchedCities.forEach(name => {
        const item = document.createElement("div");
        item.className = "search-result-item";
        item.textContent = name;
        item.addEventListener("mousedown", function(event) {
            event.preventDefault();
            selectFacilityCity(name);
        });
        resultsBox.appendChild(item);
    });

    resultsBox.classList.remove("hidden");
}

function selectFacilityCity(cityName) {
    setValue("facilityCity", cityName);

    const resultsBox = document.getElementById("facilityCityResults");
    if (resultsBox) {
        resultsBox.innerHTML = "";
        resultsBox.classList.add("hidden");
    }
}


// ===============================
// الفروع والمجموعات والسجل التاريخي
// ===============================

function getCurrentUserName() {
    return demoUser.name || "admin";
}

function getRecordTypeLabel(recordType) {
    return recordType === "branch" ? "فرع تابع لمجموعة / اسم تجاري" : "مرفق مستقل";
}

function normalizeFacilityRecordType(recordType) {
    return recordType === "branch" ? "branch" : "standalone";
}

function normalizeGroupName(groupName) {
    return normalizeArabicSearchText(groupName || "");
}

function getGroupCodePrefix(groupName) {
    const latin = String(groupName || "").toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 6);
    if (latin) return latin;
    const arabic = normalizeArabicText(groupName || "").replace(/\s+/g, "").slice(0, 4);
    return arabic || "GRP";
}

function generateFacilityGroupCode(groupName) {
    const normalizedName = normalizeGroupName(groupName);
    const existing = facilities.find(facility => facility.group_code && normalizeGroupName(facility.group_name) === normalizedName);
    if (existing) return existing.group_code;

    const prefix = getGroupCodePrefix(groupName);
    const existingCodes = facilities.map(facility => facility.group_code).filter(Boolean);
    let sequence = existingCodes.length + 1;
    let code = `LY-GRP-${prefix}-${String(sequence).padStart(6, "0")}`;

    while (existingCodes.includes(code)) {
        sequence += 1;
        code = `LY-GRP-${prefix}-${String(sequence).padStart(6, "0")}`;
    }

    return code;
}

function createFacilityGroupIfNeeded(groupName = getTextValue("facilityGroupName"), preferredCode = getTextValue("facilityGroupCode")) {
    const normalizedName = normalizeGroupName(groupName);
    if (!normalizedName) return { group_name: "", group_code: "" };

    const existing = facilities.find(facility => facility.group_code && normalizeGroupName(facility.group_name) === normalizedName);
    return {
        group_name: groupName,
        group_code: preferredCode || (existing ? existing.group_code : generateFacilityGroupCode(groupName))
    };
}

function assignFacilityToGroup(facility, groupName = getTextValue("facilityGroupName")) {
    const hasGroup = getTextValue("hasFacilityGroup") === "yes" || getTextValue("facilityRecordType") === "branch" || Boolean(groupName);
    const group = hasGroup ? createFacilityGroupIfNeeded(groupName, getTextValue("facilityGroupCode")) : { group_name: "", group_code: "" };

    facility.record_type = normalizeFacilityRecordType(hasGroup ? "branch" : getTextValue("facilityRecordType"));
    facility.has_group = Boolean(hasGroup && group.group_code);
    facility.group_name = group.group_name || "";
    facility.group_code = group.group_code || "";
    facility.branch_name = hasGroup ? getTextValue("branchName") : "";
    return facility;
}

function getFacilitiesByGroupCode(groupCode) {
    return facilities.filter(facility => facility.group_code && facility.group_code === groupCode);
}

function getFacilityBranches(groupCode) {
    return getFacilitiesByGroupCode(groupCode)
        .sort((first, second) => String(first.branch_name || first.name || "").localeCompare(String(second.branch_name || second.name || ""), "ar"));
}

function getFacilityCapacitySnapshot(source = {}) {
    return {
        rooms: Number(source.rooms || 0),
        beds: Number(source.beds || 0),
        chalets: Number(source.chalets || 0),
        suites: Number(source.suites || 0),
        apartments: Number(source.apartments || 0),
        floors_count: Number(source.floors_count || 0),
        workers_total: Number(source.workers_total || source.total_workers || getTotalWorkers(source) || 0)
    };
}

function capacitySnapshotsDiffer(first = {}, second = {}) {
    return ["rooms", "beds", "chalets", "suites", "apartments", "floors_count", "workers_total"]
        .some(field => Number(first[field] || 0) !== Number(second[field] || 0));
}

function getPreviousDateString(dateValue) {
    const date = parseDateOnly(dateValue);
    if (!date) return null;
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
}

function normalizeCapacityHistoryRecord(record, index = 0) {
    return {
        id: Number(record.id || index + 1),
        facility_code: record.facility_code || "",
        effective_from: record.effective_from || "",
        effective_to: record.effective_to || null,
        rooms: Number(record.rooms || 0),
        beds: Number(record.beds || 0),
        chalets: Number(record.chalets || 0),
        suites: Number(record.suites || 0),
        apartments: Number(record.apartments || 0),
        floors_count: Number(record.floors_count || 0),
        workers_total: Number(record.workers_total || 0),
        change_reason: record.change_reason || "-",
        created_by: record.created_by || getCurrentUserName(),
        created_at: record.created_at || new Date().toISOString()
    };
}

function saveCapacityHistoryToLocalStorage() {
    localStorage.setItem("tas_capacity_history", JSON.stringify(capacityHistory));
}

function loadCapacityHistoryData() {
    const saved = localStorage.getItem("tas_capacity_history");
    if (saved) {
        try {
            capacityHistory = JSON.parse(saved).map(normalizeCapacityHistoryRecord);
        } catch (error) {
            console.error("خطأ في قراءة السجل التاريخي للطاقة:", error);
            capacityHistory = [];
            localStorage.removeItem("tas_capacity_history");
        }
    } else {
        capacityHistory = [];
    }
}

function createInitialCapacityHistory(facility) {
    if (!facility || !facility.facility_code) return null;
    if (capacityHistory.some(record => record.facility_code === facility.facility_code)) return null;

    const snapshot = getFacilityCapacitySnapshot(facility);
    const record = normalizeCapacityHistoryRecord({
        id: capacityHistory.length + 1,
        facility_code: facility.facility_code,
        effective_from: facility.establishment_date || (facility.created_at ? String(facility.created_at).slice(0, 10) : `${new Date().getFullYear()}-01-01`),
        effective_to: null,
        ...snapshot,
        change_reason: "البيانات الأصلية عند التسجيل",
        created_by: getCurrentUserName(),
        created_at: facility.created_at || new Date().toISOString()
    }, capacityHistory.length);

    capacityHistory.push(record);
    saveCapacityHistoryToLocalStorage();
    return record;
}

function ensureInitialCapacityHistoryForFacilities() {
    let changed = false;
    facilities.forEach(facility => {
        const before = capacityHistory.length;
        createInitialCapacityHistory(facility);
        if (capacityHistory.length !== before) changed = true;
    });
    if (changed) saveCapacityHistoryToLocalStorage();
}

function closePreviousCapacityRecord(facilityCode, effectiveFrom) {
    const previousEnd = getPreviousDateString(effectiveFrom);
    capacityHistory
        .filter(record => record.facility_code === facilityCode && !record.effective_to)
        .forEach(record => {
            if (!record.effective_from || record.effective_from < effectiveFrom) {
                record.effective_to = previousEnd;
            }
        });
}

function updateFacilityCapacityWithHistory(facilityCode, newCapacity, effectiveFrom, changeReason) {
    const facility = getFacilityByCode(facilityCode);
    if (!facility || !effectiveFrom || !changeReason) return false;

    closePreviousCapacityRecord(facilityCode, effectiveFrom);
    const snapshot = getFacilityCapacitySnapshot(newCapacity);
    const record = normalizeCapacityHistoryRecord({
        id: capacityHistory.length + 1,
        facility_code: facilityCode,
        effective_from: effectiveFrom,
        effective_to: null,
        ...snapshot,
        change_reason: changeReason,
        created_by: getCurrentUserName(),
        created_at: new Date().toISOString()
    }, capacityHistory.length);

    capacityHistory.push(record);
    Object.assign(facility, {
        rooms: snapshot.rooms,
        beds: snapshot.beds,
        chalets: snapshot.chalets,
        suites: snapshot.suites,
        apartments: snapshot.apartments,
        floors_count: snapshot.floors_count,
        total_workers: snapshot.workers_total
    });

    saveCapacityHistoryToLocalStorage();
    saveFacilitiesToLocalStorage();
    logAuditAction("تحديث الطاقة الاستيعابية", "facility", facilityCode, facility.name, {
        effective_from: effectiveFrom,
        change_reason: changeReason,
        capacity: snapshot
    });
    return true;
}

function getFacilityCapacityAtDate(facilityCode, dateValue) {
    const date = parseDateOnly(dateValue) || getTodayDateOnly();
    const timestamp = date.getTime();
    const records = capacityHistory
        .filter(record => record.facility_code === facilityCode)
        .filter(record => {
            const from = parseDateOnly(record.effective_from);
            const to = parseDateOnly(record.effective_to);
            return from && from.getTime() <= timestamp && (!to || to.getTime() >= timestamp);
        })
        .sort((first, second) => String(second.effective_from || "").localeCompare(String(first.effective_from || "")));

    if (records.length > 0) return records[0];
    const facility = getFacilityByCode(facilityCode);
    return facility ? getFacilityCapacitySnapshot(facility) : getFacilityCapacitySnapshot({});
}

function getLatestCapacityHistoryRecord(facilityCode) {
    return capacityHistory
        .filter(record => record.facility_code === facilityCode)
        .sort((first, second) => String(second.effective_from || "").localeCompare(String(first.effective_from || "")))[0] || null;
}

function renderCapacityHistory(facilityCode) {
    const rows = capacityHistory
        .filter(record => record.facility_code === facilityCode)
        .sort((first, second) => String(first.effective_from || "").localeCompare(String(second.effective_from || "")))
        .map(row => ({ ...row, effective_to: row.effective_to || "مستمر" }));

    return renderDetailRowsTable([
        { key: "effective_from", label: "بداية السريان" },
        { key: "effective_to", label: "نهاية السريان" },
        { key: "rooms", label: "الغرف" },
        { key: "beds", label: "الأسرة" },
        { key: "chalets", label: "الشاليهات" },
        { key: "suites", label: "الأجنحة" },
        { key: "apartments", label: "الشقق" },
        { key: "floors_count", label: "الطوابق" },
        { key: "workers_total", label: "العاملون" },
        { key: "change_reason", label: "سبب التغيير" },
        { key: "created_by", label: "المستخدم" },
        { key: "created_at", label: "تاريخ الإدخال" }
    ], rows);
}

function loadAuditLogData() {
    const saved = localStorage.getItem("tas_audit_log");
    if (saved) {
        try {
            auditLog = JSON.parse(saved);
        } catch (error) {
            console.error("خطأ في قراءة سجل النشاط:", error);
            auditLog = [];
            localStorage.removeItem("tas_audit_log");
        }
    } else {
        auditLog = [];
    }
}

function saveAuditLogToLocalStorage() {
    localStorage.setItem("tas_audit_log", JSON.stringify(auditLog));
}

function logAuditAction(action, entityType, entityCode, entityName, details = {}) {
    auditLog.push({
        id: auditLog.length + 1,
        action,
        entity_type: entityType,
        entity_code: entityCode,
        entity_name: entityName || "-",
        details,
        user: getCurrentUserName(),
        created_at: new Date().toISOString()
    });
    saveAuditLogToLocalStorage();
}

function getAuditRowsForFacility(facilityCode) {
    return auditLog.filter(row => row.entity_code === facilityCode || (row.details && row.details.facility_code === facilityCode));
}

// ===============================
// تحميل وحفظ بيانات التراخيص
// ===============================

function loadLicensesData() {
    const savedLicenses = localStorage.getItem("tas_licenses");

    if (savedLicenses) {
        try {
            licenses = JSON.parse(savedLicenses);
        } catch (error) {
            console.error("خطأ في قراءة بيانات التراخيص المحفوظة:", error);
            localStorage.removeItem("tas_licenses");
            licenses = [];
        }
    } else {
        licenses = [];
    }

    seedLicensesFromFacilitiesIfNeeded();
    renderLicensesTable();
    updateDashboard();
}

function saveLicensesToLocalStorage() {
    localStorage.setItem("tas_licenses", JSON.stringify(licenses));
}

function buildLicensesFromFacilities() {
    return facilities
        .filter(facility => facility.licenseStatus || facility.license_number)
        .map((facility, index) => {
            return {
                id: index + 1,
                facility_code: facility.facility_code,
                facility_name: facility.name,
                license_number: facility.license_number || `LY-LIC-2026-${String(index + 2).padStart(6, "0")}`,
                license_type: facility.license_type || "إذن مزاولة",
                license_status: facility.licenseStatus || "Active",
                issue_date: facility.license_issue_date || "2026-01-01",
                expiry_date: facility.license_expiry_date || "2026-12-31",
                renewal_count: Number(facility.renewal_count || 0),
                license_year: Number((facility.license_issue_date || "2026").slice(0, 4)) || 2026,
                operation_type: Number(facility.renewal_count || 0) > 0 ? "تجديد" : "إصدار جديد",
                renewal_date: facility.renewal_date || facility.license_issue_date || "2026-01-01",
                created_by: getCurrentUserName(),
                created_at: facility.created_at || new Date().toISOString(),
                license_document: facility.license_document || "-"
            };
        });
}

function seedLicensesFromFacilitiesIfNeeded() {
    if (!Array.isArray(facilities) || facilities.length === 0) {
        return;
    }

    if (Array.isArray(licenses) && licenses.length > 0) {
        return;
    }

    const seededLicenses = buildLicensesFromFacilities();

    if (seededLicenses.length === 0) {
        return;
    }

    licenses = seededLicenses;
    saveLicensesToLocalStorage();
    renderLicensesTable();
}

// ===============================
// تحميل وحفظ بيانات الإشغال الشهري
// ===============================

function loadOccupancyData() {
    const savedReports = localStorage.getItem("tas_occupancy_reports");

    if (savedReports) {
        try {
            occupancyReports = JSON.parse(savedReports);
        } catch (error) {
            console.error("خطأ في قراءة بيانات الإشغال:", error);
            localStorage.removeItem("tas_occupancy_reports");
            occupancyReports = [];
        }
    } else {
        occupancyReports = [];
    }

    renderOccupancyTable();
    updateStatisticsSection();
}

function saveOccupancyToLocalStorage() {
    localStorage.setItem("tas_occupancy_reports", JSON.stringify(occupancyReports));
}

// ===============================
// توليد الكود الوطني للمنشأة
// ===============================

function getFacilityTypeCode(type) {
    if (type === "فندق") return "HOT";
    if (type === "قرية سياحية") return "VIL";
    if (type === "منتجع") return "RES";
    if (type === "شقق فندقية") return "APT";
    if (type === "نزل") return "HST";
    if (type === "بيوت الشباب") return "YTH";
    if (type === "موتيل") return "MOT";

    return "ACC";
}

function getCityCode(city) {
    const normalizedCity = String(city || "").trim();

    if (normalizedCity === "طرابلس") return "TRP";
    if (normalizedCity === "بنغازي") return "BEN";
    if (normalizedCity === "مصراتة") return "MIS";
    if (normalizedCity === "الخمس") return "KHM";
    if (normalizedCity === "زوارة") return "ZWR";
    if (normalizedCity === "صبراتة") return "SBR";
    if (normalizedCity === "شحات") return "SHA";
    if (normalizedCity === "درنة") return "DRN";
    if (normalizedCity === "سبها") return "SEB";
    if (normalizedCity === "غدامس") return "GHD";
    if (normalizedCity === "غريان") return "GRY";
    if (normalizedCity === "نالوت") return "NLT";

    return "LYB";
}

function generateFacilityCode(type, city) {
    const typeCode = getFacilityTypeCode(type);
    const cityCode = getCityCode(city);
    const nextNumber = facilities.length + 1;
    const serial = String(nextNumber).padStart(6, "0");

    return `LY-ACC-${typeCode}-${cityCode}-${serial}`;
}

// ===============================
// التنقل بين الشاشات
// ===============================

function showSection(sectionId) {
    document.querySelectorAll(".section").forEach(section => {
        section.classList.remove("active");
    });

    const selectedSection = document.getElementById(sectionId);

    if (!selectedSection) {
        return;
    }

    selectedSection.classList.add("active");

    if (sectionId === "dashboard") {
        updateDashboard();
    }

    if (sectionId === "facilities") {
        renderFacilitiesTable();
    }

    if (sectionId === "addFacility") {
        setTimeout(() => {
            initMap();

            if (map) {
                map.invalidateSize();
            }
        }, 300);
    }

    if (sectionId === "licenses") {
        populateFacilitySelect();
        renderLicensesTable();
    }

    if (sectionId === "occupancy") {
        populateOccupancyFacilitySelect();
        updateMonthDays();
        renderOccupancyTable();
    }

    if (sectionId === "reports") {
        populateReportFacilitySelect();
        toggleReportMonth();
        resetReportSearch();
        renderReport([]);
    }

    if (sectionId === "statistics") {
        updateStatisticsSection();
    }
}

// ===============================
// لوحة التحكم
// ===============================

function updateDashboard() {
    const totalFacilitiesElement = document.getElementById("totalFacilities");
    const totalRoomsElement = document.getElementById("totalRooms");
    const totalBedsElement = document.getElementById("totalBeds");
    const activeLicensesElement = document.getElementById("activeLicenses");

    if (!totalFacilitiesElement || !totalRoomsElement || !totalBedsElement || !activeLicensesElement) {
        return;
    }

    const totalFacilities = facilities.length;

    const totalRooms = facilities.reduce((sum, item) => {
        return sum + Number(item.rooms || 0);
    }, 0);

    const totalBeds = facilities.reduce((sum, item) => {
        return sum + Number(item.beds || 0);
    }, 0);

    const activeLicenses = licenses.filter(item => {
        return item.license_status === "Active";
    }).length;

    const activeLicensesFromFacilities = facilities.filter(item => {
        return item.licenseStatus === "Active";
    }).length;

    totalFacilitiesElement.textContent = totalFacilities;
    totalRoomsElement.textContent = totalRooms;
    totalBedsElement.textContent = totalBeds;

    activeLicensesElement.textContent = licenses.length > 0
        ? activeLicenses
        : activeLicensesFromFacilities;

    updateStatisticsSection();
}

// ===============================
// سجل المرافق
// ===============================


function setSelectOptions(selectId, values, allLabel = "الكل") {
    const select = document.getElementById(selectId);

    if (!select) {
        return;
    }

    const currentValue = select.value;
    select.innerHTML = `<option value="">${allLabel}</option>`;

    values
        .filter(Boolean)
        .filter((value, index, array) => array.indexOf(value) === index)
        .sort((first, second) => String(first).localeCompare(String(second), "ar"))
        .forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });

    if ([...select.options].some(option => option.value === currentValue)) {
        select.value = currentValue;
    }
}

function populateFacilitiesFilters() {
    if (!Array.isArray(facilities)) {
        return;
    }

    setSelectOptions("facilitiesTypeFilter", facilities.map(item => item.type));
    setSelectOptions("facilitiesMunicipalityFilter", facilities.map(item => item.municipality));
    setSelectOptions("facilitiesCityFilter", facilities.map(item => item.city));
    setSelectOptions("facilitiesClassificationFilter", [
        ...facilities.map(item => item.classification || "غير مصنف"),
        "مصنف",
        "غير مصنف"
    ]);
}

function getFacilitiesFilterValues() {
    return {
        type: getTextValue("facilitiesTypeFilter"),
        municipality: getTextValue("facilitiesMunicipalityFilter"),
        city: getTextValue("facilitiesCityFilter"),
        licenseStatus: getTextValue("facilitiesLicenseStatusFilter"),
        status: getTextValue("facilitiesStatusFilter"),
        classification: getTextValue("facilitiesClassificationFilter")
    };
}

function applyFacilitiesFilters() {
    return searchFacilities(getTextValue("facilitiesSearchInput"), getFacilitiesFilterValues());
}

function renderFacilitiesPagination(totalItems, totalPages, startIndex, endIndex) {
    setText(
        "facilitiesPaginationInfo",
        totalItems > 0
            ? `عرض ${startIndex + 1} إلى ${endIndex} من أصل ${totalItems} مرفق`
            : "عرض 0 إلى 0 من أصل 0 مرفق"
    );
    setText("facilitiesPageNumber", `الصفحة ${currentFacilitiesPage} من ${totalPages}`);

    const prevButton = document.getElementById("facilitiesPrevPageBtn");
    const nextButton = document.getElementById("facilitiesNextPageBtn");

    if (prevButton) {
        prevButton.disabled = currentFacilitiesPage <= 1;
    }

    if (nextButton) {
        nextButton.disabled = currentFacilitiesPage >= totalPages;
    }
}

function renderFacilitiesTablePage() {
    const tableBody = document.getElementById("facilitiesTable");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (!Array.isArray(facilities) || facilities.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="15">${facilitiesLoadError || "لا توجد بيانات مرافق حالياً"}</td>`;
        tableBody.appendChild(row);
        currentFacilitiesPage = 1;
        renderFacilitiesPagination(0, 1, 0, 0);
        return;
    }

    const filteredFacilities = applyFacilitiesFilters();
    const totalItems = filteredFacilities.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / facilitiesPageSize));
    currentFacilitiesPage = Math.min(Math.max(currentFacilitiesPage, 1), totalPages);

    if (totalItems === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="15">لا توجد مرافق مطابقة للبحث أو الفلاتر المحددة</td>`;
        tableBody.appendChild(row);
        currentFacilitiesPage = 1;
        renderFacilitiesPagination(0, 1, 0, 0);
        return;
    }

    const startIndex = (currentFacilitiesPage - 1) * facilitiesPageSize;
    const endIndex = Math.min(startIndex + facilitiesPageSize, totalItems);
    const pageItems = filteredFacilities.slice(startIndex, endIndex);

    pageItems.forEach(item => {
        const row = document.createElement("tr");
        const licenseStatus = getLicenseStatusArabic(getFacilityLicenseStatus(item));

        row.innerHTML = `
            <td>${item.facility_code || "-"}</td>
            <td>${item.name || "-"}</td>
            <td>${item.name_en || "-"}</td>
            <td>${item.type || "-"}</td>
            <td>${item.municipality || "-"}</td>
            <td>${item.city || "-"}</td>
            <td>${getFacilityClassificationStatus(item)}</td>
            <td>${licenseStatus}</td>
            <td>${item.floors_count || 0}</td>
            <td>${item.rooms || 0}</td>
            <td>${item.beds || 0}</td>
            <td>${item.suites || 0}</td>
            <td>${getTotalWorkers(item)}</td>
            <td>${normalizeFacilityStatus(item.status)}</td>
            <td>
                <button type="button" class="table-action-button" onclick="renderFacilityFile('${item.facility_code || ""}')">عرض ملف المرفق</button>
                <button type="button" class="table-action-button" onclick="showFacilityHistory('${item.facility_code || ""}')">عرض التاريخ</button>
                <button type="button" class="table-action-button" onclick="showCapacityUpdateModal('${item.facility_code || ""}')">تحديث الطاقة الاستيعابية</button>
                <button type="button" class="table-action-button" onclick="showFacilityDetails('${item.facility_code || ""}')">عرض التفاصيل</button>
                <button type="button" class="table-action-button" onclick="startFacilityEdit('${item.facility_code || ""}')">تعديل</button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    renderFacilitiesPagination(totalItems, totalPages, startIndex, endIndex);
}


function getYesNoLabel(value) {
    return isYesValue(value) ? "نعم" : "لا";
}

function renderDetailGrid(items) {
    return `
        <div class="detail-grid">
            ${items.map(item => `
                <div><span>${escapeHtml(item.label)}</span>${escapeHtml(item.value === undefined || item.value === null || item.value === "" ? "-" : item.value)}</div>
            `).join("")}
        </div>
    `;
}

function renderDetailRowsTable(headers, rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return `<div class="advanced-report-empty">لا توجد بيانات مسجلة</div>`;
    }

    return `
        <div class="table-wrapper">
            <table class="facility-details-table">
                <thead><tr>${headers.map(header => `<th>${escapeHtml(header.label)}</th>`).join("")}</tr></thead>
                <tbody>
                    ${rows.map(row => `<tr>${headers.map(header => `<td>${escapeHtml(row[header.key] === undefined || row[header.key] === null || row[header.key] === "" ? "-" : row[header.key])}</td>`).join("")}</tr>`).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function getFacilityDetailsHtml(facility) {
    const services = facility.services || {};
    const recreation = services.recreation || {};
    const accessibility = facility.accessibility || {};
    const safety = facility.safety || {};
    const sustainability = facility.sustainability || {};
    const documents = facility.documents || {};
    const restaurantTotals = getRestaurantCafeTotalsFromData(facility.restaurant_cafe_details || []);
    const hallTotals = getMeetingHallTotalsFromData(facility.meeting_hall_details || []);

    return `
        <div class="detail-section">
            <h4>البيانات الأساسية والهندسية</h4>
            ${renderDetailGrid([
                { label: "الكود الوطني", value: facility.facility_code },
                { label: "اسم المرفق", value: facility.name },
                { label: "الاسم الإنجليزي", value: facility.name_en },
                { label: "الرقم الوطني / الإداري", value: facility.national_number },
                { label: "نوع السجل", value: getRecordTypeLabel(facility.record_type) },
                { label: "المجموعة / الاسم التجاري", value: facility.group_name },
                { label: "كود المجموعة", value: facility.group_code },
                { label: "اسم الفرع", value: facility.branch_name },
                { label: "عدد فروع المجموعة", value: facility.group_code ? getFacilityBranches(facility.group_code).length : 0 },
                { label: "النوع", value: facility.type },
                { label: "البلدية", value: facility.municipality },
                { label: "المدينة", value: facility.city },
                { label: "العنوان", value: facility.address },
                { label: "عدد الطوابق", value: facility.floors_count || 0 },
                { label: "عدد الغرف", value: facility.rooms || 0 },
                { label: "عدد الأسرة", value: facility.beds || 0 },
                { label: "عدد الأجنحة", value: facility.suites || 0 },
                { label: "عدد التراخيص التاريخية", value: getFacilityLicensesHistory(facility.facility_code).length },
                { label: "آخر تحديث للطاقة", value: (getLatestCapacityHistoryRecord(facility.facility_code) || {}).effective_from || "-" }
            ])}
        </div>

        <div class="detail-section">
            <h4>تفصيل الغرف</h4>
            ${renderDetailRowsTable([
                { key: "room_type", label: "نوع الغرفة" },
                { key: "rooms_count", label: "عدد الغرف" },
                { key: "beds_count", label: "عدد الأسرة" },
                { key: "room_rate", label: "التسعيرة" },
                { key: "notes", label: "ملاحظات" }
            ], (facility.room_details || []).filter(row => Number(row.rooms_count || 0) > 0 || Number(row.beds_count || 0) > 0 || Number(row.room_rate || 0) > 0 || row.notes))}
        </div>

        <div class="detail-section">
            <h4>تفصيل الأجنحة</h4>
            ${renderDetailRowsTable([
                { key: "suite_type", label: "نوع الجناح" },
                { key: "suites_count", label: "عدد الأجنحة" },
                { key: "beds_count", label: "عدد الأسرة" },
                { key: "suite_rate", label: "التسعيرة" },
                { key: "notes", label: "ملاحظات" }
            ], (facility.suite_details || []).filter(row => Number(row.suites_count || 0) > 0 || Number(row.beds_count || 0) > 0 || Number(row.suite_rate || 0) > 0 || row.notes))}
        </div>

        <div class="detail-section">
            <h4>الخدمات والمرافق</h4>
            ${renderDetailGrid([
                { label: "المطاعم والمقاهي", value: getYesNoLabel(services.restaurants_available) },
                { label: "عدد المطاعم والمقاهي", value: services.restaurants_count || restaurantTotals.count || 0 },
                { label: "قاعات الاجتماعات", value: getYesNoLabel(services.meeting_halls_available) },
                { label: "سعة القاعات", value: services.meeting_halls_capacity || hallTotals.seats || 0 },
                { label: "مواقف السيارات", value: getYesNoLabel(services.parking_available) },
                { label: "سعة مواقف السيارات", value: services.parking_capacity || 0 },
                { label: "Wi-Fi", value: services.wifi_status || "غير متوفر" },
                { label: "مسبح", value: getYesNoLabel(recreation.pool) },
                { label: "صالة رياضية", value: getYesNoLabel(recreation.gym) },
                { label: "سبا", value: getYesNoLabel(recreation.spa) },
                { label: "منطقة ألعاب أطفال", value: getYesNoLabel(recreation.kids_area) },
                { label: "ملاعب", value: getYesNoLabel(recreation.playgrounds) }
            ])}
        </div>

        <div class="detail-section">
            <h4>تفصيل المطاعم والمقاهي</h4>
            ${renderDetailRowsTable([
                { key: "sequence", label: "ر.م" },
                { key: "name", label: "الاسم" },
                { key: "seats_count", label: "المقاعد" },
                { key: "tables_count", label: "الطاولات" },
                { key: "notes", label: "ملاحظات" }
            ], facility.restaurant_cafe_details || [])}
        </div>

        <div class="detail-section">
            <h4>قاعات المؤتمرات والاجتماعات</h4>
            ${renderDetailRowsTable([
                { key: "sequence", label: "ر.م" },
                { key: "name", label: "اسم القاعة" },
                { key: "seats_count", label: "المقاعد" },
                { key: "notes", label: "ملاحظات" }
            ], facility.meeting_hall_details || [])}
        </div>

        <div class="detail-section">
            <h4>الأمن والسلامة والاستدامة</h4>
            ${renderDetailGrid([
                { label: "مرافق لذوي الاحتياجات الخاصة", value: getYesNoLabel(accessibility.accessible_rooms_available || accessibility.accessible_entrances_available || accessibility.accessible_elevators_available || accessibility.accessible_bathrooms_available) },
                { label: "ملاحظات السياحة الميسرة", value: accessibility.notes },
                { label: "منظومة إطفاء الحريق", value: safety.fire_system_status },
                { label: "كاميرات مراقبة", value: safety.cctv_status },
                { label: "مخارج طوارئ", value: safety.emergency_exits_status },
                { label: "إسعافات أولية", value: getYesNoLabel(safety.first_aid_available) },
                { label: "طاقة شمسية", value: getYesNoLabel(sustainability.solar_energy) },
                { label: "تدوير مياه", value: getYesNoLabel(sustainability.water_recycling) },
                { label: "أنظمة توفير طاقة", value: getYesNoLabel(sustainability.energy_saving_systems) }
            ])}
        </div>

        <div class="detail-section">
            <h4>المستندات وبيانات معبئ النموذج</h4>
            ${renderDetailGrid([
                { label: "السجل التجاري", value: documents.commercial_register_file },
                { label: "الترخيص السياحي", value: documents.tourism_license_file },
                { label: "صور المرفق", value: Array.isArray(documents.facility_photos) ? documents.facility_photos.join(" / ") : "" },
                { label: "تقرير المعاينة الفنية", value: documents.inspection_report_file },
                { label: "اسم معبئ النموذج", value: facility.form_filled_by },
                { label: "الصفة الوظيفية", value: facility.form_filled_by_position },
                { label: "تاريخ تعبئة النموذج", value: facility.form_filled_date }
            ])}
        </div>
    `;
}

function closeFacilityDetails() {
    const modal = document.getElementById("facilityDetailsModal");
    if (modal) {
        modal.classList.add("hidden");
    }
}

function showFacilityDetails(facilityCode) {
    const facility = getFacilityByCode(facilityCode);

    if (!facility) {
        alert("تعذر العثور على تفاصيل المرفق");
        return;
    }

    let modal = document.getElementById("facilityDetailsModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "facilityDetailsModal";
        modal.className = "facility-details-modal";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="facility-details-card">
            <div class="facility-details-header">
                <div>
                    <h3>${escapeHtml(facility.name || "تفاصيل المرفق")}</h3>
                    <p>${escapeHtml(facility.facility_code || "-")} - ${escapeHtml(facility.type || "-")}</p>
                </div>
                <button type="button" class="secondary-button" onclick="closeFacilityDetails()">إغلاق</button>
            </div>
            <div class="facility-details-body">
                ${getFacilityDetailsHtml(facility)}
            </div>
        </div>
    `;
    modal.classList.remove("hidden");
}

function closeFacilityModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("hidden");
}

function getFacilityFile(facilityCode) {
    const facility = getFacilityByCode(facilityCode);
    if (!facility) return null;
    return {
        facility,
        licenses: getFacilityLicensesHistory(facilityCode),
        occupancy: occupancyReports.filter(report => report.facility_code === facilityCode),
        capacity: capacityHistory.filter(record => record.facility_code === facilityCode),
        documents: facility.documents || {},
        audit: getAuditRowsForFacility(facilityCode)
    };
}

function getFacilityLicensesTableHtml(rows) {
    return renderDetailRowsTable([
        { key: "license_year", label: "السنة" },
        { key: "license_number", label: "رقم الترخيص" },
        { key: "license_type", label: "نوع الترخيص" },
        { key: "operation_type", label: "نوع العملية" },
        { key: "issue_date", label: "تاريخ الإصدار" },
        { key: "renewal_date", label: "تاريخ التجديد" },
        { key: "expiry_date", label: "تاريخ الانتهاء" },
        { key: "license_status", label: "الحالة" },
        { key: "renewal_count", label: "عدد التجديدات" },
        { key: "license_document", label: "ملف الترخيص" },
        { key: "created_by", label: "أضيف بواسطة" },
        { key: "created_at", label: "تاريخ الإدخال" },
        { key: "notes", label: "ملاحظات" }
    ], rows.map(row => ({
        ...row,
        license_status: getLicenseStatusArabic(getLicenseStatusForReport(row)),
        license_year: row.license_year || (getLicenseIssueDateValue(row) ? String(getLicenseIssueDateValue(row)).slice(0, 4) : "-"),
        renewal_date: row.renewal_date || "-",
        created_by: row.created_by || "-",
        created_at: row.created_at || "-"
    })));
}

function getFacilityOccupancyTableHtml(rows) {
    return renderDetailRowsTable([
        { key: "year", label: "السنة" },
        { key: "month_name", label: "الشهر" },
        { key: "rooms", label: "الغرف" },
        { key: "beds", label: "الأسرة" },
        { key: "total_guests", label: "النزلاء" },
        { key: "total_guest_nights", label: "الليالي السياحية" },
        { key: "room_occupancy_rate", label: "إشغال الغرف" },
        { key: "bed_occupancy_rate", label: "إشغال الأسرة" },
        { key: "average_length_of_stay", label: "متوسط الإقامة" },
        { key: "notes", label: "ملاحظات" }
    ], rows.map(row => ({ ...row, month_name: getMonthName(row.month) })));
}

function getFacilityAuditTableHtml(rows) {
    return renderDetailRowsTable([
        { key: "created_at", label: "التاريخ" },
        { key: "user", label: "المستخدم" },
        { key: "action", label: "الإجراء" },
        { key: "entity_type", label: "نوع السجل" },
        { key: "details_text", label: "التفاصيل" }
    ], rows.map(row => ({
        ...row,
        details_text: row.details ? JSON.stringify(row.details) : "-"
    })));
}

function getFacilityFileHtml(file) {
    const facility = file.facility;
    const currentLicense = getFacilityCurrentLicense(facility.facility_code);
    return `
        ${getOfficialReportHeaderHtml("ملف المرفق")}
        <div class="official-report-meta">تاريخ إعداد الملف: ${escapeHtml(new Date().toLocaleDateString("ar-LY"))}</div>
        <div class="detail-section">
            <h4>بطاقة تعريف المرفق</h4>
            ${renderDetailGrid([
                { label: "الكود الوطني", value: facility.facility_code },
                { label: "اسم المرفق", value: facility.name },
                { label: "الاسم الإنجليزي", value: facility.name_en },
                { label: "نوع المرفق", value: facility.type },
                { label: "البلدية", value: facility.municipality },
                { label: "المدينة", value: facility.city },
                { label: "العنوان", value: facility.address },
                { label: "المجموعة / الاسم التجاري", value: facility.group_name },
                { label: "كود المجموعة", value: facility.group_code },
                { label: "اسم الفرع", value: facility.branch_name },
                { label: "نوع السجل", value: getRecordTypeLabel(facility.record_type) },
                { label: "حالة المرفق", value: normalizeFacilityStatus(facility.status) },
                { label: "التصنيف", value: getFacilityClassificationStatus(facility) },
                { label: "درجة التصنيف", value: facility.classification || "غير مصنف" },
                { label: "الغرف الحالية", value: facility.rooms || 0 },
                { label: "الأسرة الحالية", value: facility.beds || 0 },
                { label: "الشاليهات الحالية", value: facility.chalets || 0 },
                { label: "إجمالي العاملين الحالي", value: getTotalWorkers(facility) },
                { label: "آخر ترخيص", value: currentLicense ? currentLicense.license_number : "-" },
                { label: "حالة آخر ترخيص", value: currentLicense ? getLicenseStatusArabic(getLicenseStatusForReport(currentLicense)) : "-" }
            ])}
        </div>
        <div class="detail-section"><h4>التراخيص وأذونات المزاولة</h4>${getFacilityLicensesTableHtml(file.licenses)}</div>
        <div class="detail-section"><h4>الإشغال والليالي السياحية</h4>${getFacilityOccupancyTableHtml(file.occupancy)}</div>
        <div class="detail-section"><h4>تطور الطاقة الاستيعابية</h4>${renderCapacityHistory(facility.facility_code)}</div>
        <div class="detail-section"><h4>المستندات</h4>${renderDetailGrid([
            { label: "السجل التجاري", value: file.documents.commercial_register_file },
            { label: "الترخيص السياحي", value: file.documents.tourism_license_file },
            { label: "تقرير المعاينة", value: file.documents.inspection_report_file },
            { label: "الصور", value: Array.isArray(file.documents.facility_photos) ? file.documents.facility_photos.join(" / ") : "" },
            { label: "مستندات أخرى", value: Array.isArray(file.documents.facility_documents) ? file.documents.facility_documents.join(" / ") : "" }
        ])}</div>
        <div class="detail-section"><h4>سجل النشاط</h4>${getFacilityAuditTableHtml(file.audit)}</div>
        ${getOfficialReportFooterHtml()}
    `;
}

function renderFacilityFile(facilityCode) {
    const file = getFacilityFile(facilityCode);
    if (!file) {
        alert("تعذر العثور على ملف المرفق");
        return;
    }

    let modal = document.getElementById("facilityFileModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "facilityFileModal";
        modal.className = "facility-details-modal";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="facility-details-card facility-file-card">
            <div class="facility-details-header">
                <div><h3>ملف المرفق</h3><p>${escapeHtml(file.facility.name || "-")} - ${escapeHtml(file.facility.facility_code || "-")}</p></div>
                <div class="inline-actions">
                    <button type="button" class="secondary-button" onclick="exportFacilityFileCSV('${file.facility.facility_code}')">تصدير CSV</button>
                    <button type="button" class="secondary-button" onclick="printFacilityFile('${file.facility.facility_code}')">طباعة الملف</button>
                    <button type="button" class="secondary-button" onclick="closeFacilityModal('facilityFileModal')">إغلاق</button>
                </div>
            </div>
            <div class="facility-details-body">${getFacilityFileHtml(file)}</div>
        </div>
    `;
    modal.classList.remove("hidden");
}

function showFacilityHistory(facilityCode) {
    const facility = getFacilityByCode(facilityCode);
    if (!facility) {
        alert("تعذر العثور على المرفق");
        return;
    }

    let modal = document.getElementById("facilityHistoryModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "facilityHistoryModal";
        modal.className = "facility-details-modal";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="facility-details-card">
            <div class="facility-details-header">
                <div><h3>التاريخ التشغيلي للمرفق</h3><p>${escapeHtml(facility.name || "-")} - ${escapeHtml(facility.facility_code || "-")}</p></div>
                <button type="button" class="secondary-button" onclick="closeFacilityModal('facilityHistoryModal')">إغلاق</button>
            </div>
            <div class="facility-details-body">
                <div class="detail-section"><h4>سجل الطاقة الاستيعابية</h4>${renderCapacityHistory(facilityCode)}</div>
                <div class="detail-section"><h4>سجل التراخيص التاريخي</h4>${getFacilityLicensesTableHtml(getFacilityLicensesHistory(facilityCode))}</div>
                <div class="detail-section"><h4>سجل النشاط</h4>${getFacilityAuditTableHtml(getAuditRowsForFacility(facilityCode))}</div>
            </div>
        </div>
    `;
    modal.classList.remove("hidden");
}

function showCapacityUpdateModal(facilityCode) {
    const facility = getFacilityByCode(facilityCode);
    if (!facility) {
        alert("تعذر العثور على المرفق");
        return;
    }

    const capacity = getFacilityCapacitySnapshot(facility);
    let modal = document.getElementById("capacityUpdateModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "capacityUpdateModal";
        modal.className = "facility-details-modal";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="facility-details-card">
            <div class="facility-details-header">
                <div><h3>تحديث الطاقة الاستيعابية</h3><p>${escapeHtml(facility.name || "-")} - ${escapeHtml(facility.facility_code || "-")}</p></div>
                <button type="button" class="secondary-button" onclick="closeFacilityModal('capacityUpdateModal')">إغلاق</button>
            </div>
            <div class="facility-details-body">
                <div class="detail-section"><h4>الطاقة الحالية</h4>${renderDetailGrid([
                    { label: "الغرف", value: capacity.rooms },
                    { label: "الأسرة", value: capacity.beds },
                    { label: "الشاليهات", value: capacity.chalets },
                    { label: "الأجنحة", value: capacity.suites },
                    { label: "الشقق", value: capacity.apartments },
                    { label: "الطوابق", value: capacity.floors_count },
                    { label: "العاملون", value: capacity.workers_total }
                ])}</div>
                <div class="form-grid">
                    <input type="hidden" id="capacityUpdateFacilityCode" value="${escapeHtml(facility.facility_code)}">
                    <div><label for="capacityEffectiveFrom">تاريخ بداية السريان</label><input type="date" id="capacityEffectiveFrom" value="${new Date().toISOString().slice(0, 10)}" required></div>
                    <div><label for="capacityRooms">عدد الغرف الجديد</label><input type="number" id="capacityRooms" min="0" value="${capacity.rooms}"></div>
                    <div><label for="capacityBeds">عدد الأسرة الجديد</label><input type="number" id="capacityBeds" min="0" value="${capacity.beds}"></div>
                    <div><label for="capacityChalets">عدد الشاليهات الجديد</label><input type="number" id="capacityChalets" min="0" value="${capacity.chalets}"></div>
                    <div><label for="capacitySuites">عدد الأجنحة الجديد</label><input type="number" id="capacitySuites" min="0" value="${capacity.suites}"></div>
                    <div><label for="capacityApartments">عدد الشقق الجديد</label><input type="number" id="capacityApartments" min="0" value="${capacity.apartments}"></div>
                    <div><label for="capacityFloors">عدد الطوابق الجديد</label><input type="number" id="capacityFloors" min="0" value="${capacity.floors_count}"></div>
                    <div><label for="capacityWorkers">إجمالي العاملين الجديد</label><input type="number" id="capacityWorkers" min="0" value="${capacity.workers_total}"></div>
                    <div style="grid-column: span 4;"><label for="capacityChangeReason">سبب التغيير</label><textarea id="capacityChangeReason" required placeholder="مثال: توسعة المرفق وزيادة عدد الشاليهات"></textarea></div>
                </div>
                <div class="form-actions"><button type="button" onclick="saveCapacityUpdateFromModal()">حفظ التحديث</button></div>
            </div>
        </div>
    `;
    modal.classList.remove("hidden");
}

function saveCapacityUpdateFromModal() {
    const facilityCode = getTextValue("capacityUpdateFacilityCode");
    const effectiveFrom = getTextValue("capacityEffectiveFrom");
    const changeReason = getTextValue("capacityChangeReason");

    if (!facilityCode || !effectiveFrom || !changeReason) {
        alert("يرجى إدخال تاريخ بداية السريان وسبب التغيير");
        return;
    }

    const newCapacity = {
        rooms: getNumberValue("capacityRooms"),
        beds: getNumberValue("capacityBeds"),
        chalets: getNumberValue("capacityChalets"),
        suites: getNumberValue("capacitySuites"),
        apartments: getNumberValue("capacityApartments"),
        floors_count: getNumberValue("capacityFloors"),
        total_workers: getNumberValue("capacityWorkers"),
        workers_total: getNumberValue("capacityWorkers")
    };

    if (updateFacilityCapacityWithHistory(facilityCode, newCapacity, effectiveFrom, changeReason)) {
        renderFacilitiesTable();
        updateDashboard();
        updateStatisticsSection();
        closeFacilityModal("capacityUpdateModal");
        alert("تم حفظ تحديث الطاقة الاستيعابية في السجل التاريخي");
    }
}

function exportFacilityFileCSV(facilityCode) {
    const file = getFacilityFile(facilityCode);
    if (!file) return;

    let csvContent = "\uFEFF";
    csvContent += ["وزارة السياحة والصناعات التقليدية", "إدارة المهن والرقابة السياحية", "قسم الإيواء السياحي", `اسم التقرير: ملف المرفق - ${file.facility.name}`].map(escapeCsvValue).join("\n") + "\n\n";
    csvContent += ["الكود الوطني", "اسم المرفق", "المجموعة", "الفرع", "البلدية", "المدينة", "الغرف", "الأسرة", "الشاليهات", "العاملون"].map(escapeCsvValue).join(",") + "\n";
    csvContent += [file.facility.facility_code, file.facility.name, file.facility.group_name, file.facility.branch_name, file.facility.municipality, file.facility.city, file.facility.rooms || 0, file.facility.beds || 0, file.facility.chalets || 0, getTotalWorkers(file.facility)].map(escapeCsvValue).join(",") + "\n\n";
    csvContent += escapeCsvValue("التراخيص") + "\n";
    csvContent += ["السنة", "رقم الترخيص", "نوع الترخيص", "نوع العملية", "تاريخ الإصدار", "تاريخ التجديد", "تاريخ الانتهاء", "الحالة"].map(escapeCsvValue).join(",") + "\n";
    file.licenses.forEach(license => {
        csvContent += [license.license_year, license.license_number, license.license_type, license.operation_type, license.issue_date, license.renewal_date, license.expiry_date, getLicenseStatusArabic(getLicenseStatusForReport(license))].map(escapeCsvValue).join(",") + "\n";
    });
    csvContent += "\n" + escapeCsvValue("تصميم وبرمجة مركز المعلومات والتوثيق السياحي 2026") + "\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `facility_file_${facilityCode || "facility"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function printFacilityFile(facilityCode) {
    const file = getFacilityFile(facilityCode);
    if (!file) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
        alert("تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.");
        return;
    }

    printWindow.document.write(`
        <html dir="rtl" lang="ar">
        <head><meta charset="UTF-8"><title>ملف المرفق</title><style>
            body { font-family: Arial, sans-serif; direction: rtl; padding: 22px; color: #222; }
            .official-report-header { text-align: center; border-bottom: 2px solid #0277bd; padding-bottom: 12px; margin-bottom: 16px; }
            .official-report-footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #90a4ae; text-align: center; font-weight: bold; }
            .detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 10px 0; }
            .detail-grid div { border: 1px solid #cfd8dc; padding: 7px; }
            .detail-grid span { display: block; font-weight: bold; color: #0277bd; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #777; padding: 5px; text-align: center; font-size: 10px; }
            th { background: #0277bd; color: white; }
            @page { size: A4 landscape; margin: 10mm; }
        </style></head>
        <body>${getFacilityFileHtml(file)}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function renderFacilitiesTable() {
    renderFacilitiesTablePage();
}

function resetFacilitiesPaginationAndRender() {
    currentFacilitiesPage = 1;
    renderFacilitiesTablePage();
}

function changeFacilitiesPage(direction) {
    currentFacilitiesPage += direction;
    renderFacilitiesTablePage();
}

function getFacilityUnitsDescription(facility) {
    const units = [];

    if (Number(facility.suites || 0) > 0) {
        units.push(`${facility.suites} أجنحة`);
    }

    if (Number(facility.chalets || 0) > 0) {
        units.push(`${facility.chalets} شاليهات`);
    }

    if (Number(facility.apartments || 0) > 0) {
        units.push(`${facility.apartments} شقق`);
    }

    return units.length > 0 ? units.join(" / ") : "-";
}



function setRoomDetailsForm(details = []) {
    const rows = Array.from(document.querySelectorAll("#roomDetailsTable tbody tr"));
    rows.forEach(row => {
        const item = details.find(detail => detail.room_type === row.dataset.roomType) || {};
        const rooms = getInputInRow(row, ".room-detail-rooms");
        const beds = getInputInRow(row, ".room-detail-beds");
        const rate = getInputInRow(row, ".room-detail-rate");
        const notes = getInputInRow(row, ".room-detail-notes");
        if (rooms) rooms.value = Number(item.rooms_count || 0);
        if (beds) beds.value = Number(item.beds_count || 0);
        if (rate) rate.value = Number(item.room_rate || 0);
        if (notes) notes.value = item.notes || "";
    });
    calculateRoomDetailsTotals();
}

function setSuiteDetailsForm(details = []) {
    const rows = Array.from(document.querySelectorAll("#suiteDetailsTable tbody tr"));
    rows.forEach(row => {
        const item = details.find(detail => detail.suite_type === row.dataset.suiteType) || {};
        const suites = getInputInRow(row, ".suite-detail-suites");
        const beds = getInputInRow(row, ".suite-detail-beds");
        const rate = getInputInRow(row, ".suite-detail-rate");
        const notes = getInputInRow(row, ".suite-detail-notes");
        if (suites) suites.value = Number(item.suites_count || 0);
        if (beds) beds.value = Number(item.beds_count || 0);
        if (rate) rate.value = Number(item.suite_rate || 0);
        if (notes) notes.value = item.notes || "";
    });
    calculateSuiteDetailsTotals();
}

function setRestaurantCafeDetailsForm(details = []) {
    const rows = Array.from(document.querySelectorAll("#restaurantCafeDetailsTable tbody tr"));
    rows.forEach((row, index) => {
        const item = details[index] || {};
        const name = getInputInRow(row, ".restaurant-name");
        const seats = getInputInRow(row, ".restaurant-seats");
        const tables = getInputInRow(row, ".restaurant-tables");
        const notes = getInputInRow(row, ".restaurant-notes");
        if (name) name.value = item.name || "";
        if (seats) seats.value = Number(item.seats_count || 0);
        if (tables) tables.value = Number(item.tables_count || 0);
        if (notes) notes.value = item.notes || "";
    });
    calculateRestaurantCafeTotals();
}

function setMeetingHallDetailsForm(details = []) {
    const rows = Array.from(document.querySelectorAll("#meetingHallDetailsTable tbody tr"));
    rows.forEach((row, index) => {
        const item = details[index] || {};
        const name = getInputInRow(row, ".meeting-hall-name");
        const seats = getInputInRow(row, ".meeting-hall-seats");
        const notes = getInputInRow(row, ".meeting-hall-notes");
        if (name) name.value = item.name || "";
        if (seats) seats.value = Number(item.seats_count || 0);
        if (notes) notes.value = item.notes || "";
    });
    calculateMeetingHallTotals();
}

function clearFacilityDetailForms() {
    setRoomDetailsForm([]);
    setSuiteDetailsForm([]);
    setRestaurantCafeDetailsForm([]);
    setMeetingHallDetailsForm([]);
}

function getServicesFromForm() {
    return {
        restaurants_available: getTextValue("restaurantsAvailable") === "yes",
        restaurants_count: getNumberValue("restaurantsCount"),
        meeting_halls_available: getTextValue("meetingHallsAvailable") === "yes",
        meeting_halls_capacity: getNumberValue("meetingHallsCapacity"),
        recreation: {
            pool: getCheckboxValue("hasPool"),
            gym: getCheckboxValue("hasGym"),
            spa: getCheckboxValue("hasSpa"),
            kids_area: getCheckboxValue("hasKidsArea"),
            playgrounds: getCheckboxValue("hasPlaygrounds"),
            swimming_pools: getCheckboxValue("hasSwimmingPools")
        },
        parking_available: getTextValue("parkingAvailable") === "yes",
        parking_capacity: getNumberValue("parkingCapacity"),
        wifi_status: getTextValue("wifiStatus") || "غير متوفر"
    };
}

function getAccessibilityFromForm() {
    return {
        accessible_rooms_available: getTextValue("accessibleRoomsAvailable") === "yes",
        accessible_entrances_available: getTextValue("accessibleEntrancesAvailable") === "yes",
        accessible_elevators_available: getTextValue("accessibleElevatorsAvailable") === "yes",
        accessible_bathrooms_available: getTextValue("accessibleBathroomsAvailable") === "yes",
        notes: getTextValue("accessibilityNotes")
    };
}

function getSafetyFromForm() {
    return {
        fire_system_status: getTextValue("fireSystemStatus") || "غير معتمدة / تحت التجهيز",
        cctv_status: getTextValue("cctvStatus") || "غير متوفرة",
        emergency_exits_status: getTextValue("emergencyExitsStatus") || "غير مطابقة",
        first_aid_available: getTextValue("firstAidAvailable") === "yes"
    };
}

function getSustainabilityFromForm() {
    return {
        solar_energy: getCheckboxValue("usesSolarEnergy"),
        water_recycling: getCheckboxValue("usesWaterRecycling"),
        energy_saving_systems: getCheckboxValue("usesEnergySavingSystems")
    };
}

function toggleFacilityGroupFields() {
    const recordType = getTextValue("facilityRecordType");
    const hasGroup = getTextValue("hasFacilityGroup") === "yes" || recordType === "branch";
    if (recordType === "branch") setSelectValue("hasFacilityGroup", "yes");
    document.querySelectorAll(".facility-group-field").forEach(field => field.classList.toggle("hidden", !hasGroup));
}

function fillFacilityGroupFields(facility) {
    const hasGroup = Boolean(facility.has_group || facility.group_code);
    setSelectValue("facilityRecordType", normalizeFacilityRecordType(facility.record_type || (hasGroup ? "branch" : "standalone")));
    setSelectValue("hasFacilityGroup", hasGroup ? "yes" : "no");
    setValue("facilityGroupName", facility.group_name || "");
    setValue("facilityGroupCode", facility.group_code || "");
    setValue("branchName", facility.branch_name || "");
    toggleFacilityGroupFields();
}

function validateFacilityGroupFields() {
    const hasGroup = getTextValue("hasFacilityGroup") === "yes" || getTextValue("facilityRecordType") === "branch";
    if (hasGroup && !getTextValue("facilityGroupName")) {
        alert("يرجى إدخال اسم المجموعة أو الاسم التجاري");
        return false;
    }
    return true;
}

function fillFacilityExtendedFields(facility) {
    fillFacilityGroupFields(facility);
    setValue("facilityNameEn", facility.name_en || "");
    setValue("nationalNumber", facility.national_number || "");
    setValue("floorsCount", Number(facility.floors_count || 0));
    setRoomDetailsForm(facility.room_details || []);
    setSuiteDetailsForm(facility.suite_details || []);
    setRestaurantCafeDetailsForm(facility.restaurant_cafe_details || []);
    setMeetingHallDetailsForm(facility.meeting_hall_details || []);

    const services = facility.services || {};
    setSelectValue("restaurantsAvailable", isYesValue(services.restaurants_available) ? "yes" : "no");
    setValue("restaurantsCount", Number(services.restaurants_count || 0));
    setSelectValue("meetingHallsAvailable", isYesValue(services.meeting_halls_available) ? "yes" : "no");
    setValue("meetingHallsCapacity", Number(services.meeting_halls_capacity || 0));
    setSelectValue("parkingAvailable", isYesValue(services.parking_available) ? "yes" : "no");
    setValue("parkingCapacity", Number(services.parking_capacity || 0));
    setSelectValue("wifiStatus", services.wifi_status || "غير متوفر");

    const recreation = services.recreation || {};
    setChecked("hasPool", recreation.pool);
    setChecked("hasGym", recreation.gym);
    setChecked("hasSpa", recreation.spa);
    setChecked("hasKidsArea", recreation.kids_area);
    setChecked("hasPlaygrounds", recreation.playgrounds);
    setChecked("hasSwimmingPools", recreation.swimming_pools);

    const accessibility = facility.accessibility || {};
    setSelectValue("accessibleRoomsAvailable", isYesValue(accessibility.accessible_rooms_available) ? "yes" : "no");
    setSelectValue("accessibleEntrancesAvailable", isYesValue(accessibility.accessible_entrances_available) ? "yes" : "no");
    setSelectValue("accessibleElevatorsAvailable", isYesValue(accessibility.accessible_elevators_available) ? "yes" : "no");
    setSelectValue("accessibleBathroomsAvailable", isYesValue(accessibility.accessible_bathrooms_available) ? "yes" : "no");
    setValue("accessibilityNotes", accessibility.notes || "");

    const safety = facility.safety || {};
    setSelectValue("fireSystemStatus", safety.fire_system_status || "غير معتمدة / تحت التجهيز");
    setSelectValue("cctvStatus", safety.cctv_status || "غير متوفرة");
    setSelectValue("emergencyExitsStatus", safety.emergency_exits_status || "غير مطابقة");
    setSelectValue("firstAidAvailable", isYesValue(safety.first_aid_available) ? "yes" : "no");

    const sustainability = facility.sustainability || {};
    setChecked("usesSolarEnergy", sustainability.solar_energy);
    setChecked("usesWaterRecycling", sustainability.water_recycling);
    setChecked("usesEnergySavingSystems", sustainability.energy_saving_systems);

    setValue("formFilledBy", facility.form_filled_by || "");
    setValue("formFilledByPosition", facility.form_filled_by_position || "");
    setValue("formFilledDate", facility.form_filled_date || "");
}

function validateFacilityExtendedFields() {
    if (!validateFacilityGroupFields()) {
        return false;
    }

    const nationalNumber = getTextValue("nationalNumber");
    if (nationalNumber && !/^\d{12}$/.test(nationalNumber)) {
        alert("الرقم الوطني يجب أن يتكون من 12 خانة.");
        return false;
    }

    const email = getTextValue("facilityEmail");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert("يرجى إدخال بريد إلكتروني صحيح");
        return false;
    }

    const website = getTextValue("facilityWebsite");
    if (website) {
        try {
            const url = new URL(website);
            if (!["http:", "https:"].includes(url.protocol)) {
                throw new Error("invalid protocol");
            }
        } catch (error) {
            alert("يرجى إدخال رابط موقع إلكتروني صحيح يبدأ بـ http:// أو https://");
            return false;
        }
    }

    return true;
}

function clearFacilityCapacityFields() {
    [
        "floorsCount",
        "suitesCount",
        "roomsCount",
        "bedsPerRoom",
        "bedsCount",
        "chaletsCount",
        "vrRoomsCount",
        "vrAverageBedsPerRoom",
        "vrBedsCount",
        "villageResortExtras",
        "apartmentsCount",
        "apRoomsCount",
        "apAverageBedsPerRoom",
        "apBedsCount",
        "hsRoomsCount",
        "hsAverageBedsPerRoom",
        "hsBedsCount",
        "nationalMaleWorkers",
        "nationalFemaleWorkers",
        "foreignMaleWorkers",
        "foreignFemaleWorkers",
        "totalWorkers",
        "seasonalNationalMaleWorkers",
        "seasonalNationalFemaleWorkers",
        "seasonalForeignMaleWorkers",
        "seasonalForeignFemaleWorkers",
        "seasonalTotalWorkers",
        "seasonStartDate",
        "seasonEndDate",
        "seasonalWorkersNotes",
        "facilityNameEn",
        "nationalNumber",
        "facilityGroupName",
        "facilityGroupCode",
        "branchName",
        "restaurantsCount",
        "meetingHallsCapacity",
        "parkingCapacity",
        "accessibilityNotes",
        "formFilledBy",
        "formFilledByPosition",
        "formFilledDate"
    ].forEach(id => setValue(id, ""));

    setSelectValue("facilityRecordType", "standalone");
    setSelectValue("hasFacilityGroup", "no");
    toggleFacilityGroupFields();
    clearFacilityDetailForms();
}

function setFacilityFormMode(mode) {
    const isEditMode = mode === "edit";

    setText("facilityFormTitle", isEditMode ? "تعديل بيانات مرفق إيواء سياحي" : "إضافة مرفق إيواء سياحي");
    setText(
        "facilityFormDescription",
        isEditMode
            ? "تحديث بيانات المرفق مع الحفاظ على الكود الوطني الحالي"
            : "تسجيل فندق، قرية سياحية، منتجع، شقق فندقية، نزل، بيوت الشباب، أو موتيل ضمن السجل الوطني"
    );
    setText("facilitySubmitButton", isEditMode ? "حفظ التعديل" : "حفظ المرفق وتوليد الكود الوطني");

    const cancelButton = document.getElementById("cancelFacilityEditButton");
    if (cancelButton) {
        cancelButton.classList.toggle("hidden", !isEditMode);
    }
}

function resetFacilityFormState() {
    currentEditingFacilityCode = "";
    setValue("editingFacilityCode", "");
    setFacilityFormMode("add");
}


function fillFacilityCapacityFields(facility) {
    clearFacilityCapacityFields();

    const averageBeds = Number(facility.average_beds_per_room || facility.beds_per_room || 0);
    setValue("floorsCount", Number(facility.floors_count || 0));

    if (facility.type === "فندق") {
        setValue("suitesCount", Number(facility.suites || 0));
        setValue("roomsCount", Number(facility.rooms || 0));
        setValue("bedsPerRoom", averageBeds);
        setValue("bedsCount", Number(facility.beds || 0));
    }

    if (facility.type === "قرية سياحية" || facility.type === "منتجع") {
        setValue("chaletsCount", Number(facility.chalets || 0));
        setValue("vrRoomsCount", Number(facility.rooms || 0));
        setValue("vrAverageBedsPerRoom", averageBeds);
        setValue("vrBedsCount", Number(facility.beds || 0));
        setValue("villageResortExtras", facility.extras || "");
    }

    if (facility.type === "شقق فندقية") {
        setValue("apartmentsCount", Number(facility.apartments || 0));
        setValue("apRoomsCount", Number(facility.rooms || 0));
        setValue("apAverageBedsPerRoom", averageBeds);
        setValue("apBedsCount", Number(facility.beds || 0));
    }

    if (facility.type === "نزل" || facility.type === "بيوت الشباب" || facility.type === "موتيل") {
        setValue("hsRoomsCount", Number(facility.rooms || 0));
        setValue("hsAverageBedsPerRoom", averageBeds);
        setValue("hsBedsCount", Number(facility.beds || 0));
    }

    setValue("nationalMaleWorkers", Number(facility.national_male_workers || facility.local_workers || 0));
    setValue("nationalFemaleWorkers", Number(facility.national_female_workers || 0));
    setValue("foreignMaleWorkers", Number(facility.foreign_male_workers || facility.foreign_workers || 0));
    setValue("foreignFemaleWorkers", Number(facility.foreign_female_workers || 0));
    setValue("totalWorkers", getTotalWorkers(facility));

    const seasonalWorkers = facility.seasonal_workers || {};
    setSelectValue("hasSeasonalWorkers", isSeasonalWorkersYes(seasonalWorkers.has_seasonal_workers) ? "yes" : "no");
    setValue("seasonalNationalMaleWorkers", Number(seasonalWorkers.national_male_workers || 0));
    setValue("seasonalNationalFemaleWorkers", Number(seasonalWorkers.national_female_workers || 0));
    setValue("seasonalForeignMaleWorkers", Number(seasonalWorkers.foreign_male_workers || 0));
    setValue("seasonalForeignFemaleWorkers", Number(seasonalWorkers.foreign_female_workers || 0));
    setValue("seasonalTotalWorkers", Number(seasonalWorkers.total_workers || 0));
    setValue("seasonStartDate", seasonalWorkers.season_start || "");
    setValue("seasonEndDate", seasonalWorkers.season_end || "");
    setValue("seasonalWorkersNotes", seasonalWorkers.notes || "");

    updateAllFacilityCalculatedFields();
}

function fillFacilityForm(facility) {
    setValue("editingFacilityCode", facility.facility_code || "");
    setValue("facilityName", facility.name || "");
    setValue("facilityNameEn", facility.name_en || "");
    setValue("nationalNumber", facility.national_number || "");
    setSelectValue("facilityType", facility.type || "فندق");
    setValue("facilityMunicipality", facility.municipality || "");
    setValue("facilityCity", facility.city || "");
    setValue("establishmentDate", facility.establishment_date || "");
    setValue("facilityAddress", facility.address || "");
    setValue("ownerName", facility.owner_name || "");
    setValue("operatorName", facility.operator_name || "");
    setValue("managerName", facility.manager_name || "");
    setValue("facilityPhone", facility.phone || "");
    setValue("facilityEmail", facility.email || "");
    setValue("facilityWebsite", facility.website || "");
    setSelectValue("classification", facility.classification || "غير مصنف");
    setSelectValue("facilityAffiliation", facility.affiliation || "");
    setSelectValue("facilityStatus", normalizeFacilityStatus(facility.status));
    setSelectValue("licenseStatus", facility.licenseStatus || "Active");
    setValue("latitude", facility.latitude || "");
    setValue("longitude", facility.longitude || "");

    toggleFacilityFields();
    fillFacilityCapacityFields(facility);
    fillFacilityExtendedFields(facility);
    updateFacilityCapacityTotals();
}

function startFacilityEdit(facilityCode) {
    const facility = getFacilityByCode(facilityCode);

    if (!facility) {
        alert("تعذر العثور على المرفق المطلوب تعديله");
        return;
    }

    currentEditingFacilityCode = facility.facility_code;
    setFacilityFormMode("edit");
    showSection("addFacility");
    fillFacilityForm(facility);

    setTimeout(() => {
        initMap();

        const lat = parseFloat(facility.latitude);
        const lng = parseFloat(facility.longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
            updateMarker(lat, lng, 14);
        }

        if (map) {
            map.invalidateSize();
        }
    }, 350);
}

function cancelFacilityEdit() {
    const form = document.getElementById("facilityForm");
    if (form) form.reset();

    resetFacilityFormState();
    toggleFacilityFields();
    resetMap();
    showSection("facilities");
}

// ===============================
// الحقول الديناميكية حسب نوع المرفق
// ===============================

function toggleFacilityFields() {
    const typeElement = document.getElementById("facilityType");

    if (!typeElement) {
        return;
    }

    const type = typeElement.value;

    const hotelFields = document.getElementById("hotelFields");
    const villageResortFields = document.getElementById("villageResortFields");
    const apartmentsFields = document.getElementById("apartmentsFields");
    const hostelFields = document.getElementById("hostelFields");

    if (hotelFields) hotelFields.classList.add("hidden");
    if (villageResortFields) villageResortFields.classList.add("hidden");
    if (apartmentsFields) apartmentsFields.classList.add("hidden");
    if (hostelFields) hostelFields.classList.add("hidden");

    if (type === "فندق" && hotelFields) {
        hotelFields.classList.remove("hidden");
    }

    if ((type === "قرية سياحية" || type === "منتجع") && villageResortFields) {
        villageResortFields.classList.remove("hidden");
    }

    if (type === "شقق فندقية" && apartmentsFields) {
        apartmentsFields.classList.remove("hidden");
    }

    if ((type === "نزل" || type === "بيوت الشباب" || type === "موتيل") && hostelFields) {
        hostelFields.classList.remove("hidden");
    }
}

// ===============================
// الخريطة
// ===============================

function initMap() {
    if (map !== null) {
        return;
    }

    const mapElement = document.getElementById("map");

    if (!mapElement) {
        return;
    }

    if (typeof L === "undefined") {
        console.error("Leaflet لم يتم تحميله");
        return;
    }

    map = L.map("map").setView([defaultLat, defaultLng], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
    }).addTo(map);

    marker = L.marker([defaultLat, defaultLng], {
        draggable: true
    }).addTo(map);

    marker.bindPopup("موقع المرفق").openPopup();

    map.on("click", function(event) {
        const lat = event.latlng.lat;
        const lng = event.latlng.lng;

        updateLocationFields(lat, lng);
        updateMarker(lat, lng, 15);
    });

    marker.on("dragend", function() {
        const position = marker.getLatLng();

        updateLocationFields(position.lat, position.lng);
        updateMarker(position.lat, position.lng, 15);
    });
}

function updateLocationFields(lat, lng) {
    setValue("latitude", lat.toFixed(6));
    setValue("longitude", lng.toFixed(6));
}

function updateMarker(lat, lng, zoom = 15) {
    if (!map || !marker) {
        return;
    }

    const facilityName = getTextValue("facilityName") || "المرفق الجديد";

    marker.setLatLng([lat, lng]);
    marker.bindPopup(`موقع ${facilityName}`).openPopup();
    map.setView([lat, lng], zoom);
}

function updateMapFromInputs() {
    const lat = parseFloat(getTextValue("latitude"));
    const lng = parseFloat(getTextValue("longitude"));

    if (!isNaN(lat) && !isNaN(lng)) {
        updateMarker(lat, lng, 15);
    }
}

function resetMap() {
    if (map && marker) {
        updateLocationFields(defaultLat, defaultLng);
        updateMarker(defaultLat, defaultLng, 6);
    }
}

// ===============================
// الطاقة الاستيعابية حسب النوع
// ===============================


function calculateBedsFromAverage(roomInputId, averageInputId, bedsInputId) {
    const rooms = getNumberValue(roomInputId);
    const averageBeds = getNumberValue(averageInputId);
    const calculatedBeds = Math.round(rooms * averageBeds);

    if (rooms > 0 && averageBeds > 0) {
        setValue(bedsInputId, calculatedBeds);
    }
}

function calculatePermanentWorkersTotal() {
    const total = getNumberValue("nationalMaleWorkers") +
        getNumberValue("nationalFemaleWorkers") +
        getNumberValue("foreignMaleWorkers") +
        getNumberValue("foreignFemaleWorkers");

    setValue("totalWorkers", total);
}

function calculateSeasonalWorkersTotal() {
    const hasSeasonalWorkers = getTextValue("hasSeasonalWorkers") === "yes";

    if (!hasSeasonalWorkers) {
        setValue("seasonalNationalMaleWorkers", 0);
        setValue("seasonalNationalFemaleWorkers", 0);
        setValue("seasonalForeignMaleWorkers", 0);
        setValue("seasonalForeignFemaleWorkers", 0);
        setValue("seasonalTotalWorkers", 0);
        return;
    }

    const total = getNumberValue("seasonalNationalMaleWorkers") +
        getNumberValue("seasonalNationalFemaleWorkers") +
        getNumberValue("seasonalForeignMaleWorkers") +
        getNumberValue("seasonalForeignFemaleWorkers");

    setValue("seasonalTotalWorkers", total);
}

function toggleSeasonalWorkersFields() {
    const hasSeasonalWorkers = getTextValue("hasSeasonalWorkers") === "yes";
    [
        "seasonalNationalMaleWorkers",
        "seasonalNationalFemaleWorkers",
        "seasonalForeignMaleWorkers",
        "seasonalForeignFemaleWorkers",
        "seasonStartDate",
        "seasonEndDate",
        "seasonalWorkersNotes"
    ].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.disabled = !hasSeasonalWorkers;
        }
    });

    calculateSeasonalWorkersTotal();
}

function updateAllFacilityCalculatedFields() {
    calculatePermanentWorkersTotal();
    calculateSeasonalWorkersTotal();
    updateFacilityCapacityTotals();
}

function getCapacityByType(type) {
    const nationalMaleWorkers = getNumberValue("nationalMaleWorkers");
    const nationalFemaleWorkers = getNumberValue("nationalFemaleWorkers");
    const foreignMaleWorkers = getNumberValue("foreignMaleWorkers");
    const foreignFemaleWorkers = getNumberValue("foreignFemaleWorkers");
    const seasonalWorkers = {
        has_seasonal_workers: getTextValue("hasSeasonalWorkers") === "yes",
        national_male_workers: getNumberValue("seasonalNationalMaleWorkers"),
        national_female_workers: getNumberValue("seasonalNationalFemaleWorkers"),
        foreign_male_workers: getNumberValue("seasonalForeignMaleWorkers"),
        foreign_female_workers: getNumberValue("seasonalForeignFemaleWorkers"),
        total_workers: getNumberValue("seasonalTotalWorkers"),
        season_start: getTextValue("seasonStartDate"),
        season_end: getTextValue("seasonEndDate"),
        notes: getTextValue("seasonalWorkersNotes")
    };
    const capacity = {
        suites: 0,
        rooms: 0,
        beds: 0,
        chalets: 0,
        apartments: 0,
        average_beds_per_room: 0,
        local_workers: nationalMaleWorkers + nationalFemaleWorkers,
        foreign_workers: foreignMaleWorkers + foreignFemaleWorkers,
        national_male_workers: nationalMaleWorkers,
        national_female_workers: nationalFemaleWorkers,
        foreign_male_workers: foreignMaleWorkers,
        foreign_female_workers: foreignFemaleWorkers,
        total_workers: nationalMaleWorkers + nationalFemaleWorkers + foreignMaleWorkers + foreignFemaleWorkers,
        seasonal_workers: seasonalWorkers,
        extras: "",
        floors_count: getNumberValue("floorsCount")
    };

    if (type === "فندق") {
        capacity.suites = getNumberValue("suitesCount");
        capacity.rooms = getNumberValue("roomsCount");
        capacity.average_beds_per_room = getNumberValue("bedsPerRoom");
        capacity.beds = getNumberValue("bedsCount");
    }

    if (type === "قرية سياحية" || type === "منتجع") {
        capacity.chalets = getNumberValue("chaletsCount");
        capacity.rooms = getNumberValue("vrRoomsCount");
        capacity.average_beds_per_room = getNumberValue("vrAverageBedsPerRoom");
        capacity.beds = getNumberValue("vrBedsCount");
        capacity.extras = getTextValue("villageResortExtras");
    }

    if (type === "شقق فندقية") {
        capacity.apartments = getNumberValue("apartmentsCount");
        capacity.rooms = getNumberValue("apRoomsCount");
        capacity.average_beds_per_room = getNumberValue("apAverageBedsPerRoom");
        capacity.beds = getNumberValue("apBedsCount");
    }

    if (type === "نزل" || type === "بيوت الشباب" || type === "موتيل") {
        capacity.rooms = getNumberValue("hsRoomsCount");
        capacity.average_beds_per_room = getNumberValue("hsAverageBedsPerRoom");
        capacity.beds = getNumberValue("hsBedsCount");
    }

    const roomTotals = calculateRoomDetailsTotals();
    const suiteTotals = calculateSuiteDetailsTotals();

    if (roomTotals.totalRooms > 0 || roomTotals.totalBeds > 0) {
        capacity.rooms = roomTotals.totalRooms;
        capacity.beds = roomTotals.totalBeds;
        capacity.average_beds_per_room = roomTotals.totalRooms > 0 && roomTotals.totalBeds > 0
            ? Number((roomTotals.totalBeds / roomTotals.totalRooms).toFixed(2))
            : capacity.average_beds_per_room;
    }

    if (suiteTotals.totalSuites > 0) {
        capacity.suites = suiteTotals.totalSuites;
    }

    capacity.beds_per_room = capacity.average_beds_per_room;

    return capacity;
}

// ===============================
// إضافة مرفق جديد
// ===============================

function handleFacilitySubmit(event) {
    event.preventDefault();

    const facilityName = getTextValue("facilityName");
    const facilityType = getTextValue("facilityType");
    const facilityMunicipality = getTextValue("facilityMunicipality");
    const facilityCity = getTextValue("facilityCity");
    const facilityAddress = getTextValue("facilityAddress");

    if (!facilityName || !facilityMunicipality || !facilityCity || !facilityAddress) {
        alert("يرجى إدخال اسم المرفق والبلدية والمدينة والعنوان قبل الحفظ");
        return;
    }

    if (!validateFacilityExtendedFields()) {
        return;
    }

    updateAllFacilityCalculatedFields();

    const editingCode = getTextValue("editingFacilityCode") || currentEditingFacilityCode;
    const existingIndex = facilities.findIndex(item => item.facility_code === editingCode);
    const existingFacility = existingIndex >= 0 ? facilities[existingIndex] : null;
    const latitudeValue = getTextValue("latitude");
    const longitudeValue = getTextValue("longitude");
    const capacity = getCapacityByType(facilityType);
    const previousCapacitySnapshot = existingFacility ? getFacilityCapacitySnapshot(existingFacility) : null;
    const selectedDocuments = getMultipleFileNames("facilityDocuments");
    const existingDocuments = existingFacility && existingFacility.documents ? existingFacility.documents : {};

    const facilityData = {
        ...(existingFacility || {}),
        id: existingFacility ? existingFacility.id : facilities.length + 1,
        facility_code: existingFacility ? existingFacility.facility_code : generateFacilityCode(facilityType, facilityCity),

        name: facilityName,
        name_en: getTextValue("facilityNameEn"),
        national_number: getTextValue("nationalNumber"),
        record_type: normalizeFacilityRecordType(getTextValue("facilityRecordType")),
        has_group: getTextValue("hasFacilityGroup") === "yes" || getTextValue("facilityRecordType") === "branch",
        group_name: "",
        group_code: "",
        branch_name: "",
        type: facilityType,
        municipality: facilityMunicipality,
        city: facilityCity,
        address: facilityAddress,

        owner_name: getTextValue("ownerName"),
        operator_name: getTextValue("operatorName"),
        manager_name: getTextValue("managerName"),
        phone: getTextValue("facilityPhone"),
        email: getTextValue("facilityEmail"),
        website: getTextValue("facilityWebsite"),

        classification: getTextValue("classification"),
        affiliation: getTextValue("facilityAffiliation"),
        status: normalizeFacilityStatus(getTextValue("facilityStatus")),
        licenseStatus: getTextValue("licenseStatus"),
        establishment_date: getTextValue("establishmentDate"),

        latitude: latitudeValue ? parseFloat(latitudeValue) : null,
        longitude: longitudeValue ? parseFloat(longitudeValue) : null,

        floors_count: capacity.floors_count,
        suites: capacity.suites,
        rooms: capacity.rooms,
        beds: capacity.beds,
        chalets: capacity.chalets,
        apartments: capacity.apartments,
        average_beds_per_room: capacity.average_beds_per_room,
        beds_per_room: capacity.beds_per_room,
        local_workers: capacity.local_workers,
        foreign_workers: capacity.foreign_workers,
        national_male_workers: capacity.national_male_workers,
        national_female_workers: capacity.national_female_workers,
        foreign_male_workers: capacity.foreign_male_workers,
        foreign_female_workers: capacity.foreign_female_workers,
        total_workers: capacity.total_workers,
        seasonal_workers: capacity.seasonal_workers,
        room_details: getRoomDetailsFromForm(),
        suite_details: getSuiteDetailsFromForm(),
        services: getServicesFromForm(),
        accessibility: getAccessibilityFromForm(),
        restaurant_cafe_details: getRestaurantCafeDetailsFromForm(),
        meeting_hall_details: getMeetingHallDetailsFromForm(),
        safety: getSafetyFromForm(),
        sustainability: getSustainabilityFromForm(),
        form_filled_by: getTextValue("formFilledBy"),
        form_filled_by_position: getTextValue("formFilledByPosition"),
        form_filled_date: getTextValue("formFilledDate"),
        extras: capacity.extras,

        documents: {
            passport_file: getFileName("passportFile") || existingDocuments.passport_file || "",
            national_id_file: getFileName("nationalIdFile") || existingDocuments.national_id_file || "",
            facility_documents: selectedDocuments.length > 0 ? selectedDocuments : (existingDocuments.facility_documents || []),
            commercial_register_file: getFileName("commercialRegisterFile") || existingDocuments.commercial_register_file || "",
            tourism_license_file: getFileName("tourismLicenseFile") || existingDocuments.tourism_license_file || "",
            facility_photos: getMultipleFileNames("facilityPhotos").length > 0 ? getMultipleFileNames("facilityPhotos") : (existingDocuments.facility_photos || []),
            inspection_report_file: getFileName("inspectionReportFile") || existingDocuments.inspection_report_file || ""
        },

        created_at: existingFacility ? existingFacility.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    assignFacilityToGroup(facilityData, getTextValue("facilityGroupName"));

    const newCapacitySnapshot = getFacilityCapacitySnapshot(facilityData);
    const capacityChanged = existingFacility && capacitySnapshotsDiffer(previousCapacitySnapshot, newCapacitySnapshot);
    let capacityChangeMeta = null;

    if (capacityChanged) {
        const effectiveFrom = prompt("أدخل تاريخ بداية سريان تغيير الطاقة الاستيعابية بصيغة YYYY-MM-DD", new Date().toISOString().slice(0, 10));
        if (!effectiveFrom) {
            alert("لم يتم حفظ التعديل لأن تاريخ بداية السريان مطلوب عند تغيير الطاقة الاستيعابية");
            return;
        }

        const changeReason = prompt("أدخل سبب تغيير الطاقة الاستيعابية", "تحديث بيانات الطاقة الاستيعابية");
        if (!changeReason) {
            alert("لم يتم حفظ التعديل لأن سبب التغيير مطلوب");
            return;
        }

        capacityChangeMeta = { effectiveFrom, changeReason };
    }

    if (existingFacility) {
        facilities[existingIndex] = facilityData;
    } else {
        facilities.push(facilityData);
    }

    saveFacilitiesToLocalStorage();

    if (existingFacility && capacityChangeMeta) {
        updateFacilityCapacityWithHistory(facilityData.facility_code, facilityData, capacityChangeMeta.effectiveFrom, capacityChangeMeta.changeReason);
    } else if (!existingFacility) {
        createInitialCapacityHistory(facilityData);
    }

    logAuditAction(existingFacility ? "تعديل بيانات مرفق" : "إنشاء مرفق", "facility", facilityData.facility_code, facilityData.name, {
        facility_code: facilityData.facility_code,
        group_code: facilityData.group_code || "",
        branch_name: facilityData.branch_name || ""
    });

    updateDashboard();
    renderFacilitiesTable();
    refreshAllFacilityDropdowns();
    updateStatisticsSection();

    alert(existingFacility
        ? "تم تحديث بيانات المرفق وربطها بالكود الوطني بنجاح"
        : `تم حفظ المرفق وربطه بالسجل العام بنجاح
الكود الوطني: ${facilityData.facility_code}`);

    const form = document.getElementById("facilityForm");
    if (form) form.reset();

    resetFacilityFormState();
    toggleFacilityFields();
    toggleSeasonalWorkersFields();
    clearFacilityDetailForms();
    resetMap();

    showSection("facilities");
}

function getFileName(inputId) {
    const fileInput = document.getElementById(inputId);

    if (fileInput && fileInput.files.length > 0) {
        return fileInput.files[0].name;
    }

    return "";
}

function getMultipleFileNames(inputId) {
    const fileInput = document.getElementById(inputId);

    if (!fileInput || fileInput.files.length === 0) {
        return [];
    }

    return Array.from(fileInput.files).map(file => file.name);
}

// ===============================
// شاشة التراخيص
// ===============================

function populateFacilitySelect() {
    hideAutocompleteResults("licenseFacilityResults");
}

function getFacilityByCode(facilityCode) {
    return facilities.find(facility => facility.facility_code === facilityCode);
}


function updateLicenseExpiryDate() {
    const issueDate = getTextValue("licenseIssueDate");
    const expiryDate = addOneYear(issueDate);

    if (expiryDate) {
        setValue("licenseExpiryDate", expiryDate);
    }
}

function getFacilityLicensesHistory(facilityCode) {
    return licenses
        .filter(license => license.facility_code === facilityCode)
        .sort((first, second) => getLicenseSortTimestamp(first) - getLicenseSortTimestamp(second));
}

function getFacilityCurrentLicense(facilityCode) {
    return getFacilityLicensesHistory(facilityCode)
        .sort((first, second) => getLicenseSortTimestamp(second) - getLicenseSortTimestamp(first))[0] || null;
}

function getFacilityLicensesByYear(facilityCode, fromYear, toYear) {
    return getFacilityLicensesHistory(facilityCode).filter(license => {
        const year = Number(license.license_year || String(getLicenseIssueDateValue(license)).slice(0, 4) || 0);
        if (fromYear && year < Number(fromYear)) return false;
        if (toYear && year > Number(toYear)) return false;
        return true;
    });
}

function addLicenseHistoryRecord(licenseData) {
    const issueDate = licenseData.issue_date || licenseData.licenseIssueDate || "";
    const record = {
        id: licenses.length + 1,
        ...licenseData,
        license_year: Number(licenseData.license_year || String(issueDate).slice(0, 4) || new Date().getFullYear()),
        operation_type: licenseData.operation_type || (Number(licenseData.renewal_count || 0) > 0 ? "تجديد" : "إصدار جديد"),
        renewal_date: licenseData.renewal_date || licenseData.renewalDate || issueDate,
        created_by: licenseData.created_by || getCurrentUserName(),
        created_at: licenseData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    licenses.push(record);
    saveLicensesToLocalStorage();
    logAuditAction("إضافة سجل ترخيص", "license", record.facility_code, record.facility_name, {
        facility_code: record.facility_code,
        license_number: record.license_number,
        license_year: record.license_year,
        operation_type: record.operation_type
    });
    return record;
}

function calculateLicenseStatusByDate(license) {
    return getLicenseStatusForReport(license);
}

function updateFacilityCurrentLicenseStatus(facilityCode) {
    const facility = getFacilityByCode(facilityCode);
    const currentLicense = getFacilityCurrentLicense(facilityCode);
    if (!facility || !currentLicense) return;

    facility.licenseStatus = getLicenseStatusForReport(currentLicense);
    facility.license_number = currentLicense.license_number;
    facility.license_type = currentLicense.license_type;
    facility.license_issue_date = getLicenseIssueDateValue(currentLicense);
    facility.license_expiry_date = getLicenseExpiryDateValue(currentLicense);
    facility.renewal_count = Number(currentLicense.renewal_count || 0);
    facility.renewal_date = currentLicense.renewal_date || "";
    saveFacilitiesToLocalStorage();
}

function handleLicenseSubmit(event) {
    event.preventDefault();

    const facility = resolveFacilityAutocompleteSelection(
        "licenseFacility",
        "licenseFacilitySearch",
        selectFacilityForLicense
    );

    if (!facility) {
        renderFacilityAutocompleteFromInput(
            "licenseFacilitySearch",
            "licenseFacility",
            "licenseFacilityResults",
            selectFacilityForLicense
        );
        alert("يرجى اختيار المرفق من القائمة المقترحة قبل حفظ الترخيص");
        return;
    }

    const licenseNumber = getTextValue("licenseNumber");
    const licenseType = getTextValue("licenseType");
    const licenseStatus = getTextValue("licenseStatusInput");
    const operationType = getTextValue("licenseOperationType") || "إصدار جديد";
    const licenseYear = getNumberValue("licenseYear") || Number(String(getTextValue("licenseIssueDate")).slice(0, 4)) || new Date().getFullYear();
    const issueDate = getTextValue("licenseIssueDate");
    const renewalDate = getTextValue("licenseRenewalDate") || issueDate;
    const expiryDate = getTextValue("licenseExpiryDate");
    const renewalCount = getNumberValue("renewalCount");
    const licenseNotes = getTextValue("licenseNotes");

    if (!licenseNumber || !issueDate || !expiryDate) {
        alert("يرجى إدخال رقم الترخيص وتاريخ الإصدار وتاريخ الانتهاء");
        return;
    }

    const licenseData = addLicenseHistoryRecord({
        facility_code: facility.facility_code,
        facility_name: facility.name,
        license_number: licenseNumber,
        license_type: licenseType,
        operation_type: operationType,
        license_year: licenseYear,
        license_status: licenseStatus,
        issue_date: issueDate,
        renewal_date: renewalDate,
        expiry_date: expiryDate,
        renewal_count: renewalCount,
        license_document: getFileName("licenseDocument"),
        notes: licenseNotes
    });

    updateFacilityCurrentLicenseStatus(facility.facility_code);

    renderLicensesTable();
    renderFacilitiesTable();
    updateDashboard();

    alert(`تم حفظ الترخيص وربطه بالمرفق بنجاح
الكود الوطني: ${facility.facility_code}`);

    const form = document.getElementById("licenseForm");
    if (form) form.reset();
    clearFacilityAutocompleteSelection("licenseFacility", "licenseFacilitySearch", "licenseFacilityResults", "licenseFacilitySelected");
}

function renderLicensesTable() {
    const tableBody = document.getElementById("licensesTable");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (!Array.isArray(licenses) || licenses.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="11">لا توجد تراخيص مسجلة حالياً</td>`;
        tableBody.appendChild(row);
        return;
    }

    licenses.forEach(license => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${license.license_number || "-"}</td>
            <td>${license.facility_name || "-"}</td>
            <td>${license.license_type || "-"}</td>
            <td>${license.operation_type || "-"}</td>
            <td>${license.license_year || (license.issue_date ? String(license.issue_date).slice(0, 4) : "-")}</td>
            <td>${license.issue_date || "-"}</td>
            <td>${license.renewal_date || "-"}</td>
            <td>${license.expiry_date || "-"}</td>
            <td>${getLicenseStatusArabic(license.license_status)}</td>
            <td>${license.renewal_count || 0}</td>
            <td>${license.license_document || "-"}</td>
        `;

        tableBody.appendChild(row);
    });
}

function getLicenseStatusArabic(status) {
    if (status === "Active") return "ساري";
    if (status === "Expired") return "منتهي";
    if (status === "Pending") return "قيد الإجراء";
    if (status === "Suspended") return "موقوف";

    return "-";
}

// ===============================
// شاشة الإشغال الشهري والليالي السياحية
// ===============================

function populateOccupancyFacilitySelect() {
    hideAutocompleteResults("occupancyFacilityResults");
}

function fillFacilityCapacityForOccupancy() {
    const facilityCode = getTextValue("occupancyFacility");
    const facility = facilities.find(item => item.facility_code === facilityCode);

    if (!facility) {
        setValue("occupancyRooms", 0);
        setValue("occupancyBeds", 0);
        calculateOccupancyIndicators();
        return;
    }

    const year = getNumberValue("occupancyYear") || new Date().getFullYear();
    const month = getNumberValue("occupancyMonth") || 1;
    const capacityDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const capacity = getFacilityCapacityAtDate(facility.facility_code, capacityDate);

    setValue("occupancyRooms", Number(capacity.rooms || 0));
    setValue("occupancyBeds", Number(capacity.beds || 0));

    calculateOccupancyIndicators();
}

function updateMonthDays() {
    const year = getNumberValue("occupancyYear") || new Date().getFullYear();
    const month = getNumberValue("occupancyMonth") || 1;

    const days = new Date(year, month, 0).getDate();

    setValue("monthDays", days);

    if (getTextValue("occupancyFacility")) {
        fillFacilityCapacityForOccupancy();
    } else {
        calculateOccupancyIndicators();
    }
}

function calculateOccupancyIndicators() {
    const monthDays = getNumberValue("monthDays");
    const rooms = getNumberValue("occupancyRooms");
    const beds = getNumberValue("occupancyBeds");

    const libyanGuests = getNumberValue("libyanGuests");
    const arabGuests = getNumberValue("arabGuests");
    const foreignGuests = getNumberValue("foreignGuests");

    const libyanGuestNights = getNumberValue("libyanGuestNights");
    const arabGuestNights = getNumberValue("arabGuestNights");
    const foreignGuestNights = getNumberValue("foreignGuestNights");

    const soldRoomNights = getNumberValue("soldRoomNights");

    const totalGuests = libyanGuests + arabGuests + foreignGuests;
    const totalGuestNights = libyanGuestNights + arabGuestNights + foreignGuestNights;
    const availableRoomNights = rooms * monthDays;
    const availableBedNights = beds * monthDays;
    const roomOccupancyRate = availableRoomNights > 0 ? (soldRoomNights / availableRoomNights) * 100 : 0;
    const bedOccupancyRate = availableBedNights > 0 ? (totalGuestNights / availableBedNights) * 100 : 0;
    const averageLengthOfStay = totalGuests > 0 ? totalGuestNights / totalGuests : 0;

    setValue("totalGuests", totalGuests);
    setValue("totalGuestNights", totalGuestNights);
    setValue("availableRoomNights", availableRoomNights);
    setValue("availableBedNights", availableBedNights);
    setValue("roomOccupancyRate", formatPercent(roomOccupancyRate));
    setValue("bedOccupancyRate", formatPercent(bedOccupancyRate));
    setValue("averageLengthOfStay", formatStay(averageLengthOfStay));
}

function handleOccupancySubmit(event) {
    event.preventDefault();

    calculateOccupancyIndicators();

    const facility = resolveFacilityAutocompleteSelection(
        "occupancyFacility",
        "occupancyFacilitySearch",
        selectFacilityForOccupancy
    );

    if (!facility) {
        renderFacilityAutocompleteFromInput(
            "occupancyFacilitySearch",
            "occupancyFacility",
            "occupancyFacilityResults",
            selectFacilityForOccupancy
        );
        alert("يرجى اختيار المرفق من القائمة المقترحة قبل حفظ تقرير الإشغال");
        return;
    }

    const facilityCode = facility.facility_code;

    const year = getNumberValue("occupancyYear");
    const month = getNumberValue("occupancyMonth");

    const existingReport = occupancyReports.find(report => {
        return report.facility_code === facilityCode &&
               report.year === year &&
               report.month === month;
    });

    if (existingReport) {
        alert("يوجد تقرير محفوظ مسبقاً لهذا المرفق في نفس الشهر والسنة");
        return;
    }

    const report = {
        id: occupancyReports.length + 1,

        facility_code: facility.facility_code,
        facility_name: facility.name,

        year: year,
        month: month,
        month_days: getNumberValue("monthDays"),

        rooms: getNumberValue("occupancyRooms"),
        beds: getNumberValue("occupancyBeds"),

        libyan_guests: getNumberValue("libyanGuests"),
        arab_guests: getNumberValue("arabGuests"),
        foreign_guests: getNumberValue("foreignGuests"),
        total_guests: getNumberValue("totalGuests"),

        libyan_guest_nights: getNumberValue("libyanGuestNights"),
        arab_guest_nights: getNumberValue("arabGuestNights"),
        foreign_guest_nights: getNumberValue("foreignGuestNights"),
        total_guest_nights: getNumberValue("totalGuestNights"),

        sold_room_nights: getNumberValue("soldRoomNights"),
        available_room_nights: getNumberValue("availableRoomNights"),
        available_bed_nights: getNumberValue("availableBedNights"),

        room_occupancy_rate: getTextValue("roomOccupancyRate"),
        bed_occupancy_rate: getTextValue("bedOccupancyRate"),
        average_length_of_stay: getTextValue("averageLengthOfStay"),

        notes: getTextValue("occupancyNotes"),

        created_at: new Date().toISOString()
    };

    occupancyReports.push(report);
    saveOccupancyToLocalStorage();

    renderOccupancyTable();
    updateStatisticsSection();

    alert("تم حفظ تقرير الإشغال الشهري بنجاح");

    const form = document.getElementById("occupancyForm");
    if (form) form.reset();

    clearFacilityAutocompleteSelection("occupancyFacility", "occupancyFacilitySearch", "occupancyFacilityResults", "occupancyFacilitySelected");
    updateMonthDays();
}

function renderOccupancyTable() {
    const tableBody = document.getElementById("occupancyTable");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (!Array.isArray(occupancyReports) || occupancyReports.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="9">لا توجد تقارير إشغال محفوظة حالياً</td>`;
        tableBody.appendChild(row);
        return;
    }

    occupancyReports.forEach(report => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${getReportFacilityName(report)}</td>
            <td>${report.year}</td>
            <td>${getMonthName(report.month)}</td>
            <td>${report.total_guests}</td>
            <td>${report.total_guest_nights}</td>
            <td>${report.sold_room_nights}</td>
            <td>${report.room_occupancy_rate}</td>
            <td>${report.bed_occupancy_rate}</td>
            <td>${report.average_length_of_stay}</td>
        `;

        tableBody.appendChild(row);
    });
}

function getMonthName(month) {
    const months = {
        1: "يناير",
        2: "فبراير",
        3: "مارس",
        4: "أبريل",
        5: "مايو",
        6: "يونيو",
        7: "يوليو",
        8: "أغسطس",
        9: "سبتمبر",
        10: "أكتوبر",
        11: "نوفمبر",
        12: "ديسمبر"
    };

    return months[month] || "-";
}

function getOfficialReportHeaderHtml(reportName) {
    return `
        <div class="official-report-header">
            <h2>وزارة السياحة والصناعات التقليدية</h2>
            <p>إدارة المهن والرقابة السياحية</p>
            <p>قسم الإيواء السياحي</p>
            <strong>اسم التقرير: ${escapeHtml(reportName)}</strong>
        </div>
    `;
}

function getOfficialReportFooterHtml() {
    return `
        <div class="official-report-footer">
            تصميم وبرمجة مركز المعلومات والتوثيق السياحي 2026
        </div>
    `;
}

function ensureDefaultReportOutput() {
    const reportOutput = document.getElementById("reportOutput");

    if (!reportOutput) {
        return;
    }

    if (!defaultReportOutputTemplate) {
        defaultReportOutputTemplate = reportOutput.innerHTML;
    }

    if (!document.getElementById("reportTable")) {
        reportOutput.innerHTML = defaultReportOutputTemplate;
    }
}

function calculateLicenseDaysRemaining(expiryDate) {
    const expiry = parseDateOnly(expiryDate);

    if (!expiry) {
        return null;
    }

    const dayMs = 24 * 60 * 60 * 1000;
    return Math.ceil((expiry.getTime() - getTodayDateOnly().getTime()) / dayMs);
}

function getLicenseStatusForReport(license) {
    return normalizeLicenseStatusValue(
        license.license_status ||
        license.licenseStatus ||
        license.status ||
        ""
    );
}

function getLicenseControlStatus(license) {
    const status = getLicenseStatusForReport(license);
    const daysRemaining = calculateLicenseDaysRemaining(getLicenseExpiryDateValue(license));

    if (status === "Expired" || (daysRemaining !== null && daysRemaining < 0)) {
        return "منتهي";
    }

    if (status === "Suspended") {
        return "موقوف";
    }

    if (daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30) {
        return "ينتهي خلال 30 يوماً";
    }

    if (daysRemaining !== null && daysRemaining >= 31 && daysRemaining <= 60) {
        return "ينتهي خلال 60 يوماً";
    }

    if (daysRemaining !== null && daysRemaining >= 61 && daysRemaining <= 90) {
        return "ينتهي خلال 90 يوماً";
    }

    if (status === "Pending") {
        return "قيد الإجراء";
    }

    if (daysRemaining === null) {
        return "غير محدد";
    }

    return "ساري";
}

function getLicenseExpiryRange(license) {
    const daysRemaining = calculateLicenseDaysRemaining(getLicenseExpiryDateValue(license));
    const status = getLicenseStatusForReport(license);

    if (status === "Expired" || (daysRemaining !== null && daysRemaining < 0)) {
        return "expired";
    }

    if (daysRemaining === null) {
        return "unspecified";
    }

    if (daysRemaining <= 30) {
        return "within_30";
    }

    if (daysRemaining <= 60) {
        return "within_60";
    }

    if (daysRemaining <= 90) {
        return "within_90";
    }

    return "future";
}

function getLicenseExpiryRangeLabel(range) {
    const labels = {
        expired: "منتهي",
        within_30: "ينتهي خلال 30 يوماً",
        within_60: "ينتهي خلال 60 يوماً",
        within_90: "ينتهي خلال 90 يوماً",
        one_to_three_months: "ينتهي من شهر إلى ثلاثة أشهر",
        unspecified: "غير محدد",
        future: "أكثر من 90 يوماً"
    };

    return labels[range] || "-";
}

function getLicenseReportRows() {
    return licenses.map(license => {
        const facility = getFacilityByCode(license.facility_code);
        const expiryDate = getLicenseExpiryDateValue(license);
        const issueDate = getLicenseIssueDateValue(license);
        const daysRemaining = calculateLicenseDaysRemaining(expiryDate);
        const status = getLicenseStatusForReport(license);
        const range = getLicenseExpiryRange(license);

        return {
            facility_code: license.facility_code || "-",
            facility_name: facility ? facility.name : (license.facility_name || "-"),
            facility_type: facility ? facility.type : "-",
            municipality: facility ? facility.municipality : "-",
            city: facility ? facility.city : "-",
            license_number: license.license_number || "-",
            license_type: license.license_type || "-",
            issue_date: formatDateOnly(issueDate),
            expiry_date: formatDateOnly(expiryDate),
            days_remaining: daysRemaining === null ? "غير محدد" : daysRemaining,
            license_status: getLicenseStatusArabic(status),
            license_status_value: status,
            control_status: getLicenseControlStatus(license),
            expiry_range: range,
            renewal_count: Number(license.renewal_count || 0),
            notes: license.notes || "-",
            search_text: normalizeArabicText([
                license.facility_code,
                license.facility_name,
                license.license_number,
                facility ? getFacilityDisplayName(facility) : ""
            ].join(" ")),
            issue_year: issueDate ? Number(String(issueDate).slice(0, 4)) : null,
            expiry_year: expiryDate ? Number(String(expiryDate).slice(0, 4)) : null
        };
    });
}

function getFilteredLicenseStatusRows() {
    const statusFilter = getTextValue("licenseReportStatusFilter");
    const expiryRangeFilter = getTextValue("licenseReportExpiryRange");
    const municipalityFilter = normalizeArabicText(getTextValue("licenseReportMunicipality"));
    const cityFilter = normalizeArabicText(getTextValue("licenseReportCity"));
    const typeFilter = getTextValue("licenseReportFacilityType");
    const searchText = normalizeArabicText(getTextValue("reportFacilitySearch"));
    const year = getNumberValue("reportYear");

    return getLicenseReportRows().filter(row => {
        if (statusFilter && row.license_status_value !== statusFilter) {
            return false;
        }

        if (expiryRangeFilter === "one_to_three_months") {
            const days = Number(row.days_remaining);
            if (!Number.isFinite(days) || days <= 30 || days > 90) {
                return false;
            }
        } else if (expiryRangeFilter && row.expiry_range !== expiryRangeFilter) {
            return false;
        }

        if (municipalityFilter && !normalizeArabicText(row.municipality).includes(municipalityFilter)) {
            return false;
        }

        if (cityFilter && !normalizeArabicText(row.city).includes(cityFilter)) {
            return false;
        }

        if (typeFilter && row.facility_type !== typeFilter) {
            return false;
        }

        if (searchText && !row.search_text.includes(searchText)) {
            return false;
        }

        if (year && row.issue_year !== year && row.expiry_year !== year) {
            return false;
        }

        return true;
    });
}

function calculateLicensesStatusSummary(rows) {
    const total = rows.length;
    const active = rows.filter(row => {
        const days = Number(row.days_remaining);
        return Number.isFinite(days) &&
            days > 0 &&
            row.license_status_value !== "Expired" &&
            row.license_status_value !== "Suspended";
    }).length;
    const expired = rows.filter(row => row.control_status === "منتهي").length;
    const within30 = rows.filter(row => row.expiry_range === "within_30").length;
    const within60 = rows.filter(row => row.expiry_range === "within_60").length;
    const within90 = rows.filter(row => row.expiry_range === "within_90").length;
    const oneToThreeMonths = rows.filter(row => {
        const days = Number(row.days_remaining);
        return Number.isFinite(days) && days > 30 && days <= 90;
    }).length;

    return {
        total,
        active,
        expired,
        within30,
        within60,
        within90,
        oneToThreeMonths,
        activePercent: total > 0 ? (active / total) * 100 : 0,
        expiredPercent: total > 0 ? (expired / total) * 100 : 0
    };
}

function renderLicensesStatusSummary(summary) {
    return `
        <div class="cards report-cards licenses-status-cards">
            <div class="card"><h3>إجمالي التراخيص</h3><p>${summary.total}</p></div>
            <div class="card"><h3>التراخيص السارية</h3><p>${summary.active}</p></div>
            <div class="card"><h3>التراخيص المنتهية</h3><p>${summary.expired}</p></div>
            <div class="card"><h3>تنتهي خلال 30 يوماً</h3><p>${summary.within30}</p></div>
            <div class="card"><h3>تنتهي خلال 60 يوماً</h3><p>${summary.within60}</p></div>
            <div class="card"><h3>تنتهي خلال 90 يوماً</h3><p>${summary.within90}</p></div>
            <div class="card"><h3>من شهر إلى ثلاثة أشهر</h3><p>${summary.oneToThreeMonths}</p></div>
            <div class="card"><h3>نسبة السارية</h3><p>${summary.activePercent.toFixed(2)}%</p></div>
            <div class="card"><h3>نسبة المنتهية</h3><p>${summary.expiredPercent.toFixed(2)}%</p></div>
        </div>
    `;
}

function renderLicensesStatusTable(rows) {
    if (!rows.length) {
        return `<tr><td colspan="14">لا توجد بيانات تراخيص مطابقة للفلاتر المحددة</td></tr>`;
    }

    return rows.map(row => `
        <tr>
            <td>${escapeHtml(row.facility_code)}</td>
            <td>${escapeHtml(row.facility_name)}</td>
            <td>${escapeHtml(row.facility_type)}</td>
            <td>${escapeHtml(row.municipality)}</td>
            <td>${escapeHtml(row.city)}</td>
            <td>${escapeHtml(row.license_number)}</td>
            <td>${escapeHtml(row.license_type)}</td>
            <td>${escapeHtml(row.issue_date)}</td>
            <td>${escapeHtml(row.expiry_date)}</td>
            <td>${escapeHtml(row.days_remaining)}</td>
            <td>${escapeHtml(row.license_status)}</td>
            <td>${escapeHtml(row.control_status)}</td>
            <td>${escapeHtml(row.renewal_count)}</td>
            <td>${escapeHtml(row.notes)}</td>
        </tr>
    `).join("");
}

function generateLicensesStatusReport() {
    const reportOutput = document.getElementById("reportOutput");

    if (!reportOutput) {
        return;
    }

    currentLicensesStatusReportRows = getFilteredLicenseStatusRows();
    const summary = calculateLicensesStatusSummary(currentLicensesStatusReportRows);
    const reportDate = new Date().toLocaleDateString("ar-LY");

    reportOutput.innerHTML = `
        ${getOfficialReportHeaderHtml("تقرير حالة التراخيص السياحية")}
        <div class="official-report-meta">تاريخ إعداد التقرير: ${escapeHtml(reportDate)}</div>
        ${renderLicensesStatusSummary(summary)}
        <div class="table-wrapper licenses-status-table-wrapper">
            <table class="licenses-status-table">
                <thead>
                    <tr>
                        <th>الكود الوطني للمرفق</th>
                        <th>اسم المرفق</th>
                        <th>نوع المرفق</th>
                        <th>البلدية</th>
                        <th>المدينة</th>
                        <th>رقم الترخيص</th>
                        <th>نوع الترخيص</th>
                        <th>تاريخ الإصدار</th>
                        <th>تاريخ الانتهاء</th>
                        <th>عدد الأيام المتبقية</th>
                        <th>حالة الترخيص</th>
                        <th>التصنيف الرقابي للترخيص</th>
                        <th>عدد مرات التجديد</th>
                        <th>ملاحظات</th>
                    </tr>
                </thead>
                <tbody>${renderLicensesStatusTable(currentLicensesStatusReportRows)}</tbody>
            </table>
        </div>
        ${getOfficialReportFooterHtml()}
    `;
}

function exportLicensesStatusReportCSV() {
    if (!currentLicensesStatusReportRows || currentLicensesStatusReportRows.length === 0) {
        currentLicensesStatusReportRows = getFilteredLicenseStatusRows();
    }

    if (!currentLicensesStatusReportRows.length) {
        alert("لا توجد بيانات تراخيص لتصديرها");
        return;
    }

    const headers = [
        "الكود الوطني للمرفق",
        "اسم المرفق",
        "نوع المرفق",
        "البلدية",
        "المدينة",
        "رقم الترخيص",
        "نوع الترخيص",
        "تاريخ الإصدار",
        "تاريخ الانتهاء",
        "عدد الأيام المتبقية",
        "حالة الترخيص",
        "التصنيف الرقابي للترخيص",
        "عدد مرات التجديد",
        "ملاحظات"
    ];

    let csvContent = "\uFEFF";
    csvContent += [
        "وزارة السياحة والصناعات التقليدية",
        "إدارة المهن والرقابة السياحية",
        "قسم الإيواء السياحي",
        "اسم التقرير: تقرير حالة التراخيص السياحية"
    ].map(escapeCsvValue).join("\n") + "\n\n";
    csvContent += headers.map(escapeCsvValue).join(",") + "\n";

    currentLicensesStatusReportRows.forEach(row => {
        csvContent += [
            row.facility_code,
            row.facility_name,
            row.facility_type,
            row.municipality,
            row.city,
            row.license_number,
            row.license_type,
            row.issue_date,
            row.expiry_date,
            row.days_remaining,
            row.license_status,
            row.control_status,
            row.renewal_count,
            row.notes
        ].map(escapeCsvValue).join(",") + "\n";
    });

    csvContent += "\n" + escapeCsvValue("تصميم وبرمجة مركز المعلومات والتوثيق السياحي 2026") + "\n";

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "_");
    const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `licenses_status_report_${today}.csv`;
    link.click();

    URL.revokeObjectURL(url);
}

function printLicensesStatusReport() {
    if (!currentLicensesStatusReportRows || currentLicensesStatusReportRows.length === 0) {
        generateLicensesStatusReport();
    }

    const reportOutput = document.getElementById("reportOutput");

    if (!reportOutput) {
        return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
        alert("تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.");
        return;
    }

    printWindow.document.write(`
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>تقرير حالة التراخيص السياحية</title>
            <style>
                body { font-family: Arial, sans-serif; direction: rtl; padding: 22px; color: #222; }
                .official-report-header { text-align: center; border-bottom: 2px solid #0277bd; padding-bottom: 12px; margin-bottom: 16px; }
                .official-report-header h2 { margin: 0 0 8px; color: #0277bd; }
                .official-report-header p { margin: 4px 0; font-weight: bold; }
                .official-report-meta { margin: 12px 0; font-weight: bold; }
                .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 14px 0; }
                .card { border: 1px solid #cfd8dc; padding: 8px; text-align: center; border-radius: 6px; }
                .card h3 { margin: 0 0 6px; font-size: 12px; color: #37474f; }
                .card p { margin: 0; font-size: 18px; font-weight: bold; color: #0277bd; }
                table { width: 100%; border-collapse: collapse; margin-top: 14px; }
                th, td { border: 1px solid #777; padding: 5px; text-align: center; font-size: 10px; }
                th { background: #0277bd; color: white; }
                .official-report-footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #90a4ae; text-align: center; font-weight: bold; }
                @page { size: A4 landscape; margin: 10mm; }
            </style>
        </head>
        <body>${reportOutput.innerHTML}</body>
        </html>
    `);

    printWindow.document.close();
    printWindow.print();
}

// ===============================
// مخرجات التقارير المتقدمة
// ===============================

const advancedReportColumnDefinitions = [
    { key: "facility_code", label: "الكود الوطني", basic: true },
    { key: "facility_name", label: "اسم المرفق", basic: true },
    { key: "name_en", label: "الاسم الإنجليزي", basic: false },
    { key: "national_number", label: "الرقم الوطني 12 خانة", basic: false },
    { key: "record_type", label: "نوع السجل", basic: false },
    { key: "group_name", label: "المجموعة / الاسم التجاري", basic: false },
    { key: "group_code", label: "كود المجموعة", basic: false },
    { key: "branch_name", label: "اسم الفرع", basic: false },
    { key: "branch_count", label: "عدد فروع المجموعة", basic: false },
    { key: "facility_type", label: "نوع المرفق", basic: true },
    { key: "municipality", label: "البلدية", basic: true },
    { key: "city", label: "المدينة", basic: true },
    { key: "address", label: "العنوان", basic: false },
    { key: "classification_status", label: "التصنيف", basic: true },
    { key: "classification", label: "درجة التصنيف", basic: false },
    { key: "facility_status", label: "حالة المرفق", basic: true },
    { key: "license_status", label: "حالة الترخيص", basic: true },
    { key: "license_number", label: "رقم الترخيص", basic: false },
    { key: "license_type", label: "نوع الإذن/الترخيص", basic: false },
    { key: "issue_date", label: "تاريخ الإصدار", basic: false },
    { key: "expiry_date", label: "تاريخ الانتهاء", basic: false },
    { key: "days_remaining", label: "عدد الأيام المتبقية", basic: false },
    { key: "license_year", label: "سنة الترخيص", basic: false },
    { key: "operation_type", label: "نوع العملية", basic: false },
    { key: "renewal_date", label: "تاريخ التجديد", basic: false },
    { key: "created_by", label: "أضيف بواسطة", basic: false },
    { key: "created_at", label: "تاريخ الإدخال", basic: false },
    { key: "capacity_effective_from", label: "بداية سريان الطاقة", basic: false },
    { key: "capacity_effective_to", label: "نهاية سريان الطاقة", basic: false },
    { key: "change_reason", label: "سبب تغيير الطاقة", basic: false },
    { key: "event_date", label: "تاريخ الحدث", basic: false },
    { key: "event_type", label: "نوع الحدث", basic: false },
    { key: "event_title", label: "عنوان الحدث", basic: false },
    { key: "event_details", label: "تفاصيل الحدث", basic: false },
    { key: "license_count", label: "عدد التراخيص", basic: false },
    { key: "active_license_count", label: "التراخيص السارية", basic: false },
    { key: "expired_license_count", label: "التراخيص المنتهية", basic: false },
    { key: "pending_license_count", label: "قيد الإجراء", basic: false },
    { key: "floors_count", label: "عدد الطوابق", basic: false },
    { key: "single_rooms", label: "عدد الغرف المفردة", basic: false },
    { key: "double_rooms", label: "عدد الغرف الزوجية", basic: false },
    { key: "triple_rooms", label: "عدد الغرف الثلاثية", basic: false },
    { key: "quad_rooms", label: "عدد الغرف الرباعية", basic: false },
    { key: "twin_rooms", label: "عدد الغرف المزدوجة", basic: false },
    { key: "accessible_rooms", label: "غرف ذوي الاحتياجات الخاصة", basic: false },
    { key: "rooms", label: "عدد الغرف", basic: true },
    { key: "beds", label: "عدد الأسرة", basic: true },
    { key: "suites", label: "إجمالي الأجنحة", basic: false },
    { key: "presidential_suites", label: "أجنحة رئاسية", basic: false },
    { key: "premium_suites", label: "أجنحة ممتازة", basic: false },
    { key: "standard_suites", label: "أجنحة عادية", basic: false },
    { key: "chalets", label: "عدد الشاليهات أو الوحدات", basic: false },
    { key: "total_workers", label: "إجمالي العاملين", basic: true },
    { key: "national_workers", label: "العمالة الوطنية", basic: false },
    { key: "foreign_workers", label: "العمالة الأجنبية", basic: false },
    { key: "seasonal_workers", label: "العمالة الموسمية", basic: false },
    { key: "latest_occupancy", label: "آخر بيانات إشغال مسجلة", basic: false },
    { key: "room_occupancy", label: "متوسط إشغال الغرف", basic: false },
    { key: "bed_occupancy", label: "متوسط إشغال الأسرة", basic: false },
    { key: "average_stay", label: "متوسط مدة الإقامة", basic: false },
    { key: "restaurants_count", label: "عدد المطاعم والمقاهي", basic: false },
    { key: "restaurant_seats", label: "إجمالي مقاعد المطاعم والمقاهي", basic: false },
    { key: "meeting_halls_count", label: "عدد قاعات الاجتماعات", basic: false },
    { key: "meeting_hall_seats", label: "إجمالي مقاعد قاعات الاجتماعات", basic: false },
    { key: "parking_available", label: "موقف سيارات", basic: false },
    { key: "parking_capacity", label: "سعة موقف السيارات", basic: false },
    { key: "wifi_status", label: "Wi-Fi", basic: false },
    { key: "pool", label: "مسبح", basic: false },
    { key: "gym", label: "صالة رياضية", basic: false },
    { key: "spa", label: "سبا", basic: false },
    { key: "playgrounds", label: "ملاعب", basic: false },
    { key: "accessibility_facilities", label: "مرافق لذوي الاحتياجات الخاصة", basic: false },
    { key: "fire_system_status", label: "منظومة إطفاء الحريق", basic: false },
    { key: "cctv_status", label: "كاميرات مراقبة", basic: false },
    { key: "emergency_exits_status", label: "مخارج طوارئ", basic: false },
    { key: "first_aid_available", label: "إسعافات أولية", basic: false },
    { key: "solar_energy", label: "طاقة شمسية", basic: false },
    { key: "water_recycling", label: "تدوير مياه", basic: false },
    { key: "energy_saving_systems", label: "أنظمة توفير طاقة", basic: false },
    { key: "inspection_report_file", label: "تقرير المعاينة الفنية", basic: false },
    { key: "form_filled_by", label: "اسم معبئ النموذج", basic: false },
    { key: "form_filled_by_position", label: "الصفة الوظيفية", basic: false },
    { key: "form_filled_date", label: "تاريخ تعبئة النموذج", basic: false },
    { key: "notes", label: "ملاحظات", basic: false }
];

const advancedReportOutputPresets = {
    comprehensive: {
        label: "تقرير شامل",
        columns: [
            "facility_code",
            "facility_name",
            "name_en",
            "national_number",
            "record_type",
            "group_name",
            "group_code",
            "branch_name",
            "facility_type",
            "municipality",
            "city",
            "address",
            "classification_status",
            "classification",
            "facility_status",
            "license_status",
            "license_number",
            "license_type",
            "issue_date",
            "expiry_date",
            "days_remaining",
            "license_year",
            "operation_type",
            "renewal_date",
            "floors_count",
            "rooms",
            "beds",
            "suites",
            "chalets",
            "single_rooms",
            "double_rooms",
            "triple_rooms",
            "quad_rooms",
            "twin_rooms",
            "accessible_rooms",
            "presidential_suites",
            "premium_suites",
            "standard_suites",
            "total_workers",
            "national_workers",
            "foreign_workers",
            "seasonal_workers",
            "restaurants_count",
            "restaurant_seats",
            "meeting_halls_count",
            "meeting_hall_seats",
            "parking_available",
            "parking_capacity",
            "wifi_status",
            "pool",
            "gym",
            "spa",
            "playgrounds",
            "accessibility_facilities",
            "fire_system_status",
            "cctv_status",
            "emergency_exits_status",
            "first_aid_available",
            "solar_energy",
            "water_recycling",
            "energy_saving_systems",
            "inspection_report_file",
            "form_filled_by",
            "form_filled_by_position",
            "form_filled_date",
            "latest_occupancy",
            "room_occupancy",
            "bed_occupancy",
            "average_stay",
            "notes"
        ]
    },
    core: {
        label: "بيانات المرافق الأساسية",
        columns: [
            "facility_code",
            "facility_name",
            "name_en",
            "national_number",
            "record_type",
            "group_name",
            "group_code",
            "branch_name",
            "facility_type",
            "municipality",
            "city",
            "address",
            "classification_status",
            "classification",
            "facility_status",
            "license_status"
        ]
    },
    capacity: {
        label: "الطاقة الاستيعابية",
        columns: [
            "facility_code",
            "facility_name",
            "facility_type",
            "municipality",
            "city",
            "capacity_effective_from",
            "capacity_effective_to",
            "floors_count",
            "rooms",
            "beds",
            "suites",
            "chalets",
            "single_rooms",
            "double_rooms",
            "triple_rooms",
            "quad_rooms",
            "twin_rooms",
            "accessible_rooms",
            "presidential_suites",
            "premium_suites",
            "standard_suites",
            "change_reason"
        ]
    },
    licenses: {
        label: "التراخيص والأذونات",
        columns: [
            "facility_code",
            "facility_name",
            "facility_type",
            "municipality",
            "city",
            "license_status",
            "license_number",
            "license_type",
            "issue_date",
            "expiry_date",
            "days_remaining",
            "license_year",
            "operation_type",
            "renewal_date",
            "created_by",
            "created_at",
            "notes"
        ]
    },
    workforce: {
        label: "العمالة",
        columns: [
            "facility_code",
            "facility_name",
            "facility_type",
            "municipality",
            "city",
            "total_workers",
            "national_workers",
            "foreign_workers",
            "seasonal_workers"
        ]
    },
    occupancy: {
        label: "الإشغال",
        columns: [
            "facility_code",
            "facility_name",
            "facility_type",
            "municipality",
            "city",
            "latest_occupancy",
            "room_occupancy",
            "bed_occupancy",
            "average_stay"
        ]
    },
    timeline: {
        label: "تسلسل زمني",
        columns: [
            "event_date",
            "event_type",
            "event_title",
            "event_details",
            "facility_code",
            "facility_name",
            "group_name",
            "branch_name"
        ]
    },
    licenseYears: {
        label: "التراخيص حسب السنوات",
        columns: [
            "license_year",
            "license_count",
            "active_license_count",
            "expired_license_count",
            "pending_license_count",
            "facility_type",
            "municipality",
            "city"
        ]
    },
    branches: {
        label: "الفروع والمجموعات",
        columns: [
            "group_name",
            "group_code",
            "branch_name",
            "facility_code",
            "facility_name",
            "facility_type",
            "municipality",
            "city",
            "rooms",
            "beds",
            "license_status"
        ]
    },
    missing: {
        label: "النواقص الرقابية",
        columns: [
            "facility_code",
            "facility_name",
            "facility_type",
            "municipality",
            "city",
            "classification_status",
            "facility_status",
            "license_status",
            "license_number",
            "issue_date",
            "expiry_date",
            "rooms",
            "beds",
            "total_workers",
            "notes"
        ]
    }
};

function isAdvancedReportType(reportType) {
    return String(reportType || "").startsWith("advanced_");
}

function getAdvancedReportColumnDefinition(key) {
    return advancedReportColumnDefinitions.find(column => column.key === key);
}

function getReportTypeLabel(reportType) {
    const labels = {
        monthly: "تقرير الإشغال الشهري",
        annual: "التقرير السنوي للإشغال",
        licenses_status: "تقرير حالة التراخيص السياحية",
        advanced_facility: "التقرير باسم المرفق",
        advanced_facilities: "تقرير عام متعدد الخيارات",
        advanced_facility_type: "تقرير حسب نوع المرفق",
        advanced_city: "تقرير حسب المدينة",
        advanced_municipality: "تقرير حسب البلدية",
        advanced_license_renewal: "إصدارات الأذونات من فترة إلى فترة",
        advanced_license_expiry: "تقرير أذونات المزاولة القريبة من الانتهاء",
        advanced_expired_licenses: "تقرير أذونات المزاولة المنتهية خلال فترة",
        advanced_facility_licenses: "تقرير تراخيص مرفق محدد",
        advanced_facility_full_history: "التقرير التاريخي الكامل للمرفق",
        advanced_licenses_by_years: "تقرير عدد التراخيص حسب السنوات",
        advanced_branches: "تقرير الفروع حسب الاسم التجاري",
        advanced_facility_timeline: "تقرير مرفق عبر الزمن",
        advanced_capacity_development: "تقرير تطور الطاقة الاستيعابية",
        advanced_branches_comparison: "تقرير مقارنة الفروع"
    };

    return labels[reportType] || "تقرير";
}

function getReportPreparedBy() {
    return localStorage.getItem("tas_logged_in") === "true" ? demoUser.name : "-";
}

function toSafeNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) && number > 0 ? number : 0;
}

function isDateWithinRange(dateValue, fromDate, toDate) {
    const date = parseDateOnly(dateValue);
    const from = parseDateOnly(fromDate);
    const to = parseDateOnly(toDate);

    if (!date) {
        return false;
    }

    if (from && date.getTime() < from.getTime()) {
        return false;
    }

    if (to && date.getTime() > to.getTime()) {
        return false;
    }

    return true;
}

function getLicensePeriodDate(license) {
    return license.renewal_date ||
        license.renewalDate ||
        getLicenseIssueDateValue(license) ||
        getLicenseExpiryDateValue(license) ||
        "";
}

function getLicenseSortTimestamp(license) {
    const candidates = [
        license.updated_at,
        license.created_at,
        getLicenseExpiryDateValue(license),
        getLicenseIssueDateValue(license)
    ];

    for (const candidate of candidates) {
        const parsed = parseDateOnly(candidate);

        if (parsed) {
            return parsed.getTime();
        }
    }

    return 0;
}

function getFacilityLatestLicense(facilityCode) {
    const rows = licenses
        .filter(license => license.facility_code === facilityCode)
        .sort((first, second) => getLicenseSortTimestamp(second) - getLicenseSortTimestamp(first));

    return rows[0] || null;
}

function getFacilityNationalWorkers(facility) {
    const genderTotal = toSafeNumber(facility.national_male_workers || facility.local_male_workers) +
        toSafeNumber(facility.national_female_workers || facility.local_female_workers);

    return genderTotal || toSafeNumber(facility.local_workers);
}

function getFacilityForeignWorkers(facility) {
    const genderTotal = toSafeNumber(facility.foreign_male_workers) +
        toSafeNumber(facility.foreign_female_workers);

    return genderTotal || toSafeNumber(facility.foreign_workers);
}

function getFacilitySeasonalWorkersTotal(facility) {
    const seasonal = facility.seasonal_workers || {};
    return toSafeNumber(seasonal.total_workers) ||
        toSafeNumber(seasonal.national_male_workers) +
        toSafeNumber(seasonal.national_female_workers) +
        toSafeNumber(seasonal.foreign_male_workers) +
        toSafeNumber(seasonal.foreign_female_workers);
}

function getFacilityUnitsTotal(facility) {
    return toSafeNumber(facility.chalets) ||
        toSafeNumber(facility.total_units) ||
        toSafeNumber(facility.apartments);
}

function getOccupancyReportPeriodDate(report) {
    const year = Number(report.year || 0);
    const month = Number(report.month || 1);

    if (!year || !month) {
        return null;
    }

    return new Date(Date.UTC(year, month - 1, 1));
}

function isOccupancyReportInAdvancedPeriod(report, filters) {
    if (filters.year && Number(report.year) !== filters.year) {
        return false;
    }

    if (filters.month && Number(report.month) !== filters.month) {
        return false;
    }

    if (!filters.fromDate && !filters.toDate) {
        return true;
    }

    const periodDate = getOccupancyReportPeriodDate(report);
    const from = parseDateOnly(filters.fromDate);
    const to = parseDateOnly(filters.toDate);

    if (!periodDate) {
        return false;
    }

    if (from && periodDate.getTime() < from.getTime()) {
        return false;
    }

    if (to && periodDate.getTime() > to.getTime()) {
        return false;
    }

    return true;
}

function getFacilityOccupancyStats(facilityCode, filters = {}) {
    const rows = occupancyReports
        .filter(report => report.facility_code === facilityCode)
        .filter(report => isOccupancyReportInAdvancedPeriod(report, filters));

    const sortedRows = [...rows].sort((first, second) => {
        const firstDate = getOccupancyReportPeriodDate(first);
        const secondDate = getOccupancyReportPeriodDate(second);
        return (secondDate ? secondDate.getTime() : 0) - (firstDate ? firstDate.getTime() : 0);
    });
    const latest = sortedRows[0] || null;
    const totalGuests = rows.reduce((sum, item) => sum + toSafeNumber(item.total_guests), 0);
    const totalGuestNights = rows.reduce((sum, item) => sum + toSafeNumber(item.total_guest_nights), 0);
    const totalSoldRoomNights = rows.reduce((sum, item) => sum + toSafeNumber(item.sold_room_nights), 0);
    const totalAvailableRoomNights = rows.reduce((sum, item) => sum + toSafeNumber(item.available_room_nights), 0);
    const totalAvailableBedNights = rows.reduce((sum, item) => sum + toSafeNumber(item.available_bed_nights), 0);
    const roomOccupancy = totalAvailableRoomNights > 0 ? (totalSoldRoomNights / totalAvailableRoomNights) * 100 : 0;
    const bedOccupancy = totalAvailableBedNights > 0 ? (totalGuestNights / totalAvailableBedNights) * 100 : 0;
    const averageStay = totalGuests > 0 ? totalGuestNights / totalGuests : 0;

    return {
        latest_period: latest ? `${getMonthName(latest.month)} ${latest.year || ""}`.trim() : "-",
        room_occupancy: formatPercent(roomOccupancy),
        bed_occupancy: formatPercent(bedOccupancy),
        average_stay: formatStay(averageStay)
    };
}

function getRoomDetailReportValue(facility, roomType, field = "rooms_count") {
    const rows = normalizeRoomDetails(facility || {});
    const row = rows.find(item => item.room_type === roomType) || {};
    return toSafeNumber(row[field]);
}

function getSuiteDetailReportValue(facility, suiteType, field = "suites_count") {
    const rows = normalizeSuiteDetails(facility || {});
    const row = rows.find(item => item.suite_type === suiteType) || {};
    return toSafeNumber(row[field]);
}

function getFacilityAccessibilitySummary(facility) {
    const accessibility = normalizeAccessibility(facility || {});
    const labels = [];

    if (accessibility.accessible_rooms_available) labels.push("غرف مهيأة");
    if (accessibility.accessible_entrances_available) labels.push("مداخل ميسرة");
    if (accessibility.accessible_elevators_available) labels.push("مصاعد مناسبة");
    if (accessibility.accessible_bathrooms_available) labels.push("دورات مياه مهيأة");

    return labels.length ? labels.join("، ") : "لا توجد بيانات";
}

function getFacilityAdvancedRow(facility, index, filters = {}) {
    const license = getFacilityLatestLicense(facility.facility_code);
    const issueDate = license ? getLicenseIssueDateValue(license) : (facility.license_issue_date || "");
    const expiryDate = license ? getLicenseExpiryDateValue(license) : (facility.license_expiry_date || "");
    const daysRemaining = calculateLicenseDaysRemaining(expiryDate);
    const licenseStatusValue = license
        ? getLicenseStatusForReport(license)
        : normalizeLicenseStatusValue(facility.licenseStatus || facility.license_status || "");
    const hasLicenseData = Boolean(license || facility.license_number || facility.license_issue_date || facility.license_expiry_date);
    const occupancy = getFacilityOccupancyStats(facility.facility_code, filters);
    const capacityDate = filters.fromDate || (filters.year ? `${filters.year}-${String(filters.month || 1).padStart(2, "0")}-01` : new Date().toISOString().slice(0, 10));
    const capacity = getFacilityCapacityAtDate(facility.facility_code, capacityDate);
    const latestCapacity = getLatestCapacityHistoryRecord(facility.facility_code) || {};
    const services = normalizeServices(facility);
    const restaurantTotals = getRestaurantCafeTotalsFromData(normalizeRestaurantCafeDetails(facility));
    const meetingHallTotals = getMeetingHallTotalsFromData(normalizeMeetingHallDetails(facility));
    const safety = normalizeSafety(facility);
    const sustainability = normalizeSustainability(facility);
    const documents = normalizeFacilityDocuments(facility);
    const recreation = services.recreation || {};

    return {
        sequence: index,
        facility_code: facility.facility_code || "-",
        facility_name: facility.name || "-",
        name_en: facility.name_en || "-",
        national_number: facility.national_number || "-",
        record_type: getRecordTypeLabel(facility.record_type),
        group_name: facility.group_name || "-",
        group_code: facility.group_code || "-",
        branch_name: facility.branch_name || "-",
        branch_count: facility.group_code ? getFacilityBranches(facility.group_code).length : 0,
        facility_type: facility.type || "-",
        municipality: facility.municipality || "-",
        city: facility.city || "-",
        address: facility.address || "-",
        classification_status: getFacilityClassificationStatus(facility),
        classification: facility.classification || "غير مصنف",
        facility_status: normalizeFacilityStatus(facility.status),
        license_status: hasLicenseData ? getLicenseStatusArabic(licenseStatusValue) : "بدون ترخيص مسجل",
        license_status_value: hasLicenseData ? licenseStatusValue : "no_license",
        license_range: license ? getLicenseExpiryRange(license) : "unspecified",
        license_number: license ? (license.license_number || "-") : (facility.license_number || "-"),
        license_type: license ? (license.license_type || "-") : (facility.license_type || "-"),
        issue_date: formatDateOnly(issueDate),
        expiry_date: formatDateOnly(expiryDate),
        days_remaining: daysRemaining === null ? "-" : daysRemaining,
        license_year: license ? (license.license_year || (issueDate ? String(issueDate).slice(0, 4) : "-")) : "-",
        operation_type: license ? (license.operation_type || "-") : "-",
        renewal_date: license ? (license.renewal_date || "-") : "-",
        created_by: license ? (license.created_by || "-") : "-",
        created_at: license ? (license.created_at || "-") : "-",
        capacity_effective_from: latestCapacity.effective_from || "-",
        capacity_effective_to: latestCapacity.effective_to || "مستمر",
        change_reason: latestCapacity.change_reason || "-",
        floors_count: toSafeNumber(capacity.floors_count),
        single_rooms: getRoomDetailReportValue(facility, "فردية"),
        double_rooms: getRoomDetailReportValue(facility, "زوجية"),
        triple_rooms: getRoomDetailReportValue(facility, "ثلاثية"),
        quad_rooms: getRoomDetailReportValue(facility, "رباعية"),
        twin_rooms: getRoomDetailReportValue(facility, "مزدوجة"),
        accessible_rooms: getRoomDetailReportValue(facility, "غرف مجهزة لذوي الاحتياجات الخاصة"),
        rooms: toSafeNumber(capacity.rooms),
        beds: toSafeNumber(capacity.beds),
        suites: toSafeNumber(capacity.suites),
        presidential_suites: getSuiteDetailReportValue(facility, "أجنحة رئاسية"),
        premium_suites: getSuiteDetailReportValue(facility, "أجنحة ممتازة"),
        standard_suites: getSuiteDetailReportValue(facility, "أجنحة عادية"),
        chalets: toSafeNumber(capacity.chalets) || getFacilityUnitsTotal(facility),
        total_workers: toSafeNumber(capacity.workers_total) || getTotalWorkers(facility),
        national_workers: getFacilityNationalWorkers(facility),
        foreign_workers: getFacilityForeignWorkers(facility),
        seasonal_workers: getFacilitySeasonalWorkersTotal(facility),
        latest_occupancy: occupancy.latest_period,
        room_occupancy: occupancy.room_occupancy,
        bed_occupancy: occupancy.bed_occupancy,
        average_stay: occupancy.average_stay,
        restaurants_count: toSafeNumber(services.restaurants_count) || restaurantTotals.count,
        restaurant_seats: restaurantTotals.seats,
        meeting_halls_count: meetingHallTotals.count || (services.meeting_halls_available ? 1 : 0),
        meeting_hall_seats: meetingHallTotals.seats || toSafeNumber(services.meeting_halls_capacity),
        parking_available: getYesNoLabel(services.parking_available),
        parking_capacity: toSafeNumber(services.parking_capacity),
        wifi_status: services.wifi_status || "-",
        pool: getYesNoLabel(Boolean(recreation.pool || recreation.swimming_pools)),
        gym: getYesNoLabel(recreation.gym),
        spa: getYesNoLabel(recreation.spa),
        playgrounds: getYesNoLabel(recreation.playgrounds),
        accessibility_facilities: getFacilityAccessibilitySummary(facility),
        fire_system_status: safety.fire_system_status || "-",
        cctv_status: safety.cctv_status || "-",
        emergency_exits_status: safety.emergency_exits_status || "-",
        first_aid_available: getYesNoLabel(safety.first_aid_available),
        solar_energy: getYesNoLabel(sustainability.solar_energy),
        water_recycling: getYesNoLabel(sustainability.water_recycling),
        energy_saving_systems: getYesNoLabel(sustainability.energy_saving_systems),
        inspection_report_file: documents.inspection_report_file || "-",
        form_filled_by: facility.form_filled_by || "-",
        form_filled_by_position: facility.form_filled_by_position || "-",
        form_filled_date: facility.form_filled_date || "-",
        notes: facility.notes || (license ? license.notes : "") || "-"
    };
}

function getFacilityAdvancedRowFromLicense(license, index, filters = {}) {
    const facility = getFacilityByCode(license.facility_code) || normalizeFacilityRecord({
        facility_code: license.facility_code || "",
        name: license.facility_name || "مرفق غير موجود في السجل العام",
        type: "",
        municipality: "",
        city: ""
    });
    const row = getFacilityAdvancedRow(facility, index, filters);
    const issueDate = getLicenseIssueDateValue(license);
    const expiryDate = getLicenseExpiryDateValue(license);
    const daysRemaining = calculateLicenseDaysRemaining(expiryDate);
    const statusValue = getLicenseStatusForReport(license);

    return {
        ...row,
        facility_code: license.facility_code || row.facility_code,
        facility_name: facility.name || license.facility_name || row.facility_name,
        license_status: getLicenseStatusArabic(statusValue),
        license_status_value: statusValue,
        license_range: getLicenseExpiryRange(license),
        license_number: license.license_number || "-",
        license_type: license.license_type || "-",
        license_year: license.license_year || (issueDate ? String(issueDate).slice(0, 4) : "-"),
        operation_type: license.operation_type || "-",
        renewal_date: license.renewal_date || "-",
        created_by: license.created_by || "-",
        created_at: license.created_at || "-",
        issue_date: formatDateOnly(issueDate),
        expiry_date: formatDateOnly(expiryDate),
        days_remaining: daysRemaining === null ? "-" : daysRemaining,
        notes: license.notes || row.notes || "-"
    };
}

function getAdvancedReportFilters() {
    return {
        reportType: getTextValue("reportType"),
        scope: getTextValue("advancedReportScope"),
        outputPreset: getAdvancedOutputPreset(),
        facilityCode: getTextValue("reportFacility"),
        facilitySearch: getTextValue("reportFacilitySearch"),
        type: getTextValue("advancedFacilityType"),
        city: getTextValue("advancedCity"),
        municipality: getTextValue("advancedMunicipality"),
        groupQuery: getTextValue("advancedGroupQuery"),
        licenseType: getTextValue("advancedLicenseType"),
        licenseStatus: getTextValue("advancedLicenseStatus"),
        facilityStatus: getTextValue("advancedFacilityStatus"),
        classification: getTextValue("advancedClassification"),
        fromDate: getTextValue("advancedFromDate"),
        toDate: getTextValue("advancedToDate"),
        year: getNumberValue("reportYear"),
        month: getNumberValue("reportMonth")
    };
}

function matchesTextFilter(value, filterValue) {
    return !filterValue || textMatchesArabicSearch(value, filterValue);
}

function facilityMatchesAdvancedGroup(facility, groupQuery) {
    if (!groupQuery) {
        return true;
    }

    return [
        facility.group_name,
        facility.group_code,
        facility.branch_name,
        facility.name,
        facility.facility_code
    ].some(value => textMatchesArabicSearch(value || "", groupQuery));
}

function licenseMatchesAdvancedType(license, licenseType) {
    if (!licenseType) {
        return true;
    }

    return textMatchesArabicSearch(license.license_type || "", licenseType) ||
        textMatchesArabicSearch(license.operation_type || "", licenseType);
}

function facilityMatchesAdvancedLicenseStatus(facility, filterValue) {
    if (!filterValue) {
        return true;
    }

    const license = getFacilityLatestLicense(facility.facility_code);

    if (filterValue === "no_license") {
        return !license && !facility.license_number && !facility.license_expiry_date;
    }

    if (!license) {
        return normalizeLicenseStatusValue(facility.licenseStatus || facility.license_status || "") === filterValue;
    }

    if (filterValue === "within_30" || filterValue === "within_60" || filterValue === "within_90") {
        return getLicenseExpiryRange(license) === filterValue;
    }

    return getLicenseStatusForReport(license) === filterValue;
}

function facilityMatchesAdvancedDateRange(facility, filters) {
    if (!filters.fromDate && !filters.toDate) {
        return true;
    }

    const license = getFacilityLatestLicense(facility.facility_code);

    if (license) {
        if (isDateWithinRange(getLicenseIssueDateValue(license), filters.fromDate, filters.toDate)) {
            return true;
        }

        if (isDateWithinRange(getLicenseExpiryDateValue(license), filters.fromDate, filters.toDate)) {
            return true;
        }
    }

    return occupancyReports.some(report => {
        if (report.facility_code !== facility.facility_code) {
            return false;
        }

        return isOccupancyReportInAdvancedPeriod(report, {
            fromDate: filters.fromDate,
            toDate: filters.toDate,
            year: 0,
            month: 0
        });
    });
}

function filterFacilitiesByAdvancedOptions(items, filters) {
    return items.filter(facility => {
        if (filters.facilityCode && facility.facility_code !== filters.facilityCode) {
            return false;
        }

        if (!filters.facilityCode && filters.facilitySearch && !textMatchesArabicSearch(getFacilitySearchText(facility), filters.facilitySearch)) {
            return false;
        }

        if (filters.type && facility.type !== filters.type) {
            return false;
        }

        if (!matchesTextFilter(facility.city || "", filters.city)) {
            return false;
        }

        if (!matchesTextFilter(facility.municipality || "", filters.municipality)) {
            return false;
        }

        if (!facilityMatchesAdvancedGroup(facility, filters.groupQuery)) {
            return false;
        }

        if (filters.facilityStatus && normalizeFacilityStatus(facility.status) !== filters.facilityStatus) {
            return false;
        }

        if (filters.classification === "classified" && getFacilityClassificationStatus(facility) !== "مصنف") {
            return false;
        }

        if (filters.classification === "unclassified" && getFacilityClassificationStatus(facility) !== "غير مصنف") {
            return false;
        }

        if (filters.classification && !["classified", "unclassified"].includes(filters.classification) && facility.classification !== filters.classification) {
            return false;
        }

        if (!facilityMatchesAdvancedLicenseStatus(facility, filters.licenseStatus)) {
            return false;
        }

        if (!facilityMatchesAdvancedDateRange(facility, filters)) {
            return false;
        }

        return true;
    });
}

function filterLicensesByDateRange(items, fromDate, toDate, getDateValue = getLicensePeriodDate) {
    return items.filter(license => isDateWithinRange(getDateValue(license), fromDate, toDate));
}

function filterLicensesByRenewalPeriod(items, fromDate, toDate) {
    return filterLicensesByDateRange(items, fromDate, toDate, getLicensePeriodDate);
}

function filterLicensesByExpiryPeriod(items, fromDate, toDate) {
    return filterLicensesByDateRange(items, fromDate, toDate, getLicenseExpiryDateValue);
}

function getFacilityCodesForAdvancedLicenseReport(filters) {
    const facilityFilters = {
        ...filters,
        fromDate: "",
        toDate: "",
        licenseStatus: ""
    };

    return new Set(
        filterFacilitiesByAdvancedOptions(facilities, facilityFilters)
            .map(facility => facility.facility_code)
            .filter(Boolean)
    );
}

function licenseMatchesAdvancedStatus(license, statusFilter) {
    if (!statusFilter) {
        return true;
    }

    if (statusFilter === "no_license") {
        return false;
    }

    if (statusFilter === "within_30" || statusFilter === "within_60" || statusFilter === "within_90") {
        return getLicenseExpiryRange(license) === statusFilter;
    }

    return getLicenseStatusForReport(license) === statusFilter;
}

function getFilteredLicensesForAdvancedReport(filters) {
    const facilityCodes = getFacilityCodesForAdvancedLicenseReport(filters);

    return licenses.filter(license => {
        if (!facilityCodes.has(license.facility_code)) {
            return false;
        }

        if (!licenseMatchesAdvancedStatus(license, filters.licenseStatus)) {
            return false;
        }

        if (!licenseMatchesAdvancedType(license, filters.licenseType)) {
            return false;
        }

        if (filters.year) {
            const licenseYear = Number(license.license_year || String(getLicenseIssueDateValue(license) || "").slice(0, 4) || 0);
            if (licenseYear && licenseYear !== filters.year) {
                return false;
            }
        }

        return true;
    });
}

function calculateLicensePeriodStatus(license) {
    return getLicenseControlStatus(license);
}

function calculateFacilitiesTotals(rows) {
    const totalFacilities = rows.length;
    const totalRooms = rows.reduce((sum, row) => sum + toSafeNumber(row.rooms), 0);
    const totalBeds = rows.reduce((sum, row) => sum + toSafeNumber(row.beds), 0);
    const totalSuites = rows.reduce((sum, row) => sum + toSafeNumber(row.suites), 0);
    const totalChalets = rows.reduce((sum, row) => sum + toSafeNumber(row.chalets), 0);
    const totalWorkers = rows.reduce((sum, row) => sum + toSafeNumber(row.total_workers), 0);
    const nationalWorkers = rows.reduce((sum, row) => sum + toSafeNumber(row.national_workers), 0);
    const foreignWorkers = rows.reduce((sum, row) => sum + toSafeNumber(row.foreign_workers), 0);
    const seasonalWorkers = rows.reduce((sum, row) => sum + toSafeNumber(row.seasonal_workers), 0);
    const activeLicenses = rows.filter(row => row.license_status_value === "Active").length;
    const expiredLicenses = rows.filter(row => row.license_status_value === "Expired" || Number(row.days_remaining) < 0).length;
    const nearExpiryLicenses = rows.filter(row => ["within_30", "within_60", "within_90"].includes(row.license_range)).length;
    const activeFacilities = rows.filter(row => row.facility_status === "نشط").length;
    const classifiedFacilities = rows.filter(row => row.classification_status === "مصنف").length;

    return {
        totalFacilities,
        totalRooms,
        totalBeds,
        totalSuites,
        totalChalets,
        totalWorkers,
        nationalWorkers,
        foreignWorkers,
        seasonalWorkers,
        activeLicenses,
        expiredLicenses,
        nearExpiryLicenses,
        activeFacilities,
        classifiedFacilities,
        activePercent: totalFacilities > 0 ? (activeFacilities / totalFacilities) * 100 : 0,
        classifiedPercent: totalFacilities > 0 ? (classifiedFacilities / totalFacilities) * 100 : 0
    };
}

function hasMissingAdvancedData(row) {
    return row.license_number === "-" ||
        row.issue_date === "غير محدد" ||
        row.expiry_date === "غير محدد" ||
        row.rooms === 0 ||
        row.beds === 0 ||
        row.municipality === "-" ||
        row.city === "-" ||
        row.classification_status === "غير مصنف" ||
        row.facility_status === "-" ||
        row.total_workers === 0;
}

function renderAdvancedReportSummary(summary) {
    if (summary && Array.isArray(summary.customCards)) {
        return `
            <div class="cards report-cards">
                ${summary.customCards.map(card => `
                    <div class="card"><h3>${escapeHtml(card.label)}</h3><p>${escapeHtml(card.value)}</p></div>
                `).join("")}
            </div>
        `;
    }

    return `
        <div class="cards report-cards">
            <div class="card"><h3>إجمالي المرافق</h3><p>${summary.totalFacilities}</p></div>
            <div class="card"><h3>إجمالي الغرف</h3><p>${summary.totalRooms}</p></div>
            <div class="card"><h3>إجمالي الأسرة</h3><p>${summary.totalBeds}</p></div>
            <div class="card"><h3>إجمالي الأجنحة</h3><p>${summary.totalSuites}</p></div>
            <div class="card"><h3>إجمالي الشاليهات أو الوحدات</h3><p>${summary.totalChalets}</p></div>
            <div class="card"><h3>إجمالي العاملين</h3><p>${summary.totalWorkers}</p></div>
            <div class="card"><h3>العمالة الوطنية</h3><p>${summary.nationalWorkers}</p></div>
            <div class="card"><h3>العمالة الأجنبية</h3><p>${summary.foreignWorkers}</p></div>
            <div class="card"><h3>العمالة الموسمية</h3><p>${summary.seasonalWorkers}</p></div>
            <div class="card"><h3>التراخيص السارية</h3><p>${summary.activeLicenses}</p></div>
            <div class="card"><h3>التراخيص المنتهية</h3><p>${summary.expiredLicenses}</p></div>
            <div class="card"><h3>تراخيص قريبة من الانتهاء</h3><p>${summary.nearExpiryLicenses}</p></div>
            <div class="card"><h3>نسبة المرافق المصنفة</h3><p>${summary.classifiedPercent.toFixed(1)}%</p></div>
            <div class="card"><h3>نسبة المرافق النشطة</h3><p>${summary.activePercent.toFixed(1)}%</p></div>
        </div>
    `;
}

function getSelectedReportColumns() {
    const checkedColumns = Array.from(document.querySelectorAll("#advancedReportColumns input[type='checkbox']:checked"))
        .map(input => input.value)
        .filter(key => getAdvancedReportColumnDefinition(key));

    if (checkedColumns.length > 0) {
        return checkedColumns.map(getAdvancedReportColumnDefinition);
    }

    return advancedReportColumnDefinitions.filter(column => column.basic);
}

function getAdvancedOutputPreset() {
    const value = getTextValue("advancedOutputPreset");
    return advancedReportOutputPresets[value] ? value : "comprehensive";
}

function getAdvancedOutputPresetLabel(value = getAdvancedOutputPreset()) {
    const presetKey = advancedReportOutputPresets[value] ? value : "comprehensive";
    return advancedReportOutputPresets[presetKey].label;
}

function setAdvancedReportColumnsByKeys(columnKeys) {
    const keySet = new Set(columnKeys);

    document.querySelectorAll("#advancedReportColumns input[type='checkbox']").forEach(input => {
        input.checked = keySet.has(input.value);
    });
}

function applyAdvancedOutputPreset() {
    const preset = advancedReportOutputPresets[getAdvancedOutputPreset()];

    if (!preset) {
        return;
    }

    setAdvancedReportColumnsByKeys(preset.columns);
    applySelectedColumnsToReport();
}

function selectAdvancedReportColumns(mode) {
    const inputs = Array.from(document.querySelectorAll("#advancedReportColumns input[type='checkbox']"));

    inputs.forEach(input => {
        const definition = getAdvancedReportColumnDefinition(input.value);

        if (mode === "all") {
            input.checked = true;
        } else if (mode === "none") {
            input.checked = false;
        } else if (mode === "basic") {
            input.checked = Boolean(definition && definition.basic);
        }
    });

    applySelectedColumnsToReport();
}

function getAdvancedReportCellValue(row, column) {
    const value = row[column.key];
    return value === null || value === undefined || value === "" ? "-" : value;
}

function renderAdvancedReportTable(columns, rows) {
    const headerHtml = columns.map(column => `<th>${escapeHtml(column.label)}</th>`).join("");

    if (!rows.length) {
        return `
            <div class="table-wrapper">
                <table class="advanced-report-table">
                    <thead><tr>${headerHtml}</tr></thead>
                    <tbody><tr><td colspan="${columns.length || 1}" class="advanced-report-empty">لا توجد بيانات مطابقة للفلاتر المحددة</td></tr></tbody>
                </table>
            </div>
        `;
    }

    const rowsHtml = rows.map(row => {
        const cells = columns.map(column => `<td>${escapeHtml(getAdvancedReportCellValue(row, column))}</td>`).join("");
        return `<tr>${cells}</tr>`;
    }).join("");

    return `
        <div class="table-wrapper">
            <table class="advanced-report-table">
                <thead><tr>${headerHtml}</tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>
    `;
}

function getAdvancedReportFilterLabels(filters) {
    const labels = [];

    if (filters.outputPreset) labels.push(`مخرجات التقرير: ${getAdvancedOutputPresetLabel(filters.outputPreset)}`);
    if (filters.type) labels.push(`نوع المرفق: ${filters.type}`);
    if (filters.city) labels.push(`المدينة: ${filters.city}`);
    if (filters.municipality) labels.push(`البلدية: ${filters.municipality}`);
    if (filters.groupQuery) labels.push(`المجموعة / الاسم التجاري: ${filters.groupQuery}`);
    if (filters.licenseType) labels.push(`نوع الترخيص: ${filters.licenseType}`);
    if (filters.licenseStatus) {
        const statusLabel = filters.licenseStatus.startsWith("within_")
            ? getLicenseExpiryRangeLabel(filters.licenseStatus)
            : (filters.licenseStatus === "no_license" ? "بدون ترخيص مسجل" : getLicenseStatusArabic(filters.licenseStatus));
        labels.push(`حالة الترخيص: ${statusLabel}`);
    }
    if (filters.facilityStatus) labels.push(`حالة المرفق: ${filters.facilityStatus}`);
    if (filters.classification) labels.push(`التصنيف: ${filters.classification === "classified" ? "مصنف" : filters.classification === "unclassified" ? "غير مصنف" : filters.classification}`);
    if (filters.fromDate) labels.push(`من تاريخ: ${filters.fromDate}`);
    if (filters.toDate) labels.push(`إلى تاريخ: ${filters.toDate}`);
    if (filters.facilitySearch) labels.push(`بحث: ${filters.facilitySearch}`);

    return labels;
}

function renderAdvancedReportFilters(filters) {
    const labels = getAdvancedReportFilterLabels(filters);

    if (!labels.length) {
        return `<div class="advanced-report-filters"><span>الفلاتر: الكل</span></div>`;
    }

    return `<div class="advanced-report-filters">${labels.map(label => `<span>${escapeHtml(label)}</span>`).join("")}</div>`;
}

function renderAdvancedReportOutput(report) {
    const reportOutput = document.getElementById("reportOutput");

    if (!reportOutput) {
        return;
    }

    reportOutput.innerHTML = `
        ${getOfficialReportHeaderHtml(report.title)}
        <div class="official-report-meta">تاريخ إعداد التقرير: ${escapeHtml(report.reportDate)}</div>
        <div class="official-report-meta">أعد التقرير: ${escapeHtml(report.preparedBy)}</div>
        ${renderAdvancedReportFilters(report.filters)}
        ${renderAdvancedReportSummary(report.summary)}
        ${renderAdvancedReportTable(report.columns, report.rows)}
        ${getOfficialReportFooterHtml()}
    `;
}

function applySelectedColumnsToReport() {
    if (!currentAdvancedReport) {
        return;
    }

    currentAdvancedReport.columns = getSelectedReportColumns();
    renderAdvancedReportOutput(currentAdvancedReport);
}

function buildAdvancedFacilitiesReport(title, rows, filters) {
    const columns = getSelectedReportColumns();
    const summary = calculateFacilitiesTotals(rows);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "_");

    currentAdvancedReport = {
        title,
        rows,
        columns,
        summary,
        filters,
        reportDate: new Date().toLocaleDateString("ar-LY"),
        preparedBy: getReportPreparedBy(),
        fileName: `${String(filters.reportType || "advanced_report").replace(/[^a-z0-9_]/gi, "_")}_${today}.csv`
    };

    currentReportRows = rows;
    renderAdvancedReportOutput(currentAdvancedReport);
}

function buildAdvancedCustomReport(title, rows, filters, columnKeys = null, customCards = null, filePrefix = "advanced_report") {
    const columns = Array.isArray(columnKeys) && columnKeys.length
        ? columnKeys.map(getAdvancedReportColumnDefinition).filter(Boolean)
        : getSelectedReportColumns();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "_");

    currentAdvancedReport = {
        title,
        rows,
        columns,
        summary: customCards ? { customCards } : calculateFacilitiesTotals(rows),
        filters,
        reportDate: new Date().toLocaleDateString("ar-LY"),
        preparedBy: getReportPreparedBy(),
        fileName: `${String(filePrefix || filters.reportType || "advanced_report").replace(/[^a-z0-9_]/gi, "_")}_${today}.csv`
    };

    currentReportRows = rows;
    renderAdvancedReportOutput(currentAdvancedReport);
}

function buildCustomAdvancedReport(title, rows, filters, columnKeys = null, customCards = null, filePrefix = "advanced_report") {
    buildAdvancedCustomReport(title, rows, filters, columnKeys, customCards, filePrefix);
}

function resolveAdvancedReportFacility() {
    return resolveFacilityAutocompleteSelection(
        "reportFacility",
        "reportFacilitySearch",
        selectReportFacility
    );
}

function generateFacilitySingleReport() {
    const filters = getAdvancedReportFilters();
    const facility = resolveAdvancedReportFacility();

    if (!facility) {
        renderFacilityAutocompleteFromInput(
            "reportFacilitySearch",
            "reportFacility",
            "reportFacilityResults",
            selectReportFacility
        );
        alert("يرجى اختيار مرفق من البحث الذكي لإصدار تقرير مرفق محدد");
        return;
    }

    filters.facilityCode = facility.facility_code;
    const rows = [getFacilityAdvancedRow(facility, 1, filters)];
    buildAdvancedFacilitiesReport(`التقرير باسم المرفق - ${facility.name || facility.facility_code}`, rows, filters);
}

function generateFacilityTypeReport() {
    const filters = getAdvancedReportFilters();
    let rows = filterFacilitiesByAdvancedOptions(facilities, filters)
        .map((facility, index) => getFacilityAdvancedRow(facility, index + 1, filters));

    if (filters.outputPreset === "missing") {
        rows = rows.filter(hasMissingAdvancedData);
    }

    const typeLabel = filters.type ? ` - ${filters.type}` : "";
    const title = filters.reportType === "advanced_facilities"
        ? `تقرير عام متعدد الخيارات - ${getAdvancedOutputPresetLabel(filters.outputPreset)}${typeLabel}`
        : `تقرير حسب نوع المرفق${typeLabel}`;

    buildAdvancedFacilitiesReport(title, rows, filters);
}

function generateCityReport() {
    const filters = getAdvancedReportFilters();

    if (!filters.city) {
        alert("يرجى إدخال المدينة لإصدار تقرير حسب المدينة");
        return;
    }

    const rows = filterFacilitiesByAdvancedOptions(facilities, filters)
        .map((facility, index) => getFacilityAdvancedRow(facility, index + 1, filters));

    buildAdvancedFacilitiesReport(`تقرير حسب المدينة - ${filters.city}`, rows, filters);
}

function generateMunicipalityReport() {
    const filters = getAdvancedReportFilters();

    if (!filters.municipality) {
        alert("يرجى إدخال البلدية لإصدار تقرير حسب البلدية");
        return;
    }

    const rows = filterFacilitiesByAdvancedOptions(facilities, filters)
        .map((facility, index) => getFacilityAdvancedRow(facility, index + 1, filters));

    buildAdvancedFacilitiesReport(`تقرير حسب البلدية - ${filters.municipality}`, rows, filters);
}

function generateLicenseRenewalReport() {
    const filters = getAdvancedReportFilters();

    if (!filters.fromDate || !filters.toDate) {
        alert("يرجى اختيار فترة التقرير");
        return;
    }

    const rows = filterLicensesByRenewalPeriod(
        getFilteredLicensesForAdvancedReport(filters),
        filters.fromDate,
        filters.toDate
    ).map((license, index) => getFacilityAdvancedRowFromLicense(license, index + 1, filters));

    buildAdvancedFacilitiesReport("إصدارات الأذونات من فترة إلى فترة", rows, filters);
}

function generateLicenseExpiryReport() {
    const filters = getAdvancedReportFilters();
    let filteredLicenses = getFilteredLicensesForAdvancedReport(filters);

    if (filters.fromDate || filters.toDate) {
        filteredLicenses = filterLicensesByExpiryPeriod(filteredLicenses, filters.fromDate, filters.toDate);
    } else if (!["within_30", "within_60", "within_90"].includes(filters.licenseStatus)) {
        filteredLicenses = filteredLicenses.filter(license => {
            const days = calculateLicenseDaysRemaining(getLicenseExpiryDateValue(license));
            return Number.isFinite(days) && days >= 0 && days <= 90;
        });
    }

    const rows = filteredLicenses
        .filter(license => {
            const days = calculateLicenseDaysRemaining(getLicenseExpiryDateValue(license));
            return Number.isFinite(days) && days >= 0;
        })
        .map((license, index) => getFacilityAdvancedRowFromLicense(license, index + 1, filters));

    buildAdvancedFacilitiesReport("تقرير أذونات المزاولة القريبة من الانتهاء", rows, filters);
}

function generateExpiredLicensesPeriodReport() {
    const filters = getAdvancedReportFilters();
    let filteredLicenses = getFilteredLicensesForAdvancedReport({
        ...filters,
        licenseStatus: ""
    }).filter(license => {
        const days = calculateLicenseDaysRemaining(getLicenseExpiryDateValue(license));
        return getLicenseStatusForReport(license) === "Expired" || (Number.isFinite(days) && days < 0);
    });

    if (filters.fromDate || filters.toDate) {
        filteredLicenses = filterLicensesByExpiryPeriod(filteredLicenses, filters.fromDate, filters.toDate);
    }

    const rows = filteredLicenses
        .map((license, index) => getFacilityAdvancedRowFromLicense(license, index + 1, filters));

    buildAdvancedFacilitiesReport("تقرير أذونات المزاولة المنتهية خلال فترة", rows, filters);
}

function generateCapacityByLocationReport() {
    const filters = getAdvancedReportFilters();
    const rows = filterFacilitiesByAdvancedOptions(facilities, filters)
        .map((facility, index) => getFacilityAdvancedRow(facility, index + 1, filters));

    buildAdvancedFacilitiesReport("تقرير الطاقة الاستيعابية حسب الموقع", rows, filters);
}

function generateWorkforceByLocationReport() {
    const filters = getAdvancedReportFilters();
    const rows = filterFacilitiesByAdvancedOptions(facilities, filters)
        .map((facility, index) => getFacilityAdvancedRow(facility, index + 1, filters));

    buildAdvancedFacilitiesReport("تقرير العمالة حسب الموقع أو نوع المرفق", rows, filters);
}

function generateMissingDataReport() {
    const filters = getAdvancedReportFilters();
    const rows = filterFacilitiesByAdvancedOptions(facilities, filters)
        .map((facility, index) => getFacilityAdvancedRow(facility, index + 1, filters))
        .filter(hasMissingAdvancedData);

    buildAdvancedFacilitiesReport("تقرير المرافق بدون بيانات مكتملة", rows, filters);
}

function requireAdvancedFacility(message) {
    const facility = resolveAdvancedReportFacility();

    if (facility) {
        return facility;
    }

    renderFacilityAutocompleteFromInput(
        "reportFacilitySearch",
        "reportFacility",
        "reportFacilityResults",
        selectReportFacility
    );
    alert(message || "يرجى اختيار مرفق من البحث الذكي لإصدار التقرير");
    return null;
}

function filterAdvancedLicensesByPeriodAndType(items, filters) {
    return items.filter(license => {
        if (!licenseMatchesAdvancedStatus(license, filters.licenseStatus)) {
            return false;
        }

        if (!licenseMatchesAdvancedType(license, filters.licenseType)) {
            return false;
        }

        if (filters.fromDate || filters.toDate) {
            return isDateWithinRange(getLicensePeriodDate(license), filters.fromDate, filters.toDate) ||
                isDateWithinRange(getLicenseExpiryDateValue(license), filters.fromDate, filters.toDate);
        }

        return true;
    });
}

function summarizeAdvancedLicenseRows(rows) {
    const years = new Set(rows.map(row => row.license_year).filter(value => value && value !== "-"));
    const active = rows.filter(row => row.license_status_value === "Active").length;
    const expired = rows.filter(row => row.license_status_value === "Expired" || Number(row.days_remaining) < 0).length;
    const pending = rows.filter(row => row.license_status_value === "Pending").length;
    const nearExpiry = rows.filter(row => ["within_30", "within_60", "within_90"].includes(row.license_range)).length;

    return [
        { label: "إجمالي السجلات", value: rows.length },
        { label: "سنوات الترخيص", value: years.size },
        { label: "التراخيص السارية", value: active },
        { label: "التراخيص المنتهية", value: expired },
        { label: "قيد الإجراء", value: pending },
        { label: "قريبة من الانتهاء", value: nearExpiry }
    ];
}

function getFacilityTimelineRows(facility, filters = {}) {
    const facilityCode = facility.facility_code;
    const base = {
        facility_code: facilityCode || "-",
        facility_name: facility.name || "-",
        facility_type: facility.type || "-",
        municipality: facility.municipality || "-",
        city: facility.city || "-",
        group_name: facility.group_name || "-",
        group_code: facility.group_code || "-",
        branch_name: facility.branch_name || "-"
    };
    const rows = [];

    if (facility.created_at || facility.establishment_date) {
        rows.push({
            ...base,
            event_date: String(facility.establishment_date || facility.created_at).slice(0, 10),
            event_type: "السجل العام",
            event_title: "تسجيل المرفق",
            event_details: `الحالة: ${normalizeFacilityStatus(facility.status)} - التصنيف: ${getFacilityClassificationStatus(facility)}`
        });
    }

    getFacilityLicensesHistory(facilityCode).forEach(license => {
        rows.push({
            ...base,
            ...getFacilityAdvancedRowFromLicense(license, rows.length + 1, filters),
            event_date: formatDateOnly(getLicensePeriodDate(license)),
            event_type: "ترخيص",
            event_title: `${license.operation_type || "إجراء ترخيص"} - ${license.license_number || "-"}`,
            event_details: `نوع الترخيص: ${license.license_type || "-"} - الحالة: ${getLicenseStatusArabic(getLicenseStatusForReport(license))} - الانتهاء: ${formatDateOnly(getLicenseExpiryDateValue(license))}`
        });
    });

    capacityHistory
        .filter(record => record.facility_code === facilityCode)
        .forEach(record => {
            rows.push({
                ...base,
                event_date: record.effective_from || "-",
                event_type: "الطاقة الاستيعابية",
                event_title: record.change_reason || "تحديث الطاقة الاستيعابية",
                event_details: `الغرف: ${toSafeNumber(record.rooms)} - الأسرة: ${toSafeNumber(record.beds)} - الأجنحة: ${toSafeNumber(record.suites)} - الشاليهات: ${toSafeNumber(record.chalets)}`,
                rooms: toSafeNumber(record.rooms),
                beds: toSafeNumber(record.beds),
                suites: toSafeNumber(record.suites),
                chalets: toSafeNumber(record.chalets),
                total_workers: toSafeNumber(record.workers_total || record.total_workers),
                capacity_effective_from: record.effective_from || "-",
                capacity_effective_to: record.effective_to || "مستمر",
                change_reason: record.change_reason || "-"
            });
        });

    occupancyReports
        .filter(report => report.facility_code === facilityCode)
        .forEach(report => {
            rows.push({
                ...base,
                event_date: `${report.year || ""}-${String(report.month || 1).padStart(2, "0")}-01`,
                event_type: "الإشغال",
                event_title: `تقرير إشغال ${getMonthName(report.month)} ${report.year || ""}`.trim(),
                event_details: `النزلاء: ${toSafeNumber(report.total_guests)} - الليالي: ${toSafeNumber(report.total_guest_nights)} - إشغال الغرف: ${report.room_occupancy_rate || "0%"}`,
                latest_occupancy: `${getMonthName(report.month)} ${report.year || ""}`.trim(),
                room_occupancy: report.room_occupancy_rate || "0%",
                bed_occupancy: report.bed_occupancy_rate || "0%",
                average_stay: report.average_length_of_stay || 0
            });
        });

    getAuditRowsForFacility(facilityCode).forEach(audit => {
        rows.push({
            ...base,
            event_date: String(audit.created_at || "").slice(0, 10) || "-",
            event_type: "سجل النشاط",
            event_title: audit.action || "-",
            event_details: audit.details ? JSON.stringify(audit.details) : (audit.entity_name || "-"),
            created_by: audit.user || "-",
            created_at: audit.created_at || "-"
        });
    });

    return rows
        .filter(row => {
            if (!filters.fromDate && !filters.toDate) return true;
            return isDateWithinRange(row.event_date, filters.fromDate, filters.toDate);
        })
        .sort((first, second) => String(first.event_date || "").localeCompare(String(second.event_date || "")))
        .map((row, index) => ({ sequence: index + 1, ...row }));
}

function generateFacilityLicensesReport() {
    const filters = getAdvancedReportFilters();
    const facility = requireAdvancedFacility("يرجى اختيار مرفق لإصدار تقرير تراخيصه");
    if (!facility) return;

    filters.facilityCode = facility.facility_code;
    const rows = filterAdvancedLicensesByPeriodAndType(getFacilityLicensesHistory(facility.facility_code), filters)
        .map((license, index) => getFacilityAdvancedRowFromLicense(license, index + 1, filters));

    buildAdvancedCustomReport(
        `تقرير تراخيص المرفق - ${facility.name || facility.facility_code}`,
        rows,
        filters,
        advancedReportOutputPresets.licenses.columns.concat(["license_year", "operation_type", "renewal_date", "created_by", "created_at"]),
        summarizeAdvancedLicenseRows(rows),
        "facility_licenses_report"
    );
}

function generateFacilityFullHistoryReport() {
    const filters = getAdvancedReportFilters();
    const facility = requireAdvancedFacility("يرجى اختيار مرفق لإصدار التقرير التاريخي الكامل");
    if (!facility) return;

    filters.facilityCode = facility.facility_code;
    const rows = getFacilityTimelineRows(facility, filters);

    buildAdvancedCustomReport(
        `التقرير التاريخي الكامل للمرفق - ${facility.name || facility.facility_code}`,
        rows,
        filters,
        advancedReportOutputPresets.timeline.columns.concat(["rooms", "beds", "suites", "chalets", "license_number", "license_year", "operation_type", "created_by"]),
        [
            { label: "إجمالي الأحداث", value: rows.length },
            { label: "سجلات الترخيص", value: rows.filter(row => row.event_type === "ترخيص").length },
            { label: "تحديثات الطاقة", value: rows.filter(row => row.event_type === "الطاقة الاستيعابية").length },
            { label: "تقارير الإشغال", value: rows.filter(row => row.event_type === "الإشغال").length }
        ],
        "facility_full_history_report"
    );
}

function generateLicensesByYearsReport() {
    const filters = getAdvancedReportFilters();
    const grouped = new Map();

    getFilteredLicensesForAdvancedReport(filters).forEach(license => {
        const facility = getFacilityByCode(license.facility_code) || {};
        const year = String(license.license_year || String(getLicenseIssueDateValue(license) || getLicensePeriodDate(license) || "").slice(0, 4) || "غير محدد");
        const key = [
            year,
            filters.type ? facility.type || "-" : "",
            filters.municipality ? facility.municipality || "-" : "",
            filters.city ? facility.city || "-" : ""
        ].join("|");
        const entry = grouped.get(key) || {
            license_year: year,
            license_count: 0,
            active_license_count: 0,
            expired_license_count: 0,
            pending_license_count: 0,
            facility_type: filters.type ? facility.type || "-" : "كل الأنواع",
            municipality: filters.municipality ? facility.municipality || "-" : "كل البلديات",
            city: filters.city ? facility.city || "-" : "كل المدن"
        };
        const status = getLicenseStatusForReport(license);

        entry.license_count += 1;
        if (status === "Active") entry.active_license_count += 1;
        if (status === "Expired") entry.expired_license_count += 1;
        if (status === "Pending") entry.pending_license_count += 1;
        grouped.set(key, entry);
    });

    const rows = Array.from(grouped.values())
        .sort((first, second) => String(first.license_year).localeCompare(String(second.license_year)))
        .map((row, index) => ({ sequence: index + 1, ...row }));

    buildAdvancedCustomReport(
        "تقرير عدد التراخيص حسب السنوات",
        rows,
        filters,
        advancedReportOutputPresets.licenseYears.columns,
        [
            { label: "عدد السنوات", value: rows.length },
            { label: "إجمالي التراخيص", value: rows.reduce((sum, row) => sum + toSafeNumber(row.license_count), 0) },
            { label: "إجمالي السارية", value: rows.reduce((sum, row) => sum + toSafeNumber(row.active_license_count), 0) },
            { label: "إجمالي المنتهية", value: rows.reduce((sum, row) => sum + toSafeNumber(row.expired_license_count), 0) }
        ],
        "licenses_by_years_report"
    );
}

function getAdvancedBranchFacilities(filters) {
    let rows = filterFacilitiesByAdvancedOptions(facilities, filters)
        .filter(facility => facility.group_code || facility.group_name);

    if (!filters.groupQuery && filters.facilityCode) {
        const facility = getFacilityByCode(filters.facilityCode);
        if (facility && facility.group_code) {
            rows = getFacilityBranches(facility.group_code);
        }
    }

    return rows;
}

function generateFacilityBranchesReport() {
    const filters = getAdvancedReportFilters();
    const rows = getAdvancedBranchFacilities(filters)
        .map((facility, index) => getFacilityAdvancedRow(facility, index + 1, filters));
    const groupCount = new Set(rows.map(row => row.group_code).filter(value => value && value !== "-")).size;

    buildAdvancedCustomReport(
        filters.groupQuery ? `تقرير الفروع حسب الاسم التجاري - ${filters.groupQuery}` : "تقرير الفروع حسب الاسم التجاري",
        rows,
        filters,
        advancedReportOutputPresets.branches.columns,
        [
            { label: "عدد المجموعات", value: groupCount },
            { label: "عدد الفروع", value: rows.length },
            { label: "إجمالي الغرف", value: rows.reduce((sum, row) => sum + toSafeNumber(row.rooms), 0) },
            { label: "إجمالي الأسرة", value: rows.reduce((sum, row) => sum + toSafeNumber(row.beds), 0) }
        ],
        "facility_branches_report"
    );
}

function generateFacilityTimelineReport() {
    const filters = getAdvancedReportFilters();
    const facility = requireAdvancedFacility("يرجى اختيار مرفق لإصدار تقريره عبر الزمن");
    if (!facility) return;

    filters.facilityCode = facility.facility_code;
    const rows = getFacilityTimelineRows(facility, filters);

    buildAdvancedCustomReport(
        `تقرير مرفق عبر الزمن - ${facility.name || facility.facility_code}`,
        rows,
        filters,
        advancedReportOutputPresets.timeline.columns,
        [
            { label: "إجمالي الأحداث", value: rows.length },
            { label: "أول حدث", value: rows[0] ? rows[0].event_date : "-" },
            { label: "آخر حدث", value: rows[rows.length - 1] ? rows[rows.length - 1].event_date : "-" }
        ],
        "facility_timeline_report"
    );
}

function generateCapacityDevelopmentReport() {
    const filters = getAdvancedReportFilters();
    const allowedFacilities = new Map(filterFacilitiesByAdvancedOptions(facilities, { ...filters, licenseStatus: "" })
        .map(facility => [facility.facility_code, facility]));
    const rows = capacityHistory
        .filter(record => allowedFacilities.has(record.facility_code))
        .filter(record => {
            if (!filters.fromDate && !filters.toDate) return true;
            return isDateWithinRange(record.effective_from, filters.fromDate, filters.toDate);
        })
        .map((record, index) => {
            const facility = allowedFacilities.get(record.facility_code) || {};
            return {
                ...getFacilityAdvancedRow(facility, index + 1, filters),
                event_date: record.effective_from || "-",
                event_type: "الطاقة الاستيعابية",
                event_title: record.change_reason || "تحديث الطاقة الاستيعابية",
                event_details: `من ${record.effective_from || "-"} إلى ${record.effective_to || "مستمر"}`,
                rooms: toSafeNumber(record.rooms),
                beds: toSafeNumber(record.beds),
                suites: toSafeNumber(record.suites),
                chalets: toSafeNumber(record.chalets),
                total_workers: toSafeNumber(record.workers_total || record.total_workers),
                capacity_effective_from: record.effective_from || "-",
                capacity_effective_to: record.effective_to || "مستمر",
                change_reason: record.change_reason || "-"
            };
        })
        .sort((first, second) => String(first.event_date || "").localeCompare(String(second.event_date || "")));

    buildAdvancedCustomReport(
        "تقرير تطور الطاقة الاستيعابية",
        rows,
        filters,
        ["facility_code", "facility_name", "facility_type", "municipality", "city", "group_name", "branch_name", "capacity_effective_from", "capacity_effective_to", "rooms", "beds", "suites", "chalets", "total_workers", "change_reason"],
        [
            { label: "سجلات التغيير", value: rows.length },
            { label: "إجمالي الغرف الحالي/المسجل", value: rows.reduce((sum, row) => sum + toSafeNumber(row.rooms), 0) },
            { label: "إجمالي الأسرة الحالي/المسجل", value: rows.reduce((sum, row) => sum + toSafeNumber(row.beds), 0) }
        ],
        "capacity_development_report"
    );
}

function generateBranchesComparisonReport() {
    const filters = getAdvancedReportFilters();
    const rows = getAdvancedBranchFacilities(filters)
        .map((facility, index) => getFacilityAdvancedRow(facility, index + 1, filters))
        .sort((first, second) => String(first.group_name || "").localeCompare(String(second.group_name || "")) ||
            toSafeNumber(second.rooms) - toSafeNumber(first.rooms));

    buildAdvancedCustomReport(
        filters.groupQuery ? `تقرير مقارنة الفروع - ${filters.groupQuery}` : "تقرير مقارنة الفروع",
        rows,
        filters,
        ["group_name", "group_code", "branch_name", "facility_code", "facility_name", "facility_type", "municipality", "city", "rooms", "beds", "suites", "chalets", "total_workers", "license_status", "days_remaining"],
        [
            { label: "عدد الفروع", value: rows.length },
            { label: "أكبر عدد غرف", value: rows.reduce((max, row) => Math.max(max, toSafeNumber(row.rooms)), 0) },
            { label: "إجمالي الأسرة", value: rows.reduce((sum, row) => sum + toSafeNumber(row.beds), 0) }
        ],
        "branches_comparison_report"
    );
}

function renderFacilityLicensesTimeline(facilityCode) {
    const facility = getFacilityByCode(facilityCode);
    if (!facility) return `<div class="advanced-report-empty">تعذر العثور على المرفق</div>`;

    return renderDetailRowsTable([
        { key: "event_date", label: "التاريخ" },
        { key: "event_type", label: "نوع الحدث" },
        { key: "event_title", label: "العنوان" },
        { key: "event_details", label: "التفاصيل" }
    ], getFacilityTimelineRows(facility).filter(row => row.event_type === "ترخيص"));
}

function generateAdvancedReport() {
    const reportType = getTextValue("reportType");
    const scope = getTextValue("advancedReportScope");

    if (reportType === "advanced_facilities") {
        if (scope === "facility") {
            generateFacilitySingleReport();
            return;
        }

        if (scope === "city") {
            generateCityReport();
            return;
        }

        if (scope === "municipality") {
            generateMunicipalityReport();
            return;
        }
    }

    if (reportType === "advanced_facility") {
        generateFacilitySingleReport();
        return;
    }

    if (reportType === "advanced_city") {
        generateCityReport();
        return;
    }

    if (reportType === "advanced_municipality") {
        generateMunicipalityReport();
        return;
    }

    if (reportType === "advanced_license_renewal") {
        generateLicenseRenewalReport();
        return;
    }

    if (reportType === "advanced_license_expiry") {
        generateLicenseExpiryReport();
        return;
    }

    if (reportType === "advanced_expired_licenses") {
        generateExpiredLicensesPeriodReport();
        return;
    }

    if (reportType === "advanced_facility_licenses") {
        generateFacilityLicensesReport();
        return;
    }

    if (reportType === "advanced_facility_full_history") {
        generateFacilityFullHistoryReport();
        return;
    }

    if (reportType === "advanced_licenses_by_years") {
        generateLicensesByYearsReport();
        return;
    }

    if (reportType === "advanced_branches") {
        generateFacilityBranchesReport();
        return;
    }

    if (reportType === "advanced_facility_timeline") {
        generateFacilityTimelineReport();
        return;
    }

    if (reportType === "advanced_capacity_development") {
        generateCapacityDevelopmentReport();
        return;
    }

    if (reportType === "advanced_branches_comparison") {
        generateBranchesComparisonReport();
        return;
    }

    generateFacilityTypeReport();
}

function exportAdvancedReportCSV() {
    if (!currentAdvancedReport || !Array.isArray(currentAdvancedReport.rows)) {
        generateAdvancedReport();
    }

    if (!currentAdvancedReport || !currentAdvancedReport.rows.length) {
        alert("لا توجد بيانات لتصديرها");
        return;
    }

    const report = currentAdvancedReport;
    let csvContent = "\uFEFF";

    csvContent += [
        "وزارة السياحة والصناعات التقليدية",
        "إدارة المهن والرقابة السياحية",
        "قسم الإيواء السياحي",
        `اسم التقرير: ${report.title}`,
        `تاريخ إعداد التقرير: ${report.reportDate}`,
        `أعد التقرير: ${report.preparedBy}`
    ].map(escapeCsvValue).join("\n") + "\n\n";

    const filterLabels = getAdvancedReportFilterLabels(report.filters);
    if (filterLabels.length) {
        csvContent += filterLabels.map(escapeCsvValue).join("\n") + "\n\n";
    }

    csvContent += report.columns.map(column => escapeCsvValue(column.label)).join(",") + "\n";

    report.rows.forEach(row => {
        csvContent += report.columns
            .map(column => escapeCsvValue(getAdvancedReportCellValue(row, column)))
            .join(",") + "\n";
    });

    csvContent += "\n" + escapeCsvValue("تصميم وبرمجة مركز المعلومات والتوثيق السياحي 2026") + "\n";

    const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = report.fileName || "advanced_report.csv";
    link.click();

    URL.revokeObjectURL(url);
}

function printAdvancedReport() {
    if (!currentAdvancedReport) {
        generateAdvancedReport();
    }

    const reportOutput = document.getElementById("reportOutput");

    if (!reportOutput) {
        return;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
        alert("تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.");
        return;
    }

    printWindow.document.write(`
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>${escapeHtml(currentAdvancedReport ? currentAdvancedReport.title : "تقرير")}</title>
            <style>
                body { font-family: Arial, sans-serif; direction: rtl; padding: 22px; color: #222; }
                .official-report-header { text-align: center; border-bottom: 2px solid #0277bd; padding-bottom: 12px; margin-bottom: 16px; }
                .official-report-header h2 { margin: 0 0 8px; color: #0277bd; }
                .official-report-header p { margin: 4px 0; font-weight: bold; }
                .official-report-meta { margin: 10px 0; font-weight: bold; }
                .advanced-report-filters { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 16px; }
                .advanced-report-filters span { border: 1px solid #90caf9; padding: 5px 8px; border-radius: 12px; font-size: 11px; }
                .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 14px 0; }
                .card { border: 1px solid #cfd8dc; padding: 8px; text-align: center; border-radius: 6px; }
                .card h3 { margin: 0 0 6px; font-size: 11px; color: #37474f; }
                .card p { margin: 0; font-size: 17px; font-weight: bold; color: #0277bd; }
                table { width: 100%; border-collapse: collapse; margin-top: 14px; }
                th, td { border: 1px solid #777; padding: 5px; text-align: center; font-size: 10px; }
                th { background: #0277bd; color: white; }
                .official-report-footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #90a4ae; text-align: center; font-weight: bold; }
                @page { size: A4 landscape; margin: 10mm; }
            </style>
        </head>
        <body>${reportOutput.innerHTML}</body>
        </html>
    `);

    printWindow.document.close();
    printWindow.print();
}

// ===============================
// شاشة التقارير والبحث الذكي
// ===============================

function populateReportFacilitySelect() {
    const searchInput = document.getElementById("reportFacilitySearch");
    const hiddenInput = document.getElementById("reportFacility");
    const resultsBox = document.getElementById("reportFacilityResults");

    if (!searchInput || !hiddenInput || !resultsBox) {
        return;
    }

    resultsBox.innerHTML = "";
    resultsBox.classList.add("hidden");
}

function resetReportSearch() {
    setValue("reportFacilitySearch", "");
    setValue("reportFacility", "");

    const resultsBox = document.getElementById("reportFacilityResults");
    if (resultsBox) {
        resultsBox.innerHTML = "";
        resultsBox.classList.add("hidden");
    }
}

function filterReportFacilities() {
    const searchInput = document.getElementById("reportFacilitySearch");
    const hiddenInput = document.getElementById("reportFacility");
    const resultsBox = document.getElementById("reportFacilityResults");

    if (!searchInput || !hiddenInput || !resultsBox) {
        return;
    }

    const rawSearch = searchInput.value.trim();

    hiddenInput.value = "";

    if (!rawSearch) {
        resultsBox.classList.add("hidden");
        return;
    }

    if (!Array.isArray(facilities) || facilities.length === 0) {
        resultsBox.innerHTML = `<div class="search-no-results">لا توجد مرافق محفوظة - أضف مرفقاً أولاً</div>`;
        resultsBox.classList.remove("hidden");
        return;
    }

    renderAutocompleteResults(
        "reportFacilityResults",
        searchFacilities(rawSearch),
        selectReportFacility,
        "لا توجد نتائج مطابقة"
    );
}

function selectReportFacility(facility) {
    setValue("reportFacilitySearch", getFacilityAutocompleteLabel(facility));
    setValue("reportFacility", facility.facility_code || "");
    currentAdvancedReport = null;

    hideAutocompleteResults("reportFacilityResults");
}

function findFacilityFromReportSearchText() {
    return findSingleMatchingFacility(getTextValue("reportFacilitySearch"));
}

function toggleReportMonth() {
    const reportType = getTextValue("reportType");
    const monthContainer = document.getElementById("reportMonthContainer");
    const yearInput = document.getElementById("reportYear");
    const isLicenseStatusReport = reportType === "licenses_status";
    const isAdvancedReport = isAdvancedReportType(reportType);
    const advancedOptions = document.getElementById("advancedReportOptions");

    if (monthContainer) {
        monthContainer.classList.toggle("hidden", (reportType === "annual" || isLicenseStatusReport) && !isAdvancedReport);
    }

    document.querySelectorAll(".license-report-filter").forEach(item => {
        item.classList.toggle("hidden", !isLicenseStatusReport);
    });

    if (advancedOptions) {
        advancedOptions.classList.toggle("hidden", !isAdvancedReport);
    }

    const scopeByType = {
        advanced_facility: "facility",
        advanced_facilities: "all",
        advanced_facility_type: "type",
        advanced_city: "city",
        advanced_municipality: "municipality",
        advanced_license_renewal: "period",
        advanced_license_expiry: "license_status",
        advanced_expired_licenses: "period",
        advanced_facility_licenses: "facility",
        advanced_facility_full_history: "facility",
        advanced_licenses_by_years: "period",
        advanced_branches: "all",
        advanced_facility_timeline: "facility",
        advanced_capacity_development: "period",
        advanced_branches_comparison: "all"
    };
    setSelectValue("advancedReportScope", scopeByType[reportType] || "all");

    const presetByType = {
        advanced_facility: "comprehensive",
        advanced_facilities: "comprehensive",
        advanced_facility_type: "core",
        advanced_city: "comprehensive",
        advanced_municipality: "comprehensive",
        advanced_license_renewal: "licenses",
        advanced_license_expiry: "licenses",
        advanced_expired_licenses: "licenses",
        advanced_facility_licenses: "licenses",
        advanced_facility_full_history: "timeline",
        advanced_licenses_by_years: "licenseYears",
        advanced_branches: "branches",
        advanced_facility_timeline: "timeline",
        advanced_capacity_development: "capacity",
        advanced_branches_comparison: "branches"
    };

    currentAdvancedReport = null;

    if (isAdvancedReport) {
        setSelectValue("advancedOutputPreset", presetByType[reportType] || "comprehensive");
        applyAdvancedOutputPreset();
    }

    if (yearInput) {
        if (isLicenseStatusReport || isAdvancedReport) {
            yearInput.required = false;
            yearInput.placeholder = isAdvancedReport ? "اختياري" : "الكل";

            if (isLicenseStatusReport) {
                yearInput.value = "";
            }
        } else {
            yearInput.required = true;
            yearInput.placeholder = "";

            if (!yearInput.value) {
                yearInput.value = new Date().getFullYear();
            }
        }
    }
}

function handleReportSubmit(event) {
    event.preventDefault();
    generateReport();
}

function generateReport() {
    const reportType = getTextValue("reportType");

    if (reportType === "licenses_status") {
        generateLicensesStatusReport();
        return;
    }

    if (isAdvancedReportType(reportType)) {
        generateAdvancedReport();
        return;
    }

    ensureDefaultReportOutput();

    let facilityCode = getTextValue("reportFacility");

    if (!facilityCode) {
        const autoFacility = findFacilityFromReportSearchText();

        if (autoFacility) {
            selectReportFacility(autoFacility);
            facilityCode = autoFacility.facility_code;
        }
    }

    if (!facilityCode) {
        filterReportFacilities();
        alert("يرجى اختيار المرفق من القائمة المقترحة");
        return;
    }

    const reportYear = getNumberValue("reportYear");
    const reportMonth = getNumberValue("reportMonth");

    if (!reportYear) {
        alert("يرجى إدخال سنة التقرير");
        return;
    }

    let filteredReports = occupancyReports.filter(report => {
        return report.facility_code === facilityCode && Number(report.year) === reportYear;
    });

    if (reportType === "monthly") {
        filteredReports = filteredReports.filter(report => Number(report.month) === reportMonth);
    }

    currentReportRows = filteredReports;

    renderReport(filteredReports);
}

function renderReport(rows) {
    const tableBody = document.getElementById("reportTable");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (!Array.isArray(rows) || rows.length === 0) {
        currentReportRows = [];
        setReportSummary(0, 0, 0, 0, 0, 0, 0, 0, 0);

        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="12">لا توجد بيانات مطابقة لمحددات التقرير</td>`;
        tableBody.appendChild(row);
        return;
    }

    const totalLibyanGuests = rows.reduce((sum, item) => sum + Number(item.libyan_guests || 0), 0);
    const totalArabGuests = rows.reduce((sum, item) => sum + Number(item.arab_guests || 0), 0);
    const totalForeignGuests = rows.reduce((sum, item) => sum + Number(item.foreign_guests || 0), 0);
    const totalGuests = rows.reduce((sum, item) => sum + Number(item.total_guests || 0), 0);
    const totalGuestNights = rows.reduce((sum, item) => sum + Number(item.total_guest_nights || 0), 0);
    const totalSoldRoomNights = rows.reduce((sum, item) => sum + Number(item.sold_room_nights || 0), 0);

    const totalAvailableRoomNights = rows.reduce((sum, item) => sum + Number(item.available_room_nights || 0), 0);
    const totalAvailableBedNights = rows.reduce((sum, item) => sum + Number(item.available_bed_nights || 0), 0);

    const averageRoomOccupancy = totalAvailableRoomNights > 0
        ? (totalSoldRoomNights / totalAvailableRoomNights) * 100
        : 0;

    const averageBedOccupancy = totalAvailableBedNights > 0
        ? (totalGuestNights / totalAvailableBedNights) * 100
        : 0;

    const averageStay = totalGuests > 0
        ? totalGuestNights / totalGuests
        : 0;

    setReportSummary(
        totalGuests,
        totalLibyanGuests,
        totalArabGuests,
        totalForeignGuests,
        totalGuestNights,
        totalSoldRoomNights,
        averageRoomOccupancy,
        averageBedOccupancy,
        averageStay
    );

    rows.forEach(report => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${getReportFacilityName(report)}</td>
            <td>${report.year || "-"}</td>
            <td>${getMonthName(report.month)}</td>
            <td>${report.libyan_guests || 0}</td>
            <td>${report.arab_guests || 0}</td>
            <td>${report.foreign_guests || 0}</td>
            <td>${report.total_guests || 0}</td>
            <td>${report.total_guest_nights || 0}</td>
            <td>${report.sold_room_nights || 0}</td>
            <td>${report.room_occupancy_rate || "0%"}</td>
            <td>${report.bed_occupancy_rate || "0%"}</td>
            <td>${report.average_length_of_stay || "0 ليلة"}</td>
        `;

        tableBody.appendChild(row);
    });
}

function setReportSummary(
    totalGuests,
    libyanGuests,
    arabGuests,
    foreignGuests,
    guestNights,
    soldRoomNights,
    roomOccupancy,
    bedOccupancy,
    averageStay
) {
    setText("reportTotalGuests", totalGuests);
    setText("reportLibyanGuests", libyanGuests);
    setText("reportArabGuests", arabGuests);
    setText("reportForeignGuests", foreignGuests);
    setText("reportGuestNights", guestNights);
    setText("reportSoldRoomNights", soldRoomNights);
    setText("reportRoomOccupancy", `${roomOccupancy.toFixed(2)}%`);
    setText("reportBedOccupancy", `${bedOccupancy.toFixed(2)}%`);
    setText("reportAverageStay", `${averageStay.toFixed(2)} ليلة`);
}

function exportReportToExcel() {
    if (getTextValue("reportType") === "licenses_status") {
        exportLicensesStatusReportCSV();
        return;
    }

    if (isAdvancedReportType(getTextValue("reportType"))) {
        exportAdvancedReportCSV();
        return;
    }

    if (!currentReportRows || currentReportRows.length === 0) {
        alert("لا توجد بيانات لتصديرها");
        return;
    }

    let csvContent = "\uFEFF";
    const reportName = getTextValue("reportType") === "annual"
        ? "التقرير السنوي للإشغال"
        : "تقرير الإشغال الشهري";
    csvContent += [
        "وزارة السياحة والصناعات التقليدية",
        "إدارة المهن والرقابة السياحية",
        "قسم الإيواء السياحي",
        `اسم التقرير: ${reportName}`
    ].map(escapeCsvValue).join("\n") + "\n\n";
    csvContent += "المرفق,السنة,الشهر,ليبيون,عرب,أجانب,إجمالي النزلاء,الليالي السياحية,الليالي الغرفية المباعة,إشغال الغرف,إشغال الأسرة,متوسط الإقامة\n";

    currentReportRows.forEach(report => {
        csvContent += [
            getReportFacilityName(report),
            report.year || "",
            getMonthName(report.month),
            report.libyan_guests || 0,
            report.arab_guests || 0,
            report.foreign_guests || 0,
            report.total_guests || 0,
            report.total_guest_nights || 0,
            report.sold_room_nights || 0,
            report.room_occupancy_rate || "0%",
            report.bed_occupancy_rate || "0%",
            report.average_length_of_stay || "0 ليلة"
        ].join(",") + "\n";
    });

    csvContent += "\n" + escapeCsvValue("تصميم وبرمجة مركز المعلومات والتوثيق السياحي 2026") + "\n";

    const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "tourism_occupancy_report.csv";
    link.click();

    URL.revokeObjectURL(url);
}


function getFacilitiesReportRows() {
    return facilities.map((facility, index) => {
        return [
            index + 1,
            facility.facility_code || "-",
            facility.name || "-",
            facility.type || "-",
            facility.municipality || "-",
            facility.city || "-",
            getFacilityClassificationStatus(facility),
            facility.classification || "غير مصنف",
            normalizeFacilityStatus(facility.status),
            getLicenseStatusArabic(getFacilityLicenseStatus(facility)),
            facility.rooms || 0,
            facility.beds || 0,
            getTotalWorkers(facility)
        ];
    });
}

function exportFacilitiesReportToExcel() {
    if (!Array.isArray(facilities) || facilities.length === 0) {
        alert("لا توجد بيانات مرافق لتصديرها");
        return;
    }

    const headers = [
        "ت",
        "الكود الوطني",
        "اسم المرفق",
        "النوع",
        "البلدية",
        "التصنيف",
        "درجة التصنيف",
        "حالة المرفق",
        "حالة الترخيص",
        "عدد الغرف",
        "عدد الأسرة",
        "إجمالي العاملين"
    ];

    let csvContent = "\uFEFF";
    csvContent += headers.map(escapeCsvValue).join(",") + "\n";

    getFacilitiesReportRows().forEach(row => {
        csvContent += row.map(escapeCsvValue).join(",") + "\n";
    });

    const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "tourism_facilities_register.csv";
    link.click();

    URL.revokeObjectURL(url);
}

function issueFacilitiesReport() {
    if (!Array.isArray(facilities) || facilities.length === 0) {
        alert("لا توجد بيانات مرافق لإصدار التقرير");
        return;
    }

    const totalRooms = facilities.reduce((sum, item) => sum + Number(item.rooms || 0), 0);
    const totalBeds = facilities.reduce((sum, item) => sum + Number(item.beds || 0), 0);
    const reportRows = getFacilitiesReportRows();
    const reportDate = new Date().toLocaleDateString("ar-LY");

    const rowsHtml = reportRows.map(row => {
        return `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`;
    }).join("");

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
        alert("تعذر فتح نافذة التقرير. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.");
        return;
    }

    printWindow.document.write(`
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>تقرير سجل المرافق السياحية</title>
            <style>
                body { font-family: Arial, sans-serif; direction: rtl; padding: 28px; color: #222; }
                h1, h2 { color: #0277bd; margin: 0 0 10px; }
                .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
                .summary div { border: 1px solid #cfd8dc; padding: 12px; text-align: center; border-radius: 8px; }
                .summary strong { display: block; color: #015f96; font-size: 22px; margin-top: 4px; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                th, td { border: 1px solid #999; padding: 7px; text-align: center; font-size: 12px; }
                th { background: #0277bd; color: white; }
                @media print { body { padding: 10px; } .summary { grid-template-columns: repeat(4, 1fr); } }
            </style>
        </head>
        <body>
            <h1>منظومة الإيواء السياحي الليبية</h1>
            <h2>تقرير سجل المرافق السياحية</h2>
            <p>تاريخ الإصدار: ${escapeHtml(reportDate)}</p>

            <div class="summary">
                <div>إجمالي المرافق<strong>${facilities.length}</strong></div>
                <div>إجمالي الغرف<strong>${totalRooms}</strong></div>
                <div>إجمالي الأسرة<strong>${totalBeds}</strong></div>
                <div>المدن المسجلة<strong>${new Set(facilities.map(item => item.city || "-")).size}</strong></div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>ت</th>
                        <th>الكود الوطني</th>
                        <th>اسم المرفق</th>
                        <th>النوع</th>
                        <th>البلدية</th>
                        <th>التصنيف</th>
                        <th>درجة التصنيف</th>
                        <th>حالة المرفق</th>
                        <th>حالة الترخيص</th>
                        <th>عدد الغرف</th>
                        <th>عدد الأسرة</th>
                        <th>إجمالي العاملين</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.print();
}

function countBy(items, getKey) {
    return items.reduce((counts, item) => {
        const key = getKey(item) || "غير محدد";
        counts[key] = (counts[key] || 0) + 1;
        return counts;
    }, {});
}

function sortStats(counts) {
    return Object.entries(counts).sort((a, b) => {
        if (b[1] !== a[1]) {
            return b[1] - a[1];
        }

        return a[0].localeCompare(b[0], "ar");
    });
}

function renderStatsList(elementId, stats, total, limit = 10) {
    const container = document.getElementById(elementId);

    if (!container) {
        return;
    }

    if (!stats.length) {
        container.innerHTML = `<div class="stats-empty">لا توجد بيانات إحصائية حالياً</div>`;
        return;
    }

    container.innerHTML = stats.slice(0, limit).map(([label, count]) => {
        const percent = total > 0 ? (count / total) * 100 : 0;

        return `
            <div class="stats-item">
                <div class="stats-item-header">
                    <strong>${escapeHtml(label)}</strong>
                    <span>${count} - ${percent.toFixed(1)}%</span>
                </div>
                <div class="stats-bar"><span style="width: ${Math.min(percent, 100)}%"></span></div>
            </div>
        `;
    }).join("");
}

function updateStatisticsSection() {
    const totalFacilities = Array.isArray(facilities) ? facilities.length : 0;
    const totalRooms = facilities.reduce((sum, item) => sum + Number(item.rooms || 0), 0);
    const totalBeds = facilities.reduce((sum, item) => sum + Number(item.beds || 0), 0);
    const totalAvailableRoomNights = occupancyReports.reduce((sum, item) => sum + Number(item.available_room_nights || 0), 0);
    const totalAvailableBedNights = occupancyReports.reduce((sum, item) => sum + Number(item.available_bed_nights || 0), 0);
    const totalSoldRoomNights = occupancyReports.reduce((sum, item) => sum + Number(item.sold_room_nights || 0), 0);
    const totalGuestNights = occupancyReports.reduce((sum, item) => sum + Number(item.total_guest_nights || 0), 0);
    const totalGuests = occupancyReports.reduce((sum, item) => sum + Number(item.total_guests || 0), 0);
    const roomOccupancy = totalAvailableRoomNights > 0 ? (totalSoldRoomNights / totalAvailableRoomNights) * 100 : 0;
    const bedOccupancy = totalAvailableBedNights > 0 ? (totalGuestNights / totalAvailableBedNights) * 100 : 0;
    const cityStats = sortStats(countBy(facilities, item => item.city));

    setText("statsTotalFacilities", totalFacilities);
    setText("statsTotalRooms", totalRooms);
    setText("statsTotalBeds", totalBeds);
    setText("statsAverageBeds", totalFacilities > 0 ? (totalBeds / totalFacilities).toFixed(1) : "0");
    setText("statsOccupancyReports", occupancyReports.length);
    setText("statsRoomOccupancy", `${roomOccupancy.toFixed(1)}%`);
    setText("statsBedOccupancy", `${bedOccupancy.toFixed(1)}%`);
    setText("statsTopCity", cityStats.length ? cityStats[0][0] : "-");

    renderStatsList("facilityTypeStats", sortStats(countBy(facilities, item => item.type)), totalFacilities);
    renderStatsList("cityStats", cityStats, totalFacilities, 12);
    renderStatsList("classificationStats", sortStats(countBy(facilities, item => item.classification)), totalFacilities);

    const occupancyStats = [
        ["إجمالي النزلاء", totalGuests],
        ["إجمالي الليالي السياحية", totalGuestNights],
        ["الليالي الغرفية المباعة", totalSoldRoomNights],
        ["الليالي الغرفية المتاحة", totalAvailableRoomNights],
        ["الليالي السريرية المتاحة", totalAvailableBedNights]
    ];
    renderStatsList("occupancyStats", occupancyStats, Math.max(totalAvailableRoomNights, totalAvailableBedNights, totalGuests, 1), 8);
}

function printReport() {
    if (getTextValue("reportType") === "licenses_status") {
        printLicensesStatusReport();
        return;
    }

    if (isAdvancedReportType(getTextValue("reportType"))) {
        printAdvancedReport();
        return;
    }

    const reportOutput = document.getElementById("reportOutput");

    if (!reportOutput) {
        return;
    }

    const printWindow = window.open("", "_blank");
    const reportName = getTextValue("reportType") === "annual"
        ? "التقرير السنوي للإشغال"
        : "تقرير الإشغال الشهري";
    const reportDate = new Date().toLocaleDateString("ar-LY");

    if (!printWindow) {
        alert("تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.");
        return;
    }

    printWindow.document.write(`
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>تقرير الإشغال السياحي</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    direction: rtl;
                    padding: 30px;
                    color: #222;
                }

                h1, h2, h3 {
                    color: #0277bd;
                }

                .official-report-header {
                    text-align: center;
                    border-bottom: 2px solid #0277bd;
                    padding-bottom: 12px;
                    margin-bottom: 16px;
                }

                .official-report-header h2 {
                    margin: 0 0 8px;
                }

                .official-report-header p {
                    margin: 4px 0;
                    font-weight: bold;
                }

                .official-report-meta {
                    margin: 12px 0;
                    font-weight: bold;
                }

                .official-report-footer {
                    margin-top: 18px;
                    padding-top: 10px;
                    border-top: 1px solid #90a4ae;
                    text-align: center;
                    font-weight: bold;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }

                th, td {
                    border: 1px solid #999;
                    padding: 8px;
                    text-align: center;
                    font-size: 13px;
                }

                th {
                    background: #0277bd;
                    color: white;
                }

                .cards {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin-bottom: 20px;
                }

                .card {
                    border: 1px solid #ccc;
                    padding: 12px;
                    text-align: center;
                    border-radius: 8px;
                }

                .card h3 {
                    margin: 0 0 8px;
                    font-size: 14px;
                }

                .card p {
                    margin: 0;
                    font-size: 20px;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            ${getOfficialReportHeaderHtml(reportName)}
            <div class="official-report-meta">تاريخ إعداد التقرير: ${escapeHtml(reportDate)}</div>
            ${reportOutput.innerHTML}
            ${getOfficialReportFooterHtml()}
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.print();
}


function bindFacilityCalculationEvents() {
    [
        ["roomsCount", "bedsPerRoom", "bedsCount"],
        ["vrRoomsCount", "vrAverageBedsPerRoom", "vrBedsCount"],
        ["apRoomsCount", "apAverageBedsPerRoom", "apBedsCount"],
        ["hsRoomsCount", "hsAverageBedsPerRoom", "hsBedsCount"]
    ].forEach(([roomsId, averageId, bedsId]) => {
        [roomsId, averageId].forEach(id => {
            const field = document.getElementById(id);
            if (field) {
                field.addEventListener("input", () => calculateBedsFromAverage(roomsId, averageId, bedsId));
            }
        });
    });

    [
        "nationalMaleWorkers",
        "nationalFemaleWorkers",
        "foreignMaleWorkers",
        "foreignFemaleWorkers"
    ].forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.addEventListener("input", calculatePermanentWorkersTotal);
        }
    });

    [
        "seasonalNationalMaleWorkers",
        "seasonalNationalFemaleWorkers",
        "seasonalForeignMaleWorkers",
        "seasonalForeignFemaleWorkers"
    ].forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.addEventListener("input", calculateSeasonalWorkersTotal);
        }
    });

    const hasSeasonalWorkers = document.getElementById("hasSeasonalWorkers");
    if (hasSeasonalWorkers) {
        hasSeasonalWorkers.addEventListener("change", toggleSeasonalWorkersFields);
    }

    document.querySelectorAll('input[type="number"][min="0"]').forEach(field => {
        field.addEventListener("input", function() {
            if (Number(field.value) < 0) {
                field.value = 0;
            }
        });
    });

    document.querySelectorAll("#roomDetailsTable input, #suiteDetailsTable input, #restaurantCafeDetailsTable input, #meetingHallDetailsTable input").forEach(field => {
        field.addEventListener("input", updateFacilityCapacityTotals);
    });

    [
        "restaurantsAvailable",
        "meetingHallsAvailable",
        "parkingAvailable",
        "accessibleRoomsAvailable",
        "accessibleEntrancesAvailable",
        "accessibleElevatorsAvailable",
        "accessibleBathroomsAvailable"
    ].forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.addEventListener("change", updateFacilityCapacityTotals);
        }
    });
}

// ===============================
// ربط الأحداث
// ===============================

function bindEvents() {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", function(event) {
            event.preventDefault();

            const email = getTextValue("loginEmail");
            const password = getTextValue("loginPassword");

            if (email === demoUser.email && password === demoUser.password) {
                localStorage.setItem("tas_logged_in", "true");

                showApp();
                updateDashboard();
                renderFacilitiesTable();
                refreshAllFacilityDropdowns();
                renderLicensesTable();
                renderOccupancyTable();
                updateStatisticsSection();
            } else {
                alert("بيانات الدخول غير صحيحة");
            }
        });
    }

    const facilityForm = document.getElementById("facilityForm");
    if (facilityForm) {
        facilityForm.addEventListener("submit", handleFacilitySubmit);
        facilityForm.addEventListener("reset", function() {
            setTimeout(() => {
                toggleFacilityFields();
                updateAllFacilityCalculatedFields();
                toggleSeasonalWorkersFields();
                resetMap();
            }, 0);
        });
    }

    const facilityType = document.getElementById("facilityType");
    if (facilityType) {
        facilityType.addEventListener("change", toggleFacilityFields);
    }

    ["facilityRecordType", "hasFacilityGroup"].forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.addEventListener("change", toggleFacilityGroupFields);
        }
    });

    const facilityGroupName = document.getElementById("facilityGroupName");
    if (facilityGroupName) {
        facilityGroupName.addEventListener("blur", function() {
            if (getTextValue("facilityGroupName") && !getTextValue("facilityGroupCode")) {
                setValue("facilityGroupCode", generateFacilityGroupCode(getTextValue("facilityGroupName")));
            }
        });
    }

    const facilityCity = document.getElementById("facilityCity");
    if (facilityCity) {
        facilityCity.addEventListener("input", filterFacilityCities);
        facilityCity.addEventListener("focus", filterFacilityCities);
        facilityCity.addEventListener("keydown", function(event) {
            if (event.key === "Escape") {
                const resultsBox = document.getElementById("facilityCityResults");
                if (resultsBox) {
                    resultsBox.classList.add("hidden");
                }
            }
        });
    }

    const latitude = document.getElementById("latitude");
    if (latitude) {
        latitude.addEventListener("input", updateMapFromInputs);
    }

    const longitude = document.getElementById("longitude");
    if (longitude) {
        longitude.addEventListener("input", updateMapFromInputs);
    }

    const licenseForm = document.getElementById("licenseForm");
    if (licenseForm) {
        licenseForm.addEventListener("submit", handleLicenseSubmit);
        licenseForm.addEventListener("reset", function() {
            setTimeout(() => {
                clearFacilityAutocompleteSelection("licenseFacility", "licenseFacilitySearch", "licenseFacilityResults", "licenseFacilitySelected");
            }, 0);
        });
    }

    const licenseFacilitySearch = document.getElementById("licenseFacilitySearch");
    if (licenseFacilitySearch) {
        licenseFacilitySearch.addEventListener("input", function() {
            updateSelectedFacilityNote("licenseFacilitySelected", null);
            renderFacilityAutocompleteFromInput(
                "licenseFacilitySearch",
                "licenseFacility",
                "licenseFacilityResults",
                selectFacilityForLicense
            );
        });
        licenseFacilitySearch.addEventListener("focus", function() {
            renderFacilityAutocompleteFromInput(
                "licenseFacilitySearch",
                "licenseFacility",
                "licenseFacilityResults",
                selectFacilityForLicense
            );
        });
    }

    const licenseIssueDate = document.getElementById("licenseIssueDate");
    if (licenseIssueDate) {
        licenseIssueDate.addEventListener("change", updateLicenseExpiryDate);
        licenseIssueDate.addEventListener("input", updateLicenseExpiryDate);
    }

    bindFacilityCalculationEvents();

    const occupancyForm = document.getElementById("occupancyForm");
    if (occupancyForm) {
        occupancyForm.addEventListener("submit", handleOccupancySubmit);
        occupancyForm.addEventListener("reset", function() {
            setTimeout(() => {
                clearFacilityAutocompleteSelection("occupancyFacility", "occupancyFacilitySearch", "occupancyFacilityResults", "occupancyFacilitySelected");
                calculateOccupancyIndicators();
            }, 0);
        });
    }

    const occupancyFacilitySearch = document.getElementById("occupancyFacilitySearch");
    if (occupancyFacilitySearch) {
        occupancyFacilitySearch.addEventListener("input", function() {
            updateSelectedFacilityNote("occupancyFacilitySelected", null);
            setValue("occupancyRooms", 0);
            setValue("occupancyBeds", 0);
            calculateOccupancyIndicators();
            renderFacilityAutocompleteFromInput(
                "occupancyFacilitySearch",
                "occupancyFacility",
                "occupancyFacilityResults",
                selectFacilityForOccupancy
            );
        });
        occupancyFacilitySearch.addEventListener("focus", function() {
            renderFacilityAutocompleteFromInput(
                "occupancyFacilitySearch",
                "occupancyFacility",
                "occupancyFacilityResults",
                selectFacilityForOccupancy
            );
        });
    }

    const occupancyYear = document.getElementById("occupancyYear");
    if (occupancyYear) {
        occupancyYear.addEventListener("input", updateMonthDays);
        occupancyYear.addEventListener("change", fillFacilityCapacityForOccupancy);
    }

    const occupancyMonth = document.getElementById("occupancyMonth");
    if (occupancyMonth) {
        occupancyMonth.addEventListener("change", updateMonthDays);
        occupancyMonth.addEventListener("change", fillFacilityCapacityForOccupancy);
    }

    [
        "monthDays",
        "occupancyRooms",
        "occupancyBeds",
        "libyanGuests",
        "arabGuests",
        "foreignGuests",
        "libyanGuestNights",
        "arabGuestNights",
        "foreignGuestNights",
        "soldRoomNights"
    ].forEach(id => {
        const field = document.getElementById(id);

        if (field) {
            field.addEventListener("input", calculateOccupancyIndicators);
        }
    });

    const reportForm = document.getElementById("reportForm");
    if (reportForm) {
        reportForm.addEventListener("submit", handleReportSubmit);
    }

    const reportType = document.getElementById("reportType");
    if (reportType) {
        reportType.addEventListener("change", toggleReportMonth);
        toggleReportMonth();
    }

    const facilitiesSearchInput = document.getElementById("facilitiesSearchInput");
    if (facilitiesSearchInput) {
        facilitiesSearchInput.addEventListener("input", resetFacilitiesPaginationAndRender);
    }

    [
        "facilitiesTypeFilter",
        "facilitiesMunicipalityFilter",
        "facilitiesCityFilter",
        "facilitiesLicenseStatusFilter",
        "facilitiesStatusFilter",
        "facilitiesClassificationFilter"
    ].forEach(id => {
        const field = document.getElementById(id);

        if (field) {
            field.addEventListener("change", resetFacilitiesPaginationAndRender);
        }
    });

    const facilitiesPrevPageBtn = document.getElementById("facilitiesPrevPageBtn");
    if (facilitiesPrevPageBtn) {
        facilitiesPrevPageBtn.addEventListener("click", () => changeFacilitiesPage(-1));
    }

    const facilitiesNextPageBtn = document.getElementById("facilitiesNextPageBtn");
    if (facilitiesNextPageBtn) {
        facilitiesNextPageBtn.addEventListener("click", () => changeFacilitiesPage(1));
    }

    [
        "licenseReportStatusFilter",
        "licenseReportExpiryRange",
        "licenseReportMunicipality",
        "licenseReportCity",
        "licenseReportFacilityType"
    ].forEach(id => {
        const field = document.getElementById(id);

        if (field) {
            field.addEventListener("input", function() {
                currentLicensesStatusReportRows = [];
            });
            field.addEventListener("change", function() {
                currentLicensesStatusReportRows = [];
            });
        }
    });

    [
        "advancedReportScope",
        "advancedOutputPreset",
        "advancedFacilityType",
        "advancedMunicipality",
        "advancedCity",
        "advancedGroupQuery",
        "advancedLicenseType",
        "advancedLicenseStatus",
        "advancedFacilityStatus",
        "advancedClassification",
        "advancedFromDate",
        "advancedToDate",
        "reportYear",
        "reportMonth"
    ].forEach(id => {
        const field = document.getElementById(id);

        if (field) {
            field.addEventListener("input", function() {
                currentAdvancedReport = null;
            });
            field.addEventListener("change", function() {
                currentAdvancedReport = null;
            });
        }
    });

    const advancedOutputPreset = document.getElementById("advancedOutputPreset");
    if (advancedOutputPreset) {
        advancedOutputPreset.addEventListener("change", applyAdvancedOutputPreset);
    }

    document.querySelectorAll("#advancedReportColumns input[type='checkbox']").forEach(input => {
        input.addEventListener("change", function() {
            applySelectedColumnsToReport();
        });
    });

    const reportFacilitySearch = document.getElementById("reportFacilitySearch");
    if (reportFacilitySearch) {
        reportFacilitySearch.addEventListener("input", filterReportFacilities);
        reportFacilitySearch.addEventListener("input", function() {
            currentLicensesStatusReportRows = [];
            currentAdvancedReport = null;
        });
        reportFacilitySearch.addEventListener("focus", filterReportFacilities);

        reportFacilitySearch.addEventListener("keydown", function(event) {
            if (event.key === "Escape") {
                const resultsBox = document.getElementById("reportFacilityResults");
                if (resultsBox) {
                    resultsBox.classList.add("hidden");
                }
            }
        });
    }

    document.addEventListener("click", function(event) {
        const searchInput = document.getElementById("reportFacilitySearch");
        const resultsBox = document.getElementById("reportFacilityResults");
        const cityInput = document.getElementById("facilityCity");
        const cityResultsBox = document.getElementById("facilityCityResults");
        const licenseInput = document.getElementById("licenseFacilitySearch");
        const licenseResultsBox = document.getElementById("licenseFacilityResults");
        const occupancyInput = document.getElementById("occupancyFacilitySearch");
        const occupancyResultsBox = document.getElementById("occupancyFacilityResults");

        if (searchInput && resultsBox &&
            !searchInput.contains(event.target) && !resultsBox.contains(event.target)) {
            resultsBox.classList.add("hidden");
        }

        if (cityInput && cityResultsBox &&
            !cityInput.contains(event.target) && !cityResultsBox.contains(event.target)) {
            cityResultsBox.classList.add("hidden");
        }

        if (licenseInput && licenseResultsBox &&
            !licenseInput.contains(event.target) && !licenseResultsBox.contains(event.target)) {
            licenseResultsBox.classList.add("hidden");
        }

        if (occupancyInput && occupancyResultsBox &&
            !occupancyInput.contains(event.target) && !occupancyResultsBox.contains(event.target)) {
            occupancyResultsBox.classList.add("hidden");
        }
    });
}

// ===============================
// تشغيل النظام
// ===============================

bindEvents();
ensureDefaultReportOutput();
toggleReportMonth();
toggleFacilityFields();
toggleFacilityGroupFields();
toggleSeasonalWorkersFields();
updateAllFacilityCalculatedFields();
checkLoginStatus();

loadAuditLogData();
loadLibyaReferenceData();
loadFacilitiesData();
loadLicensesData();
loadOccupancyData();
