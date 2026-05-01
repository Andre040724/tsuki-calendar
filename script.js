const calendarElement = document.getElementById('calendar');
const predictionText = document.getElementById('prediction');
const currentPhaseText = document.getElementById('currentPhaseText');

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

    // 1. Calculate Average Period Duration
    let totalDurationDays = 0;
    cycles.forEach(cycle => {
        const s = new Date(cycle.start);
        const e = new Date(cycle.end);
        totalDurationDays += Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1; 
    });
    avgDuration = Math.round(totalDurationDays / cycles.length);

    // 2. Calculate Weighted Average for Cycle Gap
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
        avgCycleGap = Math.round(totalWeightedDays / totalWeights);
    }

    // Add the calculated gap to the most recent start date
    const lastStart = new Date(cycles[cycles.length - 1].start);
    const predictedStart = new Date(lastStart);
    predictedStart.setDate(predictedStart.getDate() + avgCycleGap);
    
    return { 
        start: predictedStart, 
        duration: avgDuration, 
        gap: avgCycleGap,
        lastStart: lastStart
    };
}

function updatePrediction() {
    const prediction = calculatePrediction();
    
    if (prediction) {
        // Display the date and expected duration
        predictionText.innerHTML = `${prediction.start.toDateString()} <br><span style="font-size: 13px; color: #7b7b7b; font-weight: 400;">(Expected length: ${prediction.duration} days)</span>`;
        
        // Calculate what phase she is in TODAY
        const today = new Date();
        today.setHours(0,0,0,0);
        const lastStart = new Date(prediction.lastStart);
        lastStart.setHours(0,0,0,0);
        
        const daysSinceLastStart = Math.floor((today - lastStart) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastStart >= 0 && daysSinceLastStart < prediction.gap) {
            const ovulationDay = prediction.gap - 14; 
            
            if (daysSinceLastStart < prediction.duration) {
                currentPhaseText.textContent = "Current Phase: Menstruation (Rest & Recover)";
            } else if (daysSinceLastStart < ovulationDay - 2) {
                currentPhaseText.textContent = "Current Phase: Follicular (Rising Energy)";
            } else if (daysSinceLastStart >= ovulationDay - 2 && daysSinceLastStart <= ovulationDay + 1) {
                currentPhaseText.textContent = "Current Phase: Ovulation (Peak Energy)";
            } else {
                currentPhaseText.textContent = "Current Phase: Luteal (Winding Down / PMS)";
            }
        } else {
            currentPhaseText.textContent = "Current Phase: Awaiting Next Cycle...";
        }

    } else {
        predictionText.textContent = "Log a cycle to start";
        currentPhaseText.textContent = "Log a cycle to see your current phase";
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
            
            const cycleIndex = cycles.findIndex(cycle => {
                const start = new Date(cycle.start);
                const end = new Date(cycle.end);
                start.setHours(0,0,0,0);
                end.setHours(0,0,0,0);
                return clickedDate >= start && clickedDate <= end;
            });

            if (cycleIndex !== -1) {
                if (confirm("Do you want to remove this marked cycle?")) {
                    cycles.splice(cycleIndex, 1); 
                    localStorage.setItem('periodCycles', JSON.stringify(cycles)); 
                    updatePrediction();
                    instance.clear(); 
                    instance.redraw(); 
                } else {
                    instance.clear(); 
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
        const prediction = calculatePrediction();
        
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

        if (prediction) {
            const nextStart = new Date(prediction.start);
            const lastStart = new Date(prediction.lastStart);
            nextStart.setHours(0,0,0,0);
            lastStart.setHours(0,0,0,0);

            // Color code the current cycle's phases
            if (date > lastStart && date < nextStart) {
                const isLoggedPeriod = cycles.some(cycle => {
                    const s = new Date(cycle.start);
                    const e = new Date(cycle.end);
                    s.setHours(0,0,0,0);
                    e.setHours(0,0,0,0);
                    return date >= s && date <= e;
                });

                if (!isLoggedPeriod) {
                    const daysSinceStart = Math.floor((date - lastStart) / (1000 * 60 * 60 * 24));
                    const ovulationDay = prediction.gap - 14;

                    if (daysSinceStart < ovulationDay - 2) {
                        dayElem.classList.add('phase-follicular');
                    } else if (daysSinceStart >= ovulationDay - 2 && daysSinceStart <= ovulationDay + 1) {
                        dayElem.classList.add('phase-ovulation');
                    } else if (daysSinceStart > ovulationDay + 1) {
                        dayElem.classList.add('phase-luteal');
                    }
                }
            }

            // Highlight predicted next period
            const nextEnd = new Date(nextStart);
            nextEnd.setDate(nextEnd.getDate() + prediction.duration - 1); 
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
