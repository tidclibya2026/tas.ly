let facilities = [];

async function loadFacilitiesData() {
    try {
        const response = await fetch('../data/facilities.json');
        facilities = await response.json();

        updateDashboard();
        renderFacilitiesTable();
    } catch (error) {
        console.error("خطأ في تحميل بيانات المرافق:", error);
        alert("تعذر تحميل بيانات المرافق");
    }
}

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

function updateDashboard() {
    const totalFacilities = facilities.length;
    const totalRooms = facilities.reduce((sum, item) => sum + Number(item.rooms || 0), 0);
    const totalBeds = facilities.reduce((sum, item) => sum + Number(item.beds || 0), 0);
    const activeLicenses = facilities.filter(item => item.licenseStatus === "Active").length;

    document.getElementById('totalFacilities').textContent = totalFacilities;
    document.getElementById('totalRooms').textContent = totalRooms;
    document.getElementById('totalBeds').textContent = totalBeds;
    document.getElementById('activeLicenses').textContent = activeLicenses;
}

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

document.getElementById('facilityForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const facilityType = document.getElementById('facilityType').value;
    const facilityCity = document.getElementById('facilityCity').value;

    const newFacility = {
        id: facilities.length + 1,
        facility_code: generateFacilityCode(facilityType, facilityCity),
        name: document.getElementById('facilityName').value,
        type: facilityType,
        city: facilityCity,
        rooms: Number(document.getElementById('roomsCount').value || 0),
        beds: Number(document.getElementById('bedsCount').value || 0),
        classification: document.getElementById('classification').value,
        licenseStatus: "Active"
    };

    facilities.push(newFacility);

    alert(`تم حفظ المرفق بنجاح\nالكود الوطني: ${newFacility.facility_code}`);

    document.getElementById('facilityForm').reset();

    updateDashboard();
    renderFacilitiesTable();
    showSection('facilities');
});

loadFacilitiesData();