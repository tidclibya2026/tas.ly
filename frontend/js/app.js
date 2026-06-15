let facilities = [
    {
        name: "فندق الريان",
        type: "فندق",
        city: "بنغازي",
        rooms: 80,
        beds: 160,
        classification: "ثلاث نجوم",
        licenseStatus: "Active"
    },
    {
        name: "منتجع الماسة",
        type: "منتجع",
        city: "بنغازي",
        rooms: 50,
        beds: 100,
        classification: "أربع نجوم",
        licenseStatus: "Active"
    }
];

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

    const newFacility = {
        name: document.getElementById('facilityName').value,
        type: document.getElementById('facilityType').value,
        city: document.getElementById('facilityCity').value,
        rooms: Number(document.getElementById('roomsCount').value || 0),
        beds: Number(document.getElementById('bedsCount').value || 0),
        classification: document.getElementById('classification').value,
        licenseStatus: "Active"
    };

    facilities.push(newFacility);

    alert("تم حفظ المرفق بنجاح");

    document.getElementById('facilityForm').reset();

    updateDashboard();
    renderFacilitiesTable();
    showSection('facilities');
});

updateDashboard();
renderFacilitiesTable();