document.addEventListener('DOMContentLoaded', () => {
    let allStations = [];
    
    // DOM Elements
    const splashScreen = document.getElementById('splash-screen');
    const stationsGrid = document.getElementById('stationsGrid');
    const countDisplay = document.getElementById('countDisplay');
    const searchInput = document.getElementById('searchInput');
    const disciplineFilter = document.getElementById('disciplineFilter');
    const cgpaInput = document.getElementById('cgpaInput');
    const cityFilter = document.getElementById('cityFilter');
    const modeFilter = document.getElementById('modeFilter');
    const yearFilter = document.getElementById('yearFilter');
    const sortFilter = document.getElementById('sortFilter');
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.section');

    // --- REVIEWS DATA STRUCTURE ---
    const reviewsData = {
        "2024": [
            "2024 Chronicles - Core Fields.pdf",
            "2024 Chronicles - CSIR and Government Research Labs.pdf",
            "2024 Chronicles - Electronics.pdf",
            "2024 Chronicles - Finance and Management.pdf",
            "2024 Chronicles - Health Care.pdf",
            "2024 Chronicles - IT.pdf"
        ],
        "2023": [
            "2023 Chronicles - Core Fields.pdf",
            "2023 Chronicles - Electronics.pdf",
            "2023 Chronicles - Finance and Management.pdf",
            "2023 Chronicles - Health Care.pdf",
            "2023 Chronicles - IT.pdf"
        ],
        "2022": [
            "2022 Chronicles - Core Fields.pdf",
            "2022 Chronicles - Electronics.pdf",
            "2022 Chronicles - Finance and Management.pdf",
            "2022 Chronicles - Health Care.pdf",
            "2022 Chronicles - IT.pdf"
        ],
        "2021": [
            "2021 Chronicles - Core Fields.pdf",
            "2021 Chronicles - Electronics.pdf",
            "2021 Chronicles - Finance and Management.pdf",
            "2021 Chronicles - Health Care.pdf",
            "2021 Chronicles - IT.pdf"
        ]
    };

    // 1. Splash Logic
    const splashStart = Date.now();
    function hideSplash() {
        const now = Date.now();
        const remaining = Math.max(0, 1500 - (now - splashStart));
        setTimeout(() => {
            splashScreen.classList.add('hidden-splash');
            setTimeout(() => splashScreen.remove(), 600);
        }, remaining);
    }

    // 2. Navigation
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.getAttribute('data-target')).classList.add('active');
        });
    });

    // 3. Render Reviews
    function renderReviews() {
        const container = document.getElementById('reviews-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.keys(reviewsData).sort().reverse().forEach(year => {
            const yearGroup = document.createElement('div');
            yearGroup.className = 'review-year-group';
            
            // Year Header
            const header = document.createElement('div');
            header.className = 'review-year-header';
            header.innerHTML = `<span>${year} Archive</span> <span class="arrow">▼</span>`;
            
            // File List
            const fileList = document.createElement('div');
            fileList.className = 'review-file-list';
            
            reviewsData[year].forEach(filename => {
                const link = document.createElement('a');
                // CLEAN UP FILENAME FOR DISPLAY (Remove "20xx Chronicles - " and ".pdf")
                const displayName = filename.replace(/^\d{4} Chronicles - /, '').replace('.pdf', '');
                
                link.href = `reviews/${year}/${filename}`;
                link.textContent = displayName;
                link.target = "_blank"; // Open in new tab
                link.className = 'review-link';
                fileList.appendChild(link);
            });

            // Toggle functionality
            header.addEventListener('click', () => {
                const isOpen = fileList.style.display === 'flex';
                // Close all others (optional)
                document.querySelectorAll('.review-file-list').forEach(el => el.style.display = 'none');
                document.querySelectorAll('.review-year-header').forEach(el => el.classList.remove('active'));

                if (!isOpen) {
                    fileList.style.display = 'flex';
                    header.classList.add('active');
                }
            });

            yearGroup.appendChild(header);
            yearGroup.appendChild(fileList);
            container.appendChild(yearGroup);
        });
    }

    // 4. Fetch Data
    fetch('integrated_stations.json')
        .then(response => response.json())
        .then(data => {
            const stationsArray = Object.values(data); 
            allStations = stationsArray.map(processStationData);
            
            initializeFilters();
            applyFilters();
            renderReviews(); // Init reviews
            hideSplash(); 
        })
        .catch(err => {
            console.error(err);
            stationsGrid.innerHTML = '<p style="color:red; text-align:center;">Error loading data.</p>';
            renderReviews(); // Still render reviews even if stations fail
            hideSplash(); 
        });

    // Helper: Parse station data
    function processStationData(station) {
        let maxCutoff = 0;
        let cutoffYear = 'N/A';
        let finalMode = 'Unknown';
        
        const activeYears = [];
        const rawActiveYears = [];
        
        if (station.history) {
            const sortedHistoryKeys = Object.keys(station.history).sort().reverse();
            sortedHistoryKeys.forEach(year => {
                const info = station.history[year];
                rawActiveYears.push(year);
                activeYears.push(year.replace('20', ''));

                if (cutoffYear === 'N/A') {
                    const val = info.cutoff_max || info.cutoff_min;
                    if (val !== undefined && val !== null && !isNaN(val)) {
                        maxCutoff = val;
                        cutoffYear = year;
                    }
                }

                if (finalMode === 'Unknown' && info.mode) {
                    const m = info.mode.toLowerCase();
                    if (m.includes('online')) finalMode = 'Online';
                    else if (m.includes('offline') || m.includes('onsite') || m.includes('hybrid')) finalMode = 'Offline';
                }
            });
        }

        let domainSet = new Set();
        if (Array.isArray(station.disciplines)) {
            station.disciplines.forEach(d => domainSet.add(d.trim()));
        }
        if (station.history) {
            Object.values(station.history).forEach(h => {
                if (h.project_domain) {
                    h.project_domain.split(',').forEach(d => {
                        const clean = d.trim();
                        if(clean && clean.toLowerCase() !== 'yet to be finalized') domainSet.add(clean);
                    });
                }
            });
        }
        const parsedDisciplines = Array.from(domainSet);

        // Recency Score Logic
        let recencyScore = 0;
        const h = station.history || {};
        const has24 = h.hasOwnProperty('2024-25');
        const has23 = h.hasOwnProperty('2023-24');
        const has22 = h.hasOwnProperty('2022-23');

        if (has24 && has23 && has22) recencyScore = 100;
        else if (has24 && has23) recencyScore = 80;
        else if (has24) recencyScore = 60;
        else if (!has24 && has23 && has22) recencyScore = 40;
        else if (!has24 && has23) recencyScore = 20;
        else recencyScore = 0;

        return {
            name: station.name,
            city: station.city || 'N/A',
            industry: station.industry,
            mode: finalMode,
            calculatedCutoff: maxCutoff, 
            cutoffYear: cutoffYear,
            parsedDisciplines: parsedDisciplines,
            activeYears: activeYears,
            rawActiveYears: rawActiveYears,
            recencyScore: recencyScore
        };
    }

    // Initialize Filters
    function initializeFilters() {
        const cities = new Set();
        const discSet = new Set();

        allStations.forEach(s => {
            if (s.city && s.city !== 'N/A') cities.add(s.city);
            s.parsedDisciplines.forEach(d => discSet.add(d));
        });

        // Cities
        Array.from(cities).sort().forEach(city => {
            const opt = document.createElement('option');
            opt.value = city;
            opt.textContent = city;
            cityFilter.appendChild(opt);
        });

        // Disciplines
        const allDiscs = Array.from(discSet).sort();
        allDiscs.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            disciplineFilter.appendChild(opt);
        });
    }

    // Render
    function renderStations(stations) {
        stationsGrid.innerHTML = '';
        countDisplay.textContent = `${stations.length} Stations`;

        if (stations.length === 0) {
            stationsGrid.innerHTML = '<div style="text-align:center; color:#666; padding:2rem;">No matches found.</div>';
            return;
        }

        const fragment = document.createDocumentFragment();

        stations.forEach(s => {
            const card = document.createElement('div');
            card.className = 'card';

            const modeClass = (s.mode || '').toLowerCase() === 'online' ? 'online' : 'offline';
            const cutoffDisplay = s.calculatedCutoff > 0 ? s.calculatedCutoff : 'N/A';
            
            let discText = s.parsedDisciplines.slice(0, 2).join(', ');
            if(s.parsedDisciplines.length > 2) discText += ` +${s.parsedDisciplines.length - 2}`;
            if(!discText) discText = s.industry || 'General';

            const yearsText = s.activeYears.length > 0 ? s.activeYears.join(' • ') : 'Inactive';

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-title">${s.name}</div>
                    <div class="tags">
                        <span class="tag ${modeClass}">${s.mode}</span>
                        <span class="tag disc">${discText}</span>
                    </div>
                    <div class="card-city">
                        📍 ${s.city}
                    </div>
                    <div class="card-years">
                        <span class="year-label">Cycles:</span> ${yearsText}
                    </div>
                </div>
                <div class="card-footer">
                    <div class="cutoff-label">Max Cutoff (${s.cutoffYear})</div>
                    <div class="cutoff-box">
                        <div class="cutoff-val">${cutoffDisplay}</div>
                    </div>
                </div>
            `;
            fragment.appendChild(card);
        });

        stationsGrid.appendChild(fragment);
    }

    // Filter Logic
    function applyFilters() {
        const searchVal = searchInput.value.toLowerCase();
        const selCity = cityFilter.value;
        const selMode = modeFilter.value;
        const selDisc = disciplineFilter.value;
        const selYear = yearFilter.value;
        const cgpaVal = parseFloat(cgpaInput.value);
        const sortBy = sortFilter.value;

        let result = allStations.filter(s => {
            if (searchVal) {
                const combinedText = `${s.name} ${s.city} ${s.industry || ''} ${s.parsedDisciplines.join(' ')}`.toLowerCase();
                if (!combinedText.includes(searchVal)) return false;
            }
            if (selCity !== 'all' && s.city !== selCity) return false;
            if (selMode !== 'all' && s.mode !== selMode) return false;
            if (selYear !== 'all' && !s.rawActiveYears.includes(selYear)) return false;
            if (selDisc !== 'all' && !s.parsedDisciplines.includes(selDisc)) return false;
            if (!isNaN(cgpaVal) && s.calculatedCutoff > cgpaVal) return false;
            return true;
        });

        result.sort((a, b) => {
            if (sortBy === 'recency') {
                if (b.recencyScore !== a.recencyScore) return b.recencyScore - a.recencyScore;
                return b.calculatedCutoff - a.calculatedCutoff;
            } 
            else if (sortBy === 'cutoff_high') return b.calculatedCutoff - a.calculatedCutoff;
            else if (sortBy === 'cutoff_low') {
                if (a.calculatedCutoff === 0) return 1;
                if (b.calculatedCutoff === 0) return -1;
                return a.calculatedCutoff - b.calculatedCutoff;
            } 
            else if (sortBy === 'year') {
                if (b.cutoffYear !== a.cutoffYear) return b.cutoffYear.localeCompare(a.cutoffYear);
                return b.calculatedCutoff - a.calculatedCutoff;
            }
            return 0;
        });

        renderStations(result);
    }

    // Listeners
    searchInput.addEventListener('input', applyFilters);
    cityFilter.addEventListener('change', applyFilters);
    modeFilter.addEventListener('change', applyFilters);
    disciplineFilter.addEventListener('change', applyFilters);
    yearFilter.addEventListener('change', applyFilters);
    cgpaInput.addEventListener('input', applyFilters);
    sortFilter.addEventListener('change', applyFilters);
});