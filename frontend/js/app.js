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
// تحميل وحفظ بيانات المرافق
// ===============================

async function loadFacilitiesData() {
    const savedFacilities = localStorage.getItem("tas_facilities");

    if (savedFacilities) {
        try {
            facilities = JSON.parse(savedFacilities);
            updateDashboard();
            renderFacilitiesTable();
            return;
        } catch (error) {
            console.error("خطأ في قراءة البيانات المحفوظة:", error);
            localStorage.removeItem("tas_facilities");
        }
    }

    try {
        let response = await fetch("data/facilities.json");

        if (!response.ok) {
            response = await fetch("../data/facilities.json");
        }

        if (!response.ok) {
            throw new Error("لم يتم العثور على ملف البيانات");
        }

        facilities = await response.json();
        saveFacilitiesToLocalStorage();

        updateDashboard();
        renderFacilitiesTable();
    } catch (error) {
        console.error("خطأ في تحميل بيانات المرافق:", error);
        facilities = [];
        updateDashboard();
        renderFacilitiesTable();
    }
}

function saveFacilitiesToLocalStorage() {
    localStorage.setItem("tas_facilities", JSON.stringify(facilities));
}

// ===============================
// توليد الكود الوطني
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
    const normalizedCity = city.trim();

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

    document.getElementById(sectionId).classList.add("active");

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
}

// ===============================
// تحديث لوحة التحكم
// ===============================

function updateDashboard() {
    const totalFacilities = facilities.length;

    const totalRooms = facilities.reduce((sum, item) => {
        return sum + Number(item.rooms || 0);
    }, 0);

    const totalBeds = facilities.reduce((sum, item) => {
        return sum + Number(item.beds || 0);
    }, 0);

    const activeLicenses = facilities.filter(item => {
        return item.licenseStatus === "Active";
    }).length;

    document.getElementById("totalFacilities").textContent = totalFacilities;
    document.getElementById("totalRooms").textContent = totalRooms;
    document.getElementById("totalBeds").textContent = totalBeds;
    document.getElementById("activeLicenses").textContent = activeLicenses;
}

// ===============================
// عرض سجل المرافق
// ===============================

function renderFacilitiesTable() {
    const tableBody = document.getElementById("facilitiesTable");
    tableBody.innerHTML = "";

    if (facilities.length === 0) {
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
    const type = document.getElementById("facilityType").value;

    document.getElementById("hotelFields").classList.add("hidden");
    document.getElementById("villageResortFields").classList.add("hidden");
    document.getElementById("apartmentsFields").classList.add("hidden");
    document.getElementById("hostelFields").classList.add("hidden");

    if (type === "فندق") {
        document.getElementById("hotelFields").classList.remove("hidden");
    }

    if (type === "قرية سياحية" || type === "منتجع") {
        document.getElementById("villageResortFields").classList.remove("hidden");
    }

    if (type === "شقق فندقية") {
        document.getElementById("apartmentsFields").classList.remove("hidden");
    }

    if (type === "نزل") {
        document.getElementById("hostelFields").classList.remove("hidden");
    }
}

// ===============================
// الخريطة
// ===============================

function initMap() {
    if (map !== null) {
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
    document.getElementById("latitude").value = lat.toFixed(6);
    document.getElementById("longitude").value = lng.toFixed(6);
}

function updateMarker(lat, lng, zoom = 15) {
    if (!map || !marker) {
        return;
    }

    const facilityName = document.getElementById("facilityName").value || "المرفق الجديد";

    marker.setLatLng([lat, lng]);
    marker.bindPopup(`موقع ${facilityName}`).openPopup();
    map.setView([lat, lng], zoom);
}

function updateMapFromInputs() {
    const lat = parseFloat(document.getElementById("latitude").value);
    const lng = parseFloat(document.getElementById("longitude").value);

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
        capacity.suites = Number(document.getElementById("suitesCount").value || 0);
        capacity.rooms = Number(document.getElementById("roomsCount").value || 0);
        capacity.beds = Number(document.getElementById("bedsCount").value || 0);
        capacity.local_workers = Number(document.getElementById("localWorkers").value || 0);
        capacity.foreign_workers = Number(document.getElementById("foreignWorkers").value || 0);
    }

    if (type === "قرية سياحية" || type === "منتجع") {
        capacity.chalets = Number(document.getElementById("chaletsCount").value || 0);
        capacity.rooms = Number(document.getElementById("vrRoomsCount").value || 0);
        capacity.beds = Number(document.getElementById("vrBedsCount").value || 0);
        capacity.extras = document.getElementById("villageResortExtras").value.trim();
    }

    if (type === "شقق فندقية") {
        capacity.apartments = Number(document.getElementById("apartmentsCount").value || 0);
        capacity.rooms = Number(document.getElementById("apRoomsCount").value || 0);
        capacity.beds = Number(document.getElementById("apBedsCount").value || 0);
    }

    if (type === "نزل") {
        capacity.rooms = Number(document.getElementById("hsRoomsCount").value || 0);
        capacity.beds = Number(document.getElementById("hsBedsCount").value || 0);
        capacity.local_workers = Number(document.getElementById("hsLocalWorkers").value || 0);
        capacity.foreign_workers = Number(document.getElementById("hsForeignWorkers").value || 0);
    }

    return capacity;
}

// ===============================
// إضافة مرفق جديد
// ===============================

function handleFacilitySubmit(event) {
    event.preventDefault();

    const facilityName = document.getElementById("facilityName").value.trim();
    const facilityType = document.getElementById("facilityType").value;
    const facilityMunicipality = document.getElementById("facilityMunicipality").value.trim();
    const facilityCity = document.getElementById("facilityCity").value.trim();
    const facilityAddress = document.getElementById("facilityAddress").value.trim();

    if (!facilityName || !facilityMunicipality || !facilityCity || !facilityAddress) {
        alert("يرجى إدخال اسم المرفق والبلدية والمدينة والعنوان");
        return;
    }

    const latitudeValue = document.getElementById("latitude").value;
    const longitudeValue = document.getElementById("longitude").value;

    const capacity = getCapacityByType(facilityType);

    const newFacility = {
        id: facilities.length + 1,
        facility_code: generateFacilityCode(facilityType, facilityCity),

        name: facilityName,
        type: facilityType,
        municipality: facilityMunicipality,
        city: facilityCity,
        address: facilityAddress,

        owner_name: document.getElementById("ownerName").value.trim(),
        operator_name: document.getElementById("operatorName").value.trim(),
        manager_name: document.getElementById("managerName").value.trim(),
        phone: document.getElementById("facilityPhone").value.trim(),
        email: document.getElementById("facilityEmail").value.trim(),
        website: document.getElementById("facilityWebsite").value.trim(),

        classification: document.getElementById("classification").value,
        affiliation: document.getElementById("facilityAffiliation").value,
        status: document.getElementById("facilityStatus").value,
        licenseStatus: document.getElementById("licenseStatus").value,
        establishment_date: document.getElementById("establishmentDate").value,

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

    alert(`تم حفظ المرفق بنجاح\nالكود الوطني: ${newFacility.facility_code}`);

    document.getElementById("facilityForm").reset();
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
// ربط الأحداث
// ===============================

function bindEvents() {
    document.getElementById("loginForm").addEventListener("submit", function(event) {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value.trim();

        if (email === demoUser.email && password === demoUser.password) {
            localStorage.setItem("tas_logged_in", "true");
            showApp();
            updateDashboard();
            renderFacilitiesTable();
        } else {
            alert("بيانات الدخول غير صحيحة");
        }
    });

    document.getElementById("facilityForm").addEventListener("submit", handleFacilitySubmit);

    document.getElementById("facilityType").addEventListener("change", toggleFacilityFields);

    document.getElementById("latitude").addEventListener("input", updateMapFromInputs);
    document.getElementById("longitude").addEventListener("input", updateMapFromInputs);
}

// ===============================
// تشغيل النظام
// ===============================

bindEvents();
toggleFacilityFields();
checkLoginStatus();
loadFacilitiesData();