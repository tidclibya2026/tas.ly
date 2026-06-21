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
    return `${facility.name || "مرفق بدون اسم"} - ${facility.type || ""} - ${facility.city || ""}`;
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
    return `${facility.name || "مرفق بدون اسم"} - ${facility.type || "-"} - ${facility.municipality || "-"} - ${facility.city || "-"} - ${facility.facility_code || "-"}`;
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
    const averageBedsPerRoom = Number(facility.average_beds_per_room || facility.beds_per_unit || 0) ||
        (rooms > 0 && beds > 0 ? Number((beds / rooms).toFixed(2)) : 0);

    return {
        ...facility,
        facility_code: facility.facility_code || "",
        status: normalizeFacilityStatus(facility.status),
        licenseStatus: facility.licenseStatus || facility.license_status || "Pending",
        classification_status: facility.classification_status || getFacilityClassificationStatus(facility),
        rooms,
        beds,
        average_beds_per_room: averageBedsPerRoom,
        local_workers: localWorkers,
        foreign_workers: foreignWorkers,
        national_male_workers: nationalMale,
        national_female_workers: nationalFemale,
        foreign_male_workers: foreignMale,
        foreign_female_workers: foreignFemale,
        total_workers: totalWorkers,
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

        refreshAllFacilityDropdowns();
        seedLicensesFromFacilitiesIfNeeded();
        updateDashboard();
        renderFacilitiesTable();
        updateStatisticsSection();

    } catch (error) {
        if (savedFacilitiesLoaded) {
            facilitiesLoadError = "";
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
        row.innerHTML = `<td colspan="13">${facilitiesLoadError || "لا توجد بيانات مرافق حالياً"}</td>`;
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
        row.innerHTML = `<td colspan="13">لا توجد مرافق مطابقة للبحث أو الفلاتر المحددة</td>`;
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
            <td>${item.type || "-"}</td>
            <td>${item.municipality || "-"}</td>
            <td>${item.city || "-"}</td>
            <td>${getFacilityClassificationStatus(item)}</td>
            <td>${item.classification || "غير مصنف"}</td>
            <td>${normalizeFacilityStatus(item.status)}</td>
            <td>${licenseStatus}</td>
            <td>${item.rooms || 0}</td>
            <td>${item.beds || 0}</td>
            <td>${getTotalWorkers(item)}</td>
            <td>
                <button type="button" class="table-action-button" onclick="startFacilityEdit('${item.facility_code || ""}')">تعديل</button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    renderFacilitiesPagination(totalItems, totalPages, startIndex, endIndex);
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


function clearFacilityCapacityFields() {
    [
        "suitesCount",
        "roomsCount",
        "averageBedsPerRoom",
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
        "seasonalWorkersNotes"
    ].forEach(id => setValue(id, ""));
}

function setFacilityFormMode(mode) {
    const isEditMode = mode === "edit";

    setText("facilityFormTitle", isEditMode ? "تعديل بيانات مرفق إيواء سياحي" : "إضافة مرفق إيواء سياحي");
    setText(
        "facilityFormDescription",
        isEditMode
            ? "تحديث بيانات المرفق مع الحفاظ على الكود الوطني الحالي"
            : "تسجيل فندق، قرية سياحية، منتجع، شقق فندقية، أو نزل ضمن السجل الوطني"
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

    const averageBeds = Number(facility.average_beds_per_room || 0);

    if (facility.type === "فندق") {
        setValue("suitesCount", Number(facility.suites || 0));
        setValue("roomsCount", Number(facility.rooms || 0));
        setValue("averageBedsPerRoom", averageBeds);
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

    if (facility.type === "نزل") {
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

    if (type === "نزل" && hostelFields) {
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
        extras: ""
    };

    if (type === "فندق") {
        capacity.suites = getNumberValue("suitesCount");
        capacity.rooms = getNumberValue("roomsCount");
        capacity.average_beds_per_room = getNumberValue("averageBedsPerRoom");
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

    if (type === "نزل") {
        capacity.rooms = getNumberValue("hsRoomsCount");
        capacity.average_beds_per_room = getNumberValue("hsAverageBedsPerRoom");
        capacity.beds = getNumberValue("hsBedsCount");
    }

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

    updateAllFacilityCalculatedFields();

    const editingCode = getTextValue("editingFacilityCode") || currentEditingFacilityCode;
    const existingIndex = facilities.findIndex(item => item.facility_code === editingCode);
    const existingFacility = existingIndex >= 0 ? facilities[existingIndex] : null;
    const latitudeValue = getTextValue("latitude");
    const longitudeValue = getTextValue("longitude");
    const capacity = getCapacityByType(facilityType);
    const selectedDocuments = getMultipleFileNames("facilityDocuments");
    const existingDocuments = existingFacility && existingFacility.documents ? existingFacility.documents : {};

    const facilityData = {
        ...(existingFacility || {}),
        id: existingFacility ? existingFacility.id : facilities.length + 1,
        facility_code: existingFacility ? existingFacility.facility_code : generateFacilityCode(facilityType, facilityCity),

        name: facilityName,
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

        suites: capacity.suites,
        rooms: capacity.rooms,
        beds: capacity.beds,
        chalets: capacity.chalets,
        apartments: capacity.apartments,
        average_beds_per_room: capacity.average_beds_per_room,
        local_workers: capacity.local_workers,
        foreign_workers: capacity.foreign_workers,
        national_male_workers: capacity.national_male_workers,
        national_female_workers: capacity.national_female_workers,
        foreign_male_workers: capacity.foreign_male_workers,
        foreign_female_workers: capacity.foreign_female_workers,
        total_workers: capacity.total_workers,
        seasonal_workers: capacity.seasonal_workers,
        extras: capacity.extras,

        documents: {
            passport_file: getFileName("passportFile") || existingDocuments.passport_file || "",
            national_id_file: getFileName("nationalIdFile") || existingDocuments.national_id_file || "",
            facility_documents: selectedDocuments.length > 0 ? selectedDocuments : (existingDocuments.facility_documents || [])
        },

        created_at: existingFacility ? existingFacility.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    if (existingFacility) {
        facilities[existingIndex] = facilityData;
    } else {
        facilities.push(facilityData);
    }

    saveFacilitiesToLocalStorage();

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
    const issueDate = getTextValue("licenseIssueDate");
    const expiryDate = getTextValue("licenseExpiryDate");
    const renewalCount = getNumberValue("renewalCount");
    const licenseNotes = getTextValue("licenseNotes");

    if (!licenseNumber || !issueDate || !expiryDate) {
        alert("يرجى إدخال رقم الترخيص وتاريخ الإصدار وتاريخ الانتهاء");
        return;
    }

    const existingIndex = licenses.findIndex(item => item.license_number === licenseNumber);
    const licenseData = {
        id: existingIndex >= 0 ? licenses[existingIndex].id : licenses.length + 1,
        facility_code: facility.facility_code,
        facility_name: facility.name,
        license_number: licenseNumber,
        license_type: licenseType,
        license_status: licenseStatus,
        issue_date: issueDate,
        expiry_date: expiryDate,
        renewal_count: renewalCount,
        license_document: getFileName("licenseDocument"),
        notes: licenseNotes,
        created_at: existingIndex >= 0 ? licenses[existingIndex].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        licenses[existingIndex] = licenseData;
    } else {
        licenses.push(licenseData);
    }

    saveLicensesToLocalStorage();

    facility.licenseStatus = licenseStatus;
    facility.license_number = licenseNumber;
    facility.license_type = licenseType;
    facility.license_issue_date = issueDate;
    facility.license_expiry_date = expiryDate;
    facility.renewal_count = renewalCount;
    saveFacilitiesToLocalStorage();

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
        row.innerHTML = `<td colspan="8">لا توجد تراخيص مسجلة حالياً</td>`;
        tableBody.appendChild(row);
        return;
    }

    licenses.forEach(license => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${license.license_number || "-"}</td>
            <td>${license.facility_name || "-"}</td>
            <td>${license.license_type || "-"}</td>
            <td>${license.issue_date || "-"}</td>
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

    setValue("occupancyRooms", Number(facility.rooms || 0));
    setValue("occupancyBeds", Number(facility.beds || 0));

    calculateOccupancyIndicators();
}

function updateMonthDays() {
    const year = getNumberValue("occupancyYear") || new Date().getFullYear();
    const month = getNumberValue("occupancyMonth") || 1;

    const days = new Date(year, month, 0).getDate();

    setValue("monthDays", days);

    calculateOccupancyIndicators();
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
    { key: "facility_type", label: "نوع المرفق", basic: true },
    { key: "municipality", label: "البلدية", basic: true },
    { key: "city", label: "المدينة", basic: true },
    { key: "address", label: "العنوان", basic: false },
    { key: "classification_status", label: "التصنيف", basic: true },
    { key: "classification", label: "درجة التصنيف", basic: false },
    { key: "facility_status", label: "حالة المرفق", basic: true },
    { key: "license_status", label: "حالة الترخيص", basic: true },
    { key: "license_number", label: "رقم الترخيص", basic: false },
    { key: "issue_date", label: "تاريخ الإصدار", basic: false },
    { key: "expiry_date", label: "تاريخ الانتهاء", basic: false },
    { key: "days_remaining", label: "عدد الأيام المتبقية", basic: false },
    { key: "rooms", label: "عدد الغرف", basic: true },
    { key: "beds", label: "عدد الأسرة", basic: true },
    { key: "suites", label: "عدد الأجنحة", basic: false },
    { key: "chalets", label: "عدد الشاليهات أو الوحدات", basic: false },
    { key: "total_workers", label: "إجمالي العاملين", basic: true },
    { key: "national_workers", label: "العمالة الوطنية", basic: false },
    { key: "foreign_workers", label: "العمالة الأجنبية", basic: false },
    { key: "seasonal_workers", label: "العمالة الموسمية", basic: false },
    { key: "latest_occupancy", label: "آخر بيانات إشغال مسجلة", basic: false },
    { key: "room_occupancy", label: "متوسط إشغال الغرف", basic: false },
    { key: "bed_occupancy", label: "متوسط إشغال الأسرة", basic: false },
    { key: "average_stay", label: "متوسط مدة الإقامة", basic: false },
    { key: "notes", label: "ملاحظات", basic: false }
];

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
        advanced_facility: "تقرير مرفق محدد",
        advanced_facilities: "تقرير عام لكل المرافق",
        advanced_facility_type: "تقرير حسب نوع المرفق",
        advanced_city: "تقرير حسب المدينة",
        advanced_municipality: "تقرير حسب البلدية",
        advanced_license_renewal: "تقرير تجديد أذن المزاولة خلال فترة",
        advanced_license_expiry: "تقرير أذونات المزاولة القريبة من الانتهاء",
        advanced_expired_licenses: "تقرير أذونات المزاولة المنتهية خلال فترة"
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

    return {
        sequence: index,
        facility_code: facility.facility_code || "-",
        facility_name: facility.name || "-",
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
        rooms: toSafeNumber(facility.rooms),
        beds: toSafeNumber(facility.beds),
        suites: toSafeNumber(facility.suites),
        chalets: getFacilityUnitsTotal(facility),
        total_workers: getTotalWorkers(facility),
        national_workers: getFacilityNationalWorkers(facility),
        foreign_workers: getFacilityForeignWorkers(facility),
        seasonal_workers: getFacilitySeasonalWorkersTotal(facility),
        latest_occupancy: occupancy.latest_period,
        room_occupancy: occupancy.room_occupancy,
        bed_occupancy: occupancy.bed_occupancy,
        average_stay: occupancy.average_stay,
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
        facilityCode: getTextValue("reportFacility"),
        facilitySearch: getTextValue("reportFacilitySearch"),
        type: getTextValue("advancedFacilityType"),
        city: getTextValue("advancedCity"),
        municipality: getTextValue("advancedMunicipality"),
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

        return licenseMatchesAdvancedStatus(license, filters.licenseStatus);
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

function renderAdvancedReportSummary(summary) {
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

    if (filters.type) labels.push(`نوع المرفق: ${filters.type}`);
    if (filters.city) labels.push(`المدينة: ${filters.city}`);
    if (filters.municipality) labels.push(`البلدية: ${filters.municipality}`);
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
    buildAdvancedFacilitiesReport(`تقرير مرفق محدد - ${facility.name || facility.facility_code}`, rows, filters);
}

function generateFacilityTypeReport() {
    const filters = getAdvancedReportFilters();
    const rows = filterFacilitiesByAdvancedOptions(facilities, filters)
        .map((facility, index) => getFacilityAdvancedRow(facility, index + 1, filters));
    const typeLabel = filters.type ? ` - ${filters.type}` : "";
    const title = filters.reportType === "advanced_facilities"
        ? `تقرير عام لكل المرافق${typeLabel}`
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

    buildAdvancedFacilitiesReport("تقرير تجديد أذن المزاولة خلال فترة", rows, filters);
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
        .filter(row => {
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
        });

    buildAdvancedFacilitiesReport("تقرير المرافق بدون بيانات مكتملة", rows, filters);
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
        advanced_expired_licenses: "period"
    };
    setSelectValue("advancedReportScope", scopeByType[reportType] || "all");
    currentAdvancedReport = null;

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
        ["roomsCount", "averageBedsPerRoom", "bedsCount"],
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
    }

    const occupancyMonth = document.getElementById("occupancyMonth");
    if (occupancyMonth) {
        occupancyMonth.addEventListener("change", updateMonthDays);
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
        "advancedFacilityType",
        "advancedMunicipality",
        "advancedCity",
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
toggleSeasonalWorkersFields();
updateAllFacilityCalculatedFields();
checkLoginStatus();

loadLibyaReferenceData();
loadFacilitiesData();
loadLicensesData();
loadOccupancyData();
