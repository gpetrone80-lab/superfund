// ---------------------------------------------------------
// YOUR SPECIFIC GOOGLE SCRIPT URL
// ---------------------------------------------------------
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYuO3pbIAhk93DGmAY1ARLIyVYbkqnW1ir--zcNO5cwyPde3wp5q7y4iPF7f5cS0_a/exec"; 
// ---------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
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

    let entries = JSON.parse(localStorage.getItem('fireOpsData_v3')) || [];
    
    // Set default date safely
    if (inpDate) inpDate.value = new Date().toISOString().split('T')[0];
    
    render();

    function save() {
        localStorage.setItem('fireOpsData_v3', JSON.stringify(entries));
        render();
    }

    function render() {
        tableBody.innerHTML = '';
        let total = 0;
        let sumA = 0;
        let sumB = 0;
        let sumC = 0;

        entries.slice().reverse().forEach(item => {
            const amt = Number(item.amount);
            total += amt;

            const s = item.shift.toLowerCase();
            if (s.includes('a')) sumA += amt;
            else if (s.includes('b')) sumB += amt;
            else if (s.includes('c')) sumC += amt;

            const row = `<tr>
                <td>${item.date}</td>
                <td>${item.name}</td>
                <td>${item.shift}</td>
                <td>$${amt.toFixed(2)}</td>
            </tr>`;
            tableBody.insertAdjacentHTML('beforeend', row);
        });

        if(dispAmount) dispAmount.textContent = '$' + total.toFixed(2);
        if(dispCount) dispCount.textContent = entries.length;

        if(totalAEl) totalAEl.textContent = '$' + sumA.toFixed(0);
        if(totalBEl) totalBEl.textContent = '$' + sumB.toFixed(0);
        if(totalCEl) totalCEl.textContent = '$' + sumC.toFixed(0);
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("PASTE_YOUR")) {
            alert("⚠️ Error: Check Script URL in app.js");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Syncing...";
        statusMsg.textContent = "Uploading...";
        statusMsg.className = "status-syncing";

        const newEntry = {
            id: Date.now(),
            name: inpName.value,
            date: inpDate.value,
            shift: inpShift.value,
            amount: inpAmount.value
        };

        const formData = new URLSearchParams();
        formData.append("date", newEntry.date);
        formData.append("name", newEntry.name);
        formData.append("shift", newEntry.shift);
        formData.append("amount", newEntry.amount);

        fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors", 
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString()
        })
        .then(() => {
            entries.push(newEntry);
            save();
            form.reset();
            inpDate.value = new Date().toISOString().split('T')[0];
            statusMsg.textContent = "✔ Saved";
            statusMsg.className = "status-success";
        })
        .catch(error => {
            console.error('Error:', error);
            statusMsg.textContent = "⚠ Offline Mode";
            statusMsg.className = "status-error";
            entries.push(newEntry);
            save();
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = "ADD ENTRY";
            setTimeout(() => { statusMsg.textContent = ""; }, 3000);
        });
    });

    btnUndo.addEventListener('click', () => {
        if(entries.length === 0) return alert("Nothing to undo.");
        if(confirm("Undo last entry? (Local Only)")) {
            entries.pop();
            save();
        }
    });

    btnCsv.addEventListener('click', () => {
        if(entries.length === 0) return alert("No data to export.");
        let csv = "Date,Name,Shift,Amount\n";
        entries.forEach(row => {
            csv += `${row.date},${row.name.replace(/,/g, " ")},${row.shift.replace(/,/g, " ")},${row.amount}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'fire_log.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    btnReset.addEventListener('click', () => {
        if(confirm("⚠️ DELETE ALL LOCAL DATA?")) {
            entries = [];
            save();
        }
    });
});