const calendarElement = document.getElementById('calendar');
const predictionText = document.getElementById('prediction');
const currentPhaseText = document.getElementById('currentPhaseText');

let cycles = JSON.parse(localStorage.getItem('periodCycles')) || [];

function saveCycle(selectedDates) {
    if (selectedDates.length === 2) {
        const start = selectedDates[0];
        const end = selectedDates[1];
        
        cycles.push({ start: start.toISOString(), end: end.toISOString() });
        cycles.sort((a, b) => new Date(a.start) - new Date(b.start));
        
        localStorage.setItem('periodCycles', JSON.stringify(cycles));
        updatePrediction();
        
        fp.clear(); 
        fp.redraw();
    }
}

function calculatePrediction() {
    if (cycles.length === 0) return null;
    
    let avgCycleGap = 28; 
    let avgDuration = 5;  

    let totalDurationDays = 0;
    cycles.forEach(cycle => {
        const s = new Date(cycle.start);
        const e = new Date(cycle.end);
        totalDurationDays += Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) + 1; 
    });
    avgDuration = Math.round(totalDurationDays / cycles.length);

    if (cycles.length > 1) {
        let totalWeightedDays = 0;
        let totalWeights = 0;

        for (let i = 1; i < cycles.length; i++) {
            const prevStart = new Date(cycles[i-1].start);
            const currStart = new Date(cycles[i].start);
            const diffTime = Math.abs(currStart - prevStart);
            const cycleLength = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            const weight = i; 
            totalWeightedDays += (cycleLength * weight);
            totalWeights += weight;
        }
        avgCycleGap = Math.round(totalWeightedDays / totalWeights);
    }

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
        predictionText.innerHTML = `${prediction.start.toDateString()} <br><span style="font-size: 13px; color: #7b7b7b; font-weight: 400;">(Expected length: ${prediction.duration} days)</span>`;
        
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

const fp = flatpickr(calendarElement, {
    mode: "range",
    inline: true, 
    onChange: function(selectedDates, dateStr, instance) {
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
        date.setHours(0,0,0,0);
        const prediction = calculatePrediction();
        
        // Helper function to build the pill shapes
        function applyPillShape(currentDate, startDate, endDate) {
            if (startDate.getTime() === endDate.getTime()) {
                dayElem.classList.add('range-single');
            } else if (currentDate.getTime() === startDate.getTime()) {
                dayElem.classList.add('range-start');
            } else if (currentDate.getTime() === endDate.getTime()) {
                dayElem.classList.add('range-end');
            } else {
                dayElem.classList.add('range-mid');
            }
        }

        // 1. Render Past Logged Periods
        let isLogged = false;
        cycles.forEach(cycle => {
            const start = new Date(cycle.start);
            const end = new Date(cycle.end);
            start.setHours(0,0,0,0);
            end.setHours(0,0,0,0);
            
            if (date >= start && date <= end) {
                dayElem.classList.add('logged-period');
                applyPillShape(date, start, end);
                isLogged = true;
            }
        });

        if (isLogged) return; // Prevent overwriting logged days with phase colors

        if (prediction) {
            // Setup strict boundary dates for all calculations
            const lastStart = new Date(prediction.lastStart);
            const nextStart = new Date(prediction.start);
            lastStart.setHours(0,0,0,0);
            nextStart.setHours(0,0,0,0);

            const nextEnd = new Date(nextStart);
            nextEnd.setDate(nextEnd.getDate() + prediction.duration - 1); 
            nextEnd.setHours(0,0,0,0);

            const ovulationDay = prediction.gap - 14;

            const follicularStart = new Date(lastStart);
            follicularStart.setDate(follicularStart.getDate() + prediction.duration);
            const follicularEnd = new Date(lastStart);
            follicularEnd.setDate(follicularEnd.getDate() + ovulationDay - 3);

            const ovulationStart = new Date(lastStart);
            ovulationStart.setDate(ovulationStart.getDate() + ovulationDay - 2);
            const ovulationEnd = new Date(lastStart);
            ovulationEnd.setDate(ovulationEnd.getDate() + ovulationDay + 1);

            const lutealStart = new Date(lastStart);
            lutealStart.setDate(lutealStart.getDate() + ovulationDay + 2);
            const lutealEnd = new Date(nextStart);
            lutealEnd.setDate(lutealEnd.getDate() - 1);

            // Apply coloring and pill shapes for the future/current phases
            if (date >= nextStart && date <= nextEnd) {
                dayElem.classList.add('predicted-period');
                applyPillShape(date, nextStart, nextEnd);
            } 
            else if (date >= follicularStart && date <= follicularEnd) {
                dayElem.classList.add('phase-follicular');
                applyPillShape(date, follicularStart, follicularEnd);
            }
            else if (date >= ovulationStart && date <= ovulationEnd) {
                dayElem.classList.add('phase-ovulation');
                applyPillShape(date, ovulationStart, ovulationEnd);
            }
            else if (date >= lutealStart && date <= lutealEnd) {
                dayElem.classList.add('phase-luteal');
                applyPillShape(date, lutealStart, lutealEnd);
            }
        }
    }
});

document.getElementById('clearBtn').addEventListener('click', () => {
    if(confirm("Are you sure you want to delete all stored cycles? This cannot be undone.")) {
        cycles = [];
        localStorage.removeItem('periodCycles');
        updatePrediction();
        fp.redraw();
    }
});

updatePrediction();
