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
    return element ? Number(element.value || 0) : 0;
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

// ===============================
// تحميل وحفظ بيانات المرافق
// ===============================

async function loadFacilitiesData() {
    const savedFacilities = localStorage.getItem("tas_facilities");

    if (savedFacilities) {
        try {
            facilities = JSON.parse(savedFacilities);

            if (Array.isArray(facilities) && facilities.length > 0) {
                updateDashboard();
                renderFacilitiesTable();
                populateFacilitySelect();
                populateOccupancyFacilitySelect();
                populateReportFacilitySelect();
                return;
            }

            localStorage.removeItem("tas_facilities");
        } catch (error) {
            console.error("خطأ في قراءة بيانات المرافق المحفوظة:", error);
            localStorage.removeItem("tas_facilities");
        }
    }

    try {
        let response = await fetch("data/facilities.json");

        if (!response.ok) {
            response = await fetch("../data/facilities.json");
        }

        if (!response.ok) {
            throw new Error("لم يتم العثور على ملف بيانات المرافق");
        }

        facilities = await response.json();

        if (!Array.isArray(facilities)) {
            facilities = [];
        }

        saveFacilitiesToLocalStorage();

        updateDashboard();
        renderFacilitiesTable();
        populateFacilitySelect();
        populateOccupancyFacilitySelect();
        populateReportFacilitySelect();

    } catch (error) {
        console.error("خطأ في تحميل بيانات المرافق:", error);

        facilities = [];

        updateDashboard();
        renderFacilitiesTable();
        populateFacilitySelect();
        populateOccupancyFacilitySelect();
        populateReportFacilitySelect();
    }
}

function saveFacilitiesToLocalStorage() {
    localStorage.setItem("tas_facilities", JSON.stringify(facilities));
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

    renderLicensesTable();
    updateDashboard();
}

function saveLicensesToLocalStorage() {
    localStorage.setItem("tas_licenses", JSON.stringify(licenses));
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
        renderReport([]);
    }
}

// ===============================
// تحديث لوحة التحكم
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

    if (licenses.length > 0) {
        activeLicensesElement.textContent = activeLicenses;
    } else {
        activeLicensesElement.textContent = activeLicensesFromFacilities;
    }
}

// ===============================
// عرض سجل المرافق
// ===============================

function renderFacilitiesTable() {
    const tableBody = document.getElementById("facilitiesTable");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (!Array.isArray(facilities) || facilities.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td colspan="9">لا توجد بيانات مرافق حالياً</td>
        `;
        tableBody.appendChild(row);
        return;
    }

    facilities.forEach(item => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${item.facility_code || "-"}</td>
            <td>${item.name || "-"}</td>
            <td>${item.type || "-"}</td>
            <td>${item.municipality || "-"}</td>
            <td>${item.city || "-"}</td>
            <td>${item.rooms || 0}</td>
            <td>${item.beds || 0}</td>
            <td>${item.classification || "غير مصنف"}</td>
            <td>${item.status || "-"}</td>
        `;

        tableBody.appendChild(row);
    });
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
    const latitude = document.getElementById("latitude");
    const longitude = document.getElementById("longitude");

    if (latitude) latitude.value = lat.toFixed(6);
    if (longitude) longitude.value = lng.toFixed(6);
}

function updateMarker(lat, lng, zoom = 15) {
    if (!map || !marker) {
        return;
    }

    const facilityNameElement = document.getElementById("facilityName");
    const facilityName = facilityNameElement ? facilityNameElement.value || "المرفق الجديد" : "المرفق الجديد";

    marker.setLatLng([lat, lng]);
    marker.bindPopup(`موقع ${facilityName}`).openPopup();
    map.setView([lat, lng], zoom);
}

function updateMapFromInputs() {
    const latitude = document.getElementById("latitude");
    const longitude = document.getElementById("longitude");

    if (!latitude || !longitude) {
        return;
    }

    const lat = parseFloat(latitude.value);
    const lng = parseFloat(longitude.value);

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
// قراءة الطاقة الاستيعابية حسب النوع
// ===============================

function getCapacityByType(type) {
    const capacity = {
        suites: 0,
        rooms: 0,
        beds: 0,
        chalets: 0,
        apartments: 0,
        local_workers: 0,
        foreign_workers: 0,
        extras: ""
    };

    if (type === "فندق") {
        capacity.suites = getNumberValue("suitesCount");
        capacity.rooms = getNumberValue("roomsCount");
        capacity.beds = getNumberValue("bedsCount");
        capacity.local_workers = getNumberValue("localWorkers");
        capacity.foreign_workers = getNumberValue("foreignWorkers");
    }

    if (type === "قرية سياحية" || type === "منتجع") {
        capacity.chalets = getNumberValue("chaletsCount");
        capacity.rooms = getNumberValue("vrRoomsCount");
        capacity.beds = getNumberValue("vrBedsCount");
        capacity.extras = getTextValue("villageResortExtras");
    }

    if (type === "شقق فندقية") {
        capacity.apartments = getNumberValue("apartmentsCount");
        capacity.rooms = getNumberValue("apRoomsCount");
        capacity.beds = getNumberValue("apBedsCount");
    }

    if (type === "نزل") {
        capacity.rooms = getNumberValue("hsRoomsCount");
        capacity.beds = getNumberValue("hsBedsCount");
        capacity.local_workers = getNumberValue("hsLocalWorkers");
        capacity.foreign_workers = getNumberValue("hsForeignWorkers");
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
        alert("يرجى إدخال اسم المرفق والبلدية والمدينة والعنوان");
        return;
    }

    const latitudeValue = getTextValue("latitude");
    const longitudeValue = getTextValue("longitude");

    const capacity = getCapacityByType(facilityType);

    const newFacility = {
        id: facilities.length + 1,
        facility_code: generateFacilityCode(facilityType, facilityCity),

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
        status: getTextValue("facilityStatus"),
        licenseStatus: getTextValue("licenseStatus"),
        establishment_date: getTextValue("establishmentDate"),

        latitude: latitudeValue ? parseFloat(latitudeValue) : null,
        longitude: longitudeValue ? parseFloat(longitudeValue) : null,

        suites: capacity.suites,
        rooms: capacity.rooms,
        beds: capacity.beds,
        chalets: capacity.chalets,
        apartments: capacity.apartments,
        local_workers: capacity.local_workers,
        foreign_workers: capacity.foreign_workers,
        extras: capacity.extras,

        documents: {
            passport_file: getFileName("passportFile"),
            national_id_file: getFileName("nationalIdFile"),
            facility_documents: getMultipleFileNames("facilityDocuments")
        },

        created_at: new Date().toISOString()
    };

    facilities.push(newFacility);
    saveFacilitiesToLocalStorage();

    updateDashboard();
    renderFacilitiesTable();
    populateFacilitySelect();
    populateOccupancyFacilitySelect();
    populateReportFacilitySelect();

    alert(`تم حفظ المرفق بنجاح\nالكود الوطني: ${newFacility.facility_code}`);

    const form = document.getElementById("facilityForm");
    if (form) form.reset();

    toggleFacilityFields();
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
    const select = document.getElementById("licenseFacility");

    if (!select) {
        return;
    }

    select.innerHTML = `<option value="">اختر المرفق...</option>`;

    if (!Array.isArray(facilities) || facilities.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "لا توجد مرافق محفوظة - أضف مرفقاً أولاً";
        option.disabled = true;
        select.appendChild(option);
        return;
    }

    facilities.forEach(facility => {
        const option = document.createElement("option");

        option.value = facility.facility_code;
        option.textContent = `${facility.name || "مرفق بدون اسم"} - ${facility.type || ""} - ${facility.city || ""}`;

        select.appendChild(option);
    });
}

function getFacilityByCode(facilityCode) {
    return facilities.find(facility => facility.facility_code === facilityCode);
}

function handleLicenseSubmit(event) {
    event.preventDefault();

    const facilityCode = getTextValue("licenseFacility");
    const facility = getFacilityByCode(facilityCode);

    if (!facility) {
        alert("يرجى اختيار مرفق صحيح");
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

    const newLicense = {
        id: licenses.length + 1,
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
        created_at: new Date().toISOString()
    };

    licenses.push(newLicense);
    saveLicensesToLocalStorage();

    facility.licenseStatus = licenseStatus;
    saveFacilitiesToLocalStorage();

    renderLicensesTable();
    renderFacilitiesTable();
    updateDashboard();

    alert(`تم حفظ الترخيص بنجاح\nرقم الترخيص: ${newLicense.license_number}`);

    const form = document.getElementById("licenseForm");
    if (form) form.reset();
}

function renderLicensesTable() {
    const tableBody = document.getElementById("licensesTable");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (!Array.isArray(licenses) || licenses.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td colspan="8">لا توجد تراخيص مسجلة حالياً</td>
        `;
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
    const select = document.getElementById("occupancyFacility");

    if (!select) {
        return;
    }

    select.innerHTML = `<option value="">اختر المرفق...</option>`;

    if (!Array.isArray(facilities) || facilities.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "لا توجد مرافق محفوظة - أضف مرفقاً أولاً";
        option.disabled = true;
        select.appendChild(option);
        return;
    }

    facilities.forEach(facility => {
        const option = document.createElement("option");

        option.value = facility.facility_code;
        option.textContent = `${facility.name || "مرفق بدون اسم"} - ${facility.type || ""} - ${facility.city || ""}`;

        select.appendChild(option);
    });
}

function fillFacilityCapacityForOccupancy() {
    const facilityCode = getTextValue("occupancyFacility");
    const facility = facilities.find(item => item.facility_code === facilityCode);

    const occupancyRooms = document.getElementById("occupancyRooms");
    const occupancyBeds = document.getElementById("occupancyBeds");

    if (!facility) {
        if (occupancyRooms) occupancyRooms.value = 0;
        if (occupancyBeds) occupancyBeds.value = 0;

        calculateOccupancyIndicators();
        return;
    }

    if (occupancyRooms) occupancyRooms.value = Number(facility.rooms || 0);
    if (occupancyBeds) occupancyBeds.value = Number(facility.beds || 0);

    calculateOccupancyIndicators();
}

function updateMonthDays() {
    const year = getNumberValue("occupancyYear") || new Date().getFullYear();
    const month = getNumberValue("occupancyMonth") || 1;

    const days = new Date(year, month, 0).getDate();

    const monthDays = document.getElementById("monthDays");
    if (monthDays) {
        monthDays.value = days;
    }

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

    const roomOccupancyRate = availableRoomNights > 0
        ? (soldRoomNights / availableRoomNights) * 100
        : 0;

    const bedOccupancyRate = availableBedNights > 0
        ? (totalGuestNights / availableBedNights) * 100
        : 0;

    const averageLengthOfStay = totalGuests > 0
        ? totalGuestNights / totalGuests
        : 0;

    setValue("totalGuests", totalGuests);
    setValue("totalGuestNights", totalGuestNights);
    setValue("availableRoomNights", availableRoomNights);
    setValue("availableBedNights", availableBedNights);
    setValue("roomOccupancyRate", `${roomOccupancyRate.toFixed(2)}%`);
    setValue("bedOccupancyRate", `${bedOccupancyRate.toFixed(2)}%`);
    setValue("averageLengthOfStay", `${averageLengthOfStay.toFixed(2)} ليلة`);
}

function handleOccupancySubmit(event) {
    event.preventDefault();

    calculateOccupancyIndicators();

    const facilityCode = getTextValue("occupancyFacility");
    const facility = facilities.find(item => item.facility_code === facilityCode);

    if (!facility) {
        alert("يرجى اختيار مرفق صحيح");
        return;
    }

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

    alert("تم حفظ تقرير الإشغال الشهري بنجاح");

    const form = document.getElementById("occupancyForm");
    if (form) form.reset();

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
        row.innerHTML = `
            <td colspan="9">لا توجد تقارير إشغال محفوظة حالياً</td>
        `;
        tableBody.appendChild(row);
        return;
    }

    occupancyReports.forEach(report => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${report.facility_name || "-"}</td>
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

// ===============================
// شاشة التقارير
// ===============================

function populateReportFacilitySelect() {
    const select = document.getElementById("reportFacility");

    if (!select) {
        return;
    }

    select.innerHTML = `<option value="">اختر المرفق...</option>`;

    if (!Array.isArray(facilities) || facilities.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "لا توجد مرافق محفوظة - أضف مرفقاً أولاً";
        option.disabled = true;
        select.appendChild(option);
        return;
    }

    facilities.forEach(facility => {
        const option = document.createElement("option");

        option.value = facility.facility_code;
        option.textContent = `${facility.name || "مرفق بدون اسم"} - ${facility.type || ""} - ${facility.city || ""}`;

        select.appendChild(option);
    });
}

function toggleReportMonth() {
    const reportType = getTextValue("reportType");
    const monthContainer = document.getElementById("reportMonthContainer");

    if (!monthContainer) {
        return;
    }

    if (reportType === "annual") {
        monthContainer.classList.add("hidden");
    } else {
        monthContainer.classList.remove("hidden");
    }
}

function handleReportSubmit(event) {
    event.preventDefault();
    generateReport();
}

function generateReport() {
    const facilityCode = getTextValue("reportFacility");
    const reportType = getTextValue("reportType");
    const reportYear = getNumberValue("reportYear");
    const reportMonth = getNumberValue("reportMonth");

    if (!facilityCode) {
        alert("يرجى اختيار المرفق");
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
        setReportSummary(0, 0, 0, 0, 0, 0, 0, 0, 0);

        const row = document.createElement("tr");
        row.innerHTML = `
            <td colspan="12">لا توجد بيانات مطابقة لمحددات التقرير</td>
        `;
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
            <td>${report.facility_name || "-"}</td>
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
    if (!currentReportRows || currentReportRows.length === 0) {
        alert("لا توجد بيانات لتصديرها");
        return;
    }

    let csvContent = "\uFEFF";
    csvContent += "المرفق,السنة,الشهر,ليبيون,عرب,أجانب,إجمالي النزلاء,الليالي السياحية,الليالي الغرفية المباعة,إشغال الغرف,إشغال الأسرة,متوسط الإقامة\n";

    currentReportRows.forEach(report => {
        csvContent += [
            report.facility_name || "",
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

function printReport() {
    const reportOutput = document.getElementById("reportOutput");

    if (!reportOutput) {
        return;
    }

    const printWindow = window.open("", "_blank");

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
            <h1>منظومة الإيواء السياحي الليبية</h1>
            <h2>تقرير الإشغال والليالي السياحية</h2>
            ${reportOutput.innerHTML}
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.print();
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
                populateFacilitySelect();
                populateOccupancyFacilitySelect();
                populateReportFacilitySelect();
                renderLicensesTable();
                renderOccupancyTable();
            } else {
                alert("بيانات الدخول غير صحيحة");
            }
        });
    }

    const facilityForm = document.getElementById("facilityForm");
    if (facilityForm) {
        facilityForm.addEventListener("submit", handleFacilitySubmit);
    }

    const facilityType = document.getElementById("facilityType");
    if (facilityType) {
        facilityType.addEventListener("change", toggleFacilityFields);
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
    }

    const occupancyForm = document.getElementById("occupancyForm");
    if (occupancyForm) {
        occupancyForm.addEventListener("submit", handleOccupancySubmit);
    }

    const occupancyFacility = document.getElementById("occupancyFacility");
    if (occupancyFacility) {
        occupancyFacility.addEventListener("change", fillFacilityCapacityForOccupancy);
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
    }
}

// ===============================
// تشغيل النظام
// ===============================

bindEvents();
toggleFacilityFields();
checkLoginStatus();

loadFacilitiesData();
loadLicensesData();
loadOccupancyData();