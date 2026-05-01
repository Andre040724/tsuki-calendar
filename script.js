const calendarElement = document.getElementById('calendar');
const predictionText = document.getElementById('prediction');

// Fetch stored cycles from local storage or start with an empty array
let cycles = JSON.parse(localStorage.getItem('periodCycles')) || [];

function saveCycle(selectedDates) {
    if (selectedDates.length === 2) {
        const start = selectedDates[0];
        const end = selectedDates[1];
        
        cycles.push({ start: start.toISOString(), end: end.toISOString() });
        // Keep them sorted chronologically by start date
        cycles.sort((a, b) => new Date(a.start) - new Date(b.start));
        
        localStorage.setItem('periodCycles', JSON.stringify(cycles));
        updatePrediction();
        
        fp.clear(); // Clear the active selection so custom colors show
        fp.redraw();
    }
}

function calculatePrediction() {
    if (cycles.length === 0) return null;
    
    let avgCycleGap = 28; // Default fallback
    let avgDuration = 5;  // Default fallback

    // 1. Calculate Average Period Duration (how many days it lasts)
    let totalDurationDays = 0;
    cycles.forEach(cycle => {
        const s = new Date(cycle.start);
        const e = new Date(cycle.end);
        // Add 1 to include both the start and end day in the count
        totalDurationDays += Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1; 
    });
    avgDuration = Math.round(totalDurationDays / cycles.length);

    // 2. Calculate Weighted Average for Cycle Gap (Irregularity Tracking)
    if (cycles.length > 1) {
        let totalWeightedDays = 0;
        let totalWeights = 0;

        for (let i = 1; i < cycles.length; i++) {
            const prevStart = new Date(cycles[i-1].start);
            const currStart = new Date(cycles[i].start);
            const diffTime = Math.abs(currStart - prevStart);
            const cycleLength = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // The weight increases for more recent cycles
            const weight = i; 
            totalWeightedDays += (cycleLength * weight);
            totalWeights += weight;
        }
        // Divide the weighted total by the sum of all weights
        avgCycleGap = Math.round(totalWeightedDays / totalWeights);
    }

    // Add the calculated gap to the most recent start date
    const lastStart = new Date(cycles[cycles.length - 1].start);
    const predictedStart = new Date(lastStart);
    predictedStart.setDate(predictedStart.getDate() + avgCycleGap);
    
    return { start: predictedStart, duration: avgDuration };
}

function updatePrediction() {
    const prediction = calculatePrediction();
    if (prediction) {
        // Display the date and add a small note about the expected duration
        predictionText.innerHTML = `${prediction.start.toDateString()} <br><span style="font-size: 13px; color: #7b7b7b; font-weight: 400;">(Expected length: ${prediction.duration} days)</span>`;
    } else {
        predictionText.textContent = "Log a cycle to start";
    }
}

// Initialize the Flatpickr Calendar
const fp = flatpickr(calendarElement, {
    mode: "range",
    inline: true, 
    onChange: function(selectedDates, dateStr, instance) {
        // Feature: Delete a logged cycle by clicking on it
        if (selectedDates.length === 1) {
            const clickedDate = selectedDates[0];
            clickedDate.setHours(0,0,0,0);
            
            // Check if the clicked date falls within any saved cycle
            const cycleIndex = cycles.findIndex(cycle => {
                const start = new Date(cycle.start);
                const end = new Date(cycle.end);
                start.setHours(0,0,0,0);
                end.setHours(0,0,0,0);
                return clickedDate >= start && clickedDate <= end;
            });

            if (cycleIndex !== -1) {
                // If a match is found, prompt to delete
                if (confirm("Do you want to remove this marked cycle?")) {
                    cycles.splice(cycleIndex, 1); // Remove it from the array
                    localStorage.setItem('periodCycles', JSON.stringify(cycles)); // Update storage
                    updatePrediction();
                    instance.clear(); 
                    instance.redraw(); 
                } else {
                    instance.clear(); // Deselect if they click cancel
                }
            }
        } 
        // Feature: Save a new cycle
        else if (selectedDates.length === 2) {
            if (confirm("Log this date range as a period cycle?")) {
                saveCycle(selectedDates);
            } else {
                instance.clear();
            }
        }
    },
    onDayCreate: function(dObj, dStr, fp, dayElem) {
        const date = dayElem.dateObj;
        
        // Highlight past logged cycles
        cycles.forEach(cycle => {
            const start = new Date(cycle.start);
            const end = new Date(cycle.end);
            start.setHours(0,0,0,0);
            end.setHours(0,0,0,0);
            
            if (date >= start && date <= end) {
                dayElem.classList.add('logged-period');
            }
        });

        // Highlight predicted next cycle
        const prediction = calculatePrediction();
        if (prediction) {
            const nextStart = prediction.start;
            const nextEnd = new Date(nextStart);
            // Subtract 1 because the start day counts as day 1
            nextEnd.setDate(nextEnd.getDate() + prediction.duration - 1); 
            
            nextStart.setHours(0,0,0,0);
            nextEnd.setHours(0,0,0,0);
            
            if (date >= nextStart && date <= nextEnd) {
                dayElem.classList.add('predicted-period');
            }
        }
    }
});

// Handle the clear all button
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
// Run this once when the page loads
updatePrediction();
