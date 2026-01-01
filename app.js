// ---------------------------------------------------------
// YOUR SPECIFIC GOOGLE SCRIPT URL
// ---------------------------------------------------------
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz5BsGWSqCIosj6ZN3edbmbMXHNnNLEAzdwajZ2ru1pjAg-RusNo3O7bOuQXvf9_7k4/exec"; 
// ---------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 1. SELECT DOM ELEMENTS
    const form = document.getElementById('entryForm');
    const submitBtn = document.getElementById('submitBtn');
    const statusMsg = document.getElementById('statusMsg');
    
    const inpName = document.getElementById('inpName');
    const inpDate = document.getElementById('inpDate');
    const inpShift = document.getElementById('inpShift');
    const inpAmount = document.getElementById('inpAmount');
    
    const dispAmount = document.getElementById('dispAmount');
    const dispCount = document.getElementById('dispCount');
    
    const totalAEl = document.getElementById('totalA');
    const totalBEl = document.getElementById('totalB');
    const totalCEl = document.getElementById('totalC');

    const tableBody = document.querySelector('#logTable tbody');
    const btnUndo = document.getElementById('btnUndo');
    const btnCsv = document.getElementById('btnCsv');
    const btnReset = document.getElementById('btnReset');

    // 2. INITIALIZE STATE
    // Load local data first for instant loading
    let entries = JSON.parse(localStorage.getItem('fireOpsData_v3')) || [];
    
    // Set default date to today
    if (inpDate) inpDate.value = new Date().toISOString().split('T')[0];
    
    // Render immediately so the user sees something while syncing
    render();

    // 3. START SYNC (DOWNLOAD FROM CLOUD)
    fetchCloudData();

    // ---------------------------------------------------------
    // CORE FUNCTIONS
    // ---------------------------------------------------------

    function fetchCloudData() {
        if (!GOOGLE_SCRIPT_URL) return;
        
        // Show user we are working
        statusMsg.textContent = "Syncing...";
        statusMsg.className = "status-syncing";

        // GET request to Google Script
        fetch(GOOGLE_SCRIPT_URL)
            .then(response => {
                if (!response.ok) throw new Error("Network response was not ok");
                return response.json();
            })
            .then(data => {
                // Check if we got a valid array
                if (Array.isArray(data)) {
                    // Update our local list with the Cloud list
                    entries = data; 
                    save(true); // Save to local storage (skip render, we do it next)
                    render();   // Update the UI
                    
                    statusMsg.textContent = "✔ Synced";
                    statusMsg.className = "status-success";
                    setTimeout(() => { statusMsg.textContent = ""; }, 2000);
                }
            })
            .catch(err => {
                console.log("Sync Error (Likely Offline):", err);
                statusMsg.textContent = "⚠ Offline Mode";
                statusMsg.className = "status-error";
            });
    }

    function save(skipRender) {
        localStorage.setItem('fireOpsData_v3', JSON.stringify(entries));
        if (!skipRender) render();
    }

    function render() {
        tableBody.innerHTML = '';
        let total = 0;
        let sumA = 0;
        let sumB = 0;
        let sumC = 0;

        // Clone array and reverse it so newest is at top
        entries.slice().reverse().forEach(item => {
            const amt = Number(item.amount);
            total += amt;

            // Shift calculation logic
            const s = (item.shift || "").toLowerCase();
            if (s.includes('a')) sumA += amt;
            else if (s.includes('b')) sumB += amt;
            else if (s.includes('c')) sumC += amt;

            // Create table row
            const row = `<tr>
                <td>${item.date}</td>
                <td>${item.name}</td>
                <td>${item.shift}</td>
                <td>$${amt.toFixed(2)}</td>
            </tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);
        });

        // Update Dashboard Stats
        if(dispAmount) dispAmount.textContent = '$' + total.toFixed(2);
        if(dispCount) dispCount.textContent = entries.length;

        if(totalAEl) totalAEl.textContent = '$' + sumA.toFixed(0);
        if(totalBEl) totalBEl.textContent = '$' + sumB.toFixed(0);
        if(totalCEl) totalCEl.textContent = '$' + sumC.toFixed(0);
    }

    // ---------------------------------------------------------
    // EVENT LISTENERS
    // ---------------------------------------------------------

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving...";
        statusMsg.textContent = "Uploading...";
        statusMsg.className = "status-syncing";

        const newEntry = {
            id: Date.now(), // Temporary local ID
            name: inpName.value,
            date: inpDate.value,
            shift: inpShift.value,
            amount: inpAmount.value
        };

        // Prepare data for upload
        const formData = new URLSearchParams();
        formData.append("date", newEntry.date);
        formData.append("name", newEntry.name);
        formData.append("shift", newEntry.shift);
        formData.append("amount", newEntry.amount);

        // POST to Google Sheet
        fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",