// ===============================
// بيانات المستخدم التجريبي
// ===============================

const demoUser = {
    email: "admin@tourism.gov.ly",
    password: "admin123",
    name: "مدير النظام"
};

// ===============================
// بيانات المرافق
// ===============================

let facilities = [];

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

// معالجة تسجيل الدخول
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

// ===============================
// تحميل بيانات المرافق من JSON
// ===============================

async function loadFacilitiesData() {
    try {
 const response = await fetch('data/facilities.json');

        if (!response.ok) {
            throw new Error("لم يتم العثور على ملف البيانات");
        }

        facilities = await response.json();

        updateDashboard();
        renderFacilitiesTable();
    } catch (error) {
        console.error("خطأ في تحميل بيانات المرافق:", error);
        alert("تعذر تحميل بيانات المرافق");
    }
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
    if (city === "طرابلس") return "TRP";
    if (city === "بنغازي") return "BEN";
    if (city === "مصراتة") return "MIS";
    if (city === "الخمس") return "KHM";
    if (city === "زوارة") return "ZWR";
    if (city === "شحات") return "SHA";
    if (city === "سبها") return "SEB";
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
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    document.getElementById(sectionId).classList.add('active');

    if (sectionId === 'dashboard') {
        updateDashboard();
    }

    if (sectionId === 'facilities') {
        renderFacilitiesTable();
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

    document.getElementById('totalFacilities').textContent = totalFacilities;
    document.getElementById('totalRooms').textContent = totalRooms;
    document.getElementById('totalBeds').textContent = totalBeds;
    document.getElementById('activeLicenses').textContent = activeLicenses;
}

// ===============================
// عرض سجل المرافق
// ===============================

function renderFacilitiesTable() {
    const tableBody = document.getElementById('facilitiesTable');
    tableBody.innerHTML = "";

    facilities.forEach(item => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${item.facility_code || '-'}</td>
            <td>${item.name}</td>
            <td>${item.type}</td>
            <td>${item.city}</td>
            <td>${item.rooms}</td>
            <td>${item.beds}</td>
            <td>${item.classification}</td>
        `;

        tableBody.appendChild(row);
    });
}

// ===============================
// إضافة مرفق جديد
// ===============================

document.getElementById('facilityForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const facilityName = document.getElementById('facilityName').value.trim();
    const facilityType = document.getElementById('facilityType').value;
    const facilityCity = document.getElementById('facilityCity').value.trim();
    const roomsCount = Number(document.getElementById('roomsCount').value || 0);
    const bedsCount = Number(document.getElementById('bedsCount').value || 0);
    const classification = document.getElementById('classification').value;

    if (!facilityName || !facilityCity) {
        alert("يرجى إدخال اسم المرفق والمدينة");
        return;
    }

    const newFacility = {
        id: facilities.length + 1,
        facility_code: generateFacilityCode(facilityType, facilityCity),
        name: facilityName,
        type: facilityType,
        city: facilityCity,
        rooms: roomsCount,
        beds: bedsCount,
        classification: classification,
        licenseStatus: "Active"
    };

    facilities.push(newFacility);

    alert(`تم حفظ المرفق بنجاح\nالكود الوطني: ${newFacility.facility_code}`);

    document.getElementById('facilityForm').reset();

    updateDashboard();
    renderFacilitiesTable();
    showSection('facilities');
});

// ===============================
// تشغيل النظام عند فتح الصفحة
// ===============================

checkLoginStatus();
loadFacilitiesData();