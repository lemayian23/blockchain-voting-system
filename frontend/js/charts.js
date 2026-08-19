// Update tally chart using Chart.js
let tallyChart;

function renderChart(data) {
    const ctx = document.getElementById('tallyChart').getContext('2d');
    if (tallyChart) tallyChart.destroy();
    tallyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data.candidates),
            datasets: [{
                label: 'Votes',
                data: Object.values(data.candidates),
                backgroundColor: ['#667eea', '#48bb78', '#ed8936', '#f56565'],
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// Call renderChart(tally) in student.js and admin.js on tally update