const calendarElement = document.getElementById('calendar');
const predictionText = document.getElementById('prediction');

// Fetch stored cycles from local storage or start with an empty array
let cycles = JSON.parse(localStorage.getItem('periodCycles')) || [];

function saveCycle(selectedDates) {
    if (selectedDates.length === 2) {
        const start = selectedDates[0];
        const end = selectedDates[1];
        
        cycles.push({ start: start.toISOString(), end: end.toISOString() });
        // Keep them sorted by date
        cycles.sort((a, b) => new Date(a.start) - new Date(b.start));
        
        localStorage.setItem('periodCycles', JSON.stringify(cycles));
        updatePrediction();
        
        fp.clear(); // Clear the active selection so custom colors show
        fp.redraw();
    }
}

function calculatePrediction() {
    if (cycles.length === 0) return null;
    
    const defaultCycleLength = 28;
    let avgCycle = defaultCycleLength;

    // If there is more than 1 cycle, calculate the real average
    if (cycles.length > 1) {
        let totalDays = 0;
        for (let i = 1; i < cycles.length; i++) {
            const prev = new Date(cycles[i-1].start);
            const curr = new Date(cycles[i].start);
            const diffTime = Math.abs(curr - prev);
            totalDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        avgCycle = Math.round(totalDays / (cycles.length - 1));
    }

    // Add average cycle length to the most recent start date
    const lastStart = new Date(cycles[cycles.length - 1].start);
    const predictedStart = new Date(lastStart);
    predictedStart.setDate(predictedStart.getDate() + avgCycle);
    
    return predictedStart;
}

function updatePrediction() {
    const nextStart = calculatePrediction();
    if (nextStart) {
        predictionText.textContent = nextStart.toDateString();
    } else {
        predictionText.textContent = "Log a cycle to start";
    }
}

// Initialize the Flatpickr Calendar
const fp = flatpickr(calendarElement, {
    mode: "range",
    inline: true, // Shows the calendar open permanently
    onChange: function(selectedDates) {
        if(selectedDates.length === 2) {
            if(confirm("Log this date range as a period cycle?")) {
                saveCycle(selectedDates);
            } else {
                fp.clear();
            }
        }
    },
    onDayCreate: function(dObj, dStr, fp, dayElem) {
        const date = dayElem.dateObj;
        
        // 1. Highlight past logged cycles
        cycles.forEach(cycle => {
            const start = new Date(cycle.start);
            const end = new Date(cycle.end);
            start.setHours(0,0,0,0);
            end.setHours(0,0,0,0);
            
            if (date >= start && date <= end) {
                dayElem.classList.add('logged-period');
            }
        });

        // 2. Highlight predicted next cycle (assuming 5 days long)
        const nextStart = calculatePrediction();
        if (nextStart) {
            const nextEnd = new Date(nextStart);
            nextEnd.setDate(nextEnd.getDate() + 4); 
            nextStart.setHours(0,0,0,0);
            nextEnd.setHours(0,0,0,0);
            
            if (date >= nextStart && date <= nextEnd) {
                dayElem.classList.add('predicted-period');
            }
        }
    }
});

// Handle the clear button
document.getElementById('clearBtn').addEventListener('click', () => {
    if(confirm("Are you sure you want to delete all stored cycles? This cannot be undone.")) {
        cycles = [];
        localStorage.removeItem('periodCycles');
        updatePrediction();
        fp.redraw();
    }
});

// Run this once when the page loads
updatePrediction();