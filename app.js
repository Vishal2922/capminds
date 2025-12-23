// ==================== 1. DOM ELEMENTS ====================
const calendarView = document.getElementById("calendarView");
const dashboardView = document.getElementById("dashboardView");
const calendarGrid = document.getElementById("calendarGrid");
const currentDateEl = document.getElementById("currentDate");
const tableBody = document.getElementById("appointmentTableBody");

const searchPatient = document.getElementById("searchPatient");
const searchDoctor = document.getElementById("searchDoctor");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const applyFiltersBtn = document.getElementById("applyFilters");
const resetFiltersBtn = document.getElementById("resetFilters");

const modal = document.getElementById("modal");
const openModalBtn = document.getElementById("openModal");
const closeModalBtn = document.getElementById("closeModal");
const closeModal2Btn = document.getElementById("closeModal2");
const saveBtn = document.getElementById("saveAppointment");

const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");
const patientInput = document.getElementById("patient");
const doctorInput = document.getElementById("doctor");
const hospitalInput = document.getElementById("hospital");
const specialtyInput = document.getElementById("specialty");
const reasonInput = document.getElementById("reason");

const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const todayBtn = document.getElementById("today");
const monthSelect = document.getElementById("monthSelect");

const navItems = document.querySelectorAll(".nav-item");

const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("toggleSidebar");

toggleBtn.onclick = () => {
  sidebar.classList.toggle("collapsed");
};

// ==================== 2. STATE MANAGEMENT ====================
let appointments = JSON.parse(localStorage.getItem("appointments")) || {};
let editingId = null;

let currentCalendarDate = new Date();

// ==================== 3. VIEW NAVIGATION ====================
navItems.forEach(item => {
  item.onclick = () => {
    navItems.forEach(nav => nav.classList.remove("active"));
    item.classList.add("active");

    const view = item.dataset.view;

    if (view === "calendar") {
      calendarView.style.display = "block";
      dashboardView.style.display = "none";
      renderCalendar();
    } else if (view === "dashboard") {
      calendarView.style.display = "none";
      dashboardView.style.display = "block";
      renderTable();
    }
  };
});

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

monthNames.forEach((name, index) => {
  const option = document.createElement("option");
  option.value = index; 
  option.innerText = name;
  monthSelect.appendChild(option);
});

monthSelect.onchange = (e) => {
  const selectedMonthIndex = parseInt(e.target.value);
  currentCalendarDate.setMonth(selectedMonthIndex);
  renderCalendar();
};

// ==================== 4. CALENDAR LOGIC ====================
function renderCalendar() {
  calendarGrid.innerHTML = "";
  
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  monthSelect.value = month; 
  currentDateEl.innerText = currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const firstDayIndex = new Date(year, month, 1).getDay(); 
  const lastDateOfMonth = new Date(year, month + 1, 0).getDate(); 
  const lastDateOfPrevMonth = new Date(year, month, 0).getDate(); 
  const nextDays = 7 - new Date(year, month, lastDateOfMonth).getDay() - 1; 

  for (let x = firstDayIndex; x > 0; x--) {
    const dayNum = lastDateOfPrevMonth - x + 1;
    const cell = document.createElement("div");
    cell.className = "day inactive"; 
    cell.innerHTML = `<strong>${dayNum}</strong>`;
    calendarGrid.appendChild(cell);
  }

  for (let d = 1; d <= lastDateOfMonth; d++) {
    const cell = document.createElement("div");
    cell.className = "day";
    cell.innerHTML = `<strong>${d}</strong>`; 

    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    if (appointments[dateKey]) {
      appointments[dateKey].forEach(appt => {
        const card = document.createElement("div");
        card.className = "event-card";
        const timeDisplay = formatTimeRange(appt.time);

        card.innerHTML = `
          <div class="event-info">
            <div class="event-header">
               <img src="assets/userpatient.png" class="icon-patient" alt="user"> 
               <span style="font-weight:bold;">${appt.name}</span>
            </div>
            <div style="font-size:10px; margin-left:16px; opacity:0.9; margin-bottom:2px;">
               ${appt.doctor || "General Doctor"}
            </div>
            <div class="event-time">${timeDisplay}</div>
          </div>
          <div class="event-actions">
            <img src="assets/edit.png" class="icon-action edit-btn" title="Edit">
            <img src="assets/delete.png" class="icon-action delete-btn" title="Delete">
            <img src="assets/view.png" class="icon-action view-btn" title="Export to CSV">
          </div>
        `;
        
        card.querySelector(".edit-btn").onclick = (e) => { e.stopPropagation(); openEditModal(dateKey, appt); };
        card.querySelector(".delete-btn").onclick = (e) => { e.stopPropagation(); deleteAppointment(dateKey, appt.id); };
    
        card.querySelector(".view-btn").onclick = (e) => { 
          e.stopPropagation(); 
          exportSingleAppointment(appt, dateKey); 
        };
        
        cell.appendChild(card);
      });
    }
    calendarGrid.appendChild(cell);
  }
  for (let j = 1; j <= nextDays; j++) {
    const cell = document.createElement("div");
    cell.className = "day inactive";
    cell.innerHTML = `<strong>${j}</strong>`;
    calendarGrid.appendChild(cell);
  }
}

// ==================== CALENDAR BUTTONS (FIXED) ====================

prevBtn.onclick = () => {
  currentCalendarDate.setDate(1); // Safety fix for 31st
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
  renderCalendar();
};

nextBtn.onclick = () => {
  currentCalendarDate.setDate(1); 
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
  renderCalendar();
};

todayBtn.onclick = () => {
  currentCalendarDate = new Date();
  renderCalendar();
};

// ==================== 5. DASHBOARD & FILTERS ====================
function getFilteredAppointments() {
  const pQuery = searchPatient.value.toLowerCase().trim();
  const dQuery = searchDoctor.value.toLowerCase().trim();

  const start = startDateInput.value ? new Date(startDateInput.value) : null;
  const end = endDateInput.value ? new Date(endDateInput.value) : null;

  let filteredList = [];

  Object.keys(appointments).forEach(dateKey => {
    const apptDate = new Date(dateKey);

    if (start && apptDate < start) return;
    if (end && apptDate > end) return;

    const matches = appointments[dateKey].filter(appt => {
      const patientName = (appt.name || "").toLowerCase();
      const doctorName = (appt.doctor || "").toLowerCase();
      const pMatch = patientName.includes(pQuery);
      const dMatch = doctorName.includes(dQuery);
      return pMatch && dMatch;
    });

    matches.forEach(m => filteredList.push({ ...m, date: dateKey }));
  });

  return filteredList;
}

function formatTimeRange(timeStr) {
  if (!timeStr) return "";
  const [hourStr, minStr] = timeStr.split(":");
  let hour = parseInt(hourStr);
  let min = parseInt(minStr);

  const startDate = new Date();
  startDate.setHours(hour, min);

  const endDate = new Date(startDate);
  endDate.setMinutes(min + 15);

  const formatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  const startText = startDate.toLocaleTimeString('en-US', formatOptions);
  const endText = endDate.toLocaleTimeString('en-US', formatOptions);

  return `${startText} - ${endText}`;
}

function renderTable() {
  tableBody.innerHTML = "";
  const data = getFilteredAppointments();

  if (data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">No appointments found</td></tr>`;
    return;
  }

  data.forEach(appt => {
    const row = document.createElement("tr");
    const timeDisplay = formatTimeRange(appt.time);

    row.innerHTML = `
      <td class="text-light-blue">${appt.name}</td>
      <td class="text-light-blue">${appt.doctor || "General Doctor"}</td>
      <td style="color:#555;">${appt.hospital || "-"}</td>
      <td style="color:#555;">${appt.specialty || "-"}</td>
      <td style="color:#555;">${appt.date}</td>
      <td class="text-light-blue" style="font-size: 13px;">${timeDisplay}</td>
      <td>
        <img src="assets/edit.png" class="icon-action edit-icon" 
             onclick="openEditModal('${appt.date}', ${appt.id})" 
             title="Edit" style="margin-right:8px;">
        <img src="assets/delete.png" class="icon-action delete-icon" 
             onclick="deleteAppointment('${appt.date}', ${appt.id})" 
             title="Delete">
      </td>
    `;
    tableBody.appendChild(row);
  });
}

applyFiltersBtn.onclick = renderTable;
resetFiltersBtn.onclick = () => {
  searchPatient.value = "";
  searchDoctor.value = "";
  startDateInput.value = "";
  endDateInput.value = "";
  renderTable();
};

// ==================== 6. MODAL & CRUD ====================
openModalBtn.onclick = () => {
  editingId = null;
  saveBtn.innerText = "Save";
  patientInput.value = ""; dateInput.value = ""; timeInput.value = ""; reasonInput.value = "";
  if (doctorInput) doctorInput.selectedIndex = 0;
  if (hospitalInput) hospitalInput.selectedIndex = 0;
  if (specialtyInput) specialtyInput.selectedIndex = 0;
  modal.style.display = "flex";
};

window.openEditModal = function (dateKey, idOrAppt) {
  let appt;

  if (typeof idOrAppt === "object") {
    appt = idOrAppt;
  } else {
    if (appointments[dateKey]) {
      appt = appointments[dateKey].find(a => a.id === idOrAppt);
    }
  }

  if (!appt) {
    console.error("Appointment data not found for edit");
    return;
  }

  editingId = appt.id;
  saveBtn.innerText = "Update";

  patientInput.value = appt.name || "";
  dateInput.value = dateKey; 
  timeInput.value = appt.time || "";
  reasonInput.value = appt.reason || "";

  if (doctorInput) doctorInput.value = appt.doctor || "";
  if (hospitalInput) hospitalInput.value = appt.hospital || "";
  if (specialtyInput) specialtyInput.value = appt.specialty || "";

  modal.style.display = "flex";
};

function exportSingleAppointment(appt, dateKey) {
  const headers = ["Patient Name", "Doctor", "Date", "Time", "Hospital", "Specialty", "Reason"];
  const row = [
    appt.name,
    appt.doctor || "General Doctor",
    dateKey,
    appt.time,
    appt.hospital || "General",
    appt.specialty || "General",
    appt.reason || "N/A"
  ];

  const csvContent = "data:text/csv;charset=utf-8," 
    + headers.join(",") + "\n" 
    + row.join(",");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${appt.name}_${dateKey}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

saveBtn.onclick = () => {
  const patient = patientInput.value;
  const date = dateInput.value;
  const time = timeInput.value;

  let doctor = doctorInput ? doctorInput.value : "";
  let hospital = hospitalInput ? hospitalInput.value : "";
  let specialty = specialtyInput ? specialtyInput.value : "";
  let reason = reasonInput ? reasonInput.value : "";

  if (!patient || !date || !time) {
    alert("Please fill in all required fields (Name, Date, Time).");
    return;
  }

  const selectedDateTime = new Date(`${date}T${time}`);
  const now = new Date();

  if (selectedDateTime < now) {
    alert("Invalid Date/Time: You cannot book an appointment in the past.\nPlease select a future date and time.");
    return; 
  }

  if (!appointments[date]) appointments[date] = [];

  if (editingId) {
    Object.keys(appointments).forEach(key => {
      appointments[key] = appointments[key].filter(a => a.id !== editingId);
    });
  }

  appointments[date].push({
    id: editingId || Date.now(),
    name: patient, doctor, hospital, specialty, reason, time
  });

  localStorage.setItem("appointments", JSON.stringify(appointments));

  closeModalLogic();
  if (dashboardView.style.display === "block") renderTable();
  else renderCalendar();
};

window.deleteAppointment = function (dateKey, id) {
  if (confirm("Delete this appointment?")) {
    appointments[dateKey] = appointments[dateKey].filter(appt => appt.id !== id);
    localStorage.setItem("appointments", JSON.stringify(appointments));
    if (dashboardView.style.display === "block") renderTable();
    else renderCalendar();
  }
};

window.viewPatientProfile = function (data) {
  const name = typeof data === 'object' ? data.name : data;
  alert(`Viewing profile for: ${name}`);
};

function closeModalLogic() { modal.style.display = "none"; }
closeModalBtn.onclick = closeModal2Btn.onclick = closeModalLogic;

renderCalendar();