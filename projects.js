document.addEventListener('DOMContentLoaded', () => {
    let allProjects = [];
    
    const splashScreen = document.getElementById('splash-screen');
    const projectsGrid = document.getElementById('projectsGrid');
    const countDisplay = document.getElementById('projectCountDisplay');
    const searchInput = document.getElementById('projectSearch');
    const domainFilter = document.getElementById('domainFilter');
    const cityFilter = document.getElementById('cityFilter');
    const degreeCheckboxesContainer = document.getElementById('degreeCheckboxes');

    // 1. Parse the CSV file using PapaParse
    Papa.parse("List of stations with project titles and description - April 4th, 2026.xlsx - Sheet1.csv", {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            const invalidTags = ['any', 'n/a', 'na', 'none', 'null', 'undefined', ''];
            
            allProjects = results.data.filter(row => row['Station Name']).map(p => {
                let rawTags = p['Tags'] ? p['Tags'].split(',') : [];
                let processedTags = new Set(); 

                rawTags.forEach(t => {
                    let tag = t.trim();
                    let lower = tag.toLowerCase();
                    
                    if (lower === 'any') {
                        // General Single Degree
                        processedTags.add("Any Single Degree");
                    } else if (lower.startsWith('any') && tag.length >= 4) {
                        // Dual Degree logic
                        let branch = tag.substring(3).toUpperCase();
                        
                        // Check if it's a Science branch (B1, B2, B3, B4, B5)
                        if (branch.startsWith('B')) {
                            processedTags.add(`${branch} + Any Single Degree`);
                        } else {
                            // Engineering branch (A7, A3, AA, etc.)
                            processedTags.add(`Dual Degree + ${branch}`);
                        }
                    } else if (tag && !invalidTags.includes(lower)) {
                        // Standard exact branch (A7, B4, etc.)
                        processedTags.add(tag.toUpperCase());
                    }
                });

                p.displayTags = Array.from(processedTags);

                return p;
            });
            
            initializeFilters();
            renderProjects(allProjects);
            hideSplash();
        },
        error: function(err) {
            console.error("Error reading CSV:", err);
            projectsGrid.innerHTML = '<div style="color:red; text-align:center; padding:2rem;">Error loading CSV file. Ensure it is named correctly and you are using a local server.</div>';
            hideSplash();
        }
    });

    const splashStart = Date.now();
    function hideSplash() {
        const remaining = Math.max(0, 1000 - (Date.now() - splashStart));
        setTimeout(() => {
            splashScreen.classList.add('hidden-splash');
            setTimeout(() => splashScreen.remove(), 600);
        }, remaining);
    }

    // 2. Initialize Filters (Domains, Cities, and Checkboxes)
    function initializeFilters() {
        const domains = new Set();
        const cities = new Set();
        const allUniqueDegrees = new Set();

        allProjects.forEach(p => {
            if (p['Business Domain']) domains.add(p['Business Domain'].trim());
            if (p['Location (Centre)']) cities.add(p['Location (Centre)'].trim());
            p.displayTags.forEach(tag => allUniqueDegrees.add(tag));
        });

        // Populate Domain
        Array.from(domains).sort().forEach(d => {
            if(d && d.toLowerCase() !== 'n/a') {
                const opt = document.createElement('option');
                opt.value = d; opt.textContent = d;
                domainFilter.appendChild(opt);
            }
        });

        // Populate City
        Array.from(cities).sort().forEach(c => {
            if(c && c.toLowerCase() !== 'n/a') {
                const opt = document.createElement('option');
                opt.value = c; opt.textContent = c;
                cityFilter.appendChild(opt);
            }
        });

        // Populate Degree Checkboxes dynamically based on parsed tags
        degreeCheckboxesContainer.innerHTML = '';
        const sortedDegrees = Array.from(allUniqueDegrees).sort();
        
        sortedDegrees.forEach(tag => {
            const label = document.createElement('label');
            label.className = 'checkbox-label';
            label.innerHTML = `<input type="checkbox" value="${tag}"> ${tag}`;
            
            // Add logic to style the chip when clicked
            const input = label.querySelector('input');
            input.addEventListener('change', (e) => {
                if (e.target.checked) {
                    label.classList.add('checked');
                } else {
                    label.classList.remove('checked');
                }
                applyFilters();
            });
            
            degreeCheckboxesContainer.appendChild(label);
        });
    }

    // 3. Render Cards
    function renderProjects(projects) {
        projectsGrid.innerHTML = '';
        countDisplay.textContent = `${projects.length} Stations Available`;

        if (projects.length === 0) {
            projectsGrid.innerHTML = '<div style="text-align:center; color:#666; padding:2rem;">No matches found.</div>';
            return;
        }

        const fragment = document.createDocumentFragment();
        const invalidTags = ['any', 'n/a', 'na', 'none', 'null', 'undefined', ''];

        projects.forEach((p, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.cursor = 'pointer';
            card.onclick = () => openModal(p);

            // Generate HTML for tags with specific colors for Single vs Dual
            let displayTagsHtml = p.displayTags.map(tagText => {
                if (tagText === "Any Single Degree") {
                    // Blue tag for Single Degree
                    return `<span class="tag" style="color: #81D4FA; background: rgba(129, 212, 250, 0.1);">${tagText}</span>`;
                } else if (tagText.startsWith("Dual Degree +") || tagText.includes("+ Any Single Degree")) {
                    // Purple tag for all Dual Degree variations
                    return `<span class="tag" style="color: #CE93D8; background: rgba(206, 147, 216, 0.1);">${tagText}</span>`;
                } else {
                    // Standard gold tag for exact branches
                    return `<span class="tag disc">${tagText}</span>`;
                }
            });

            // Join HTML or Fallback to Business Domain
            let discHtml = displayTagsHtml.join(' ');
            if (displayTagsHtml.length === 0 && p['Business Domain'] && !invalidTags.includes(p['Business Domain'].toLowerCase())) {
                discHtml = `<span class="tag disc">${p['Business Domain']}</span>`;
            }

            const totalProjects = p['Total Project'] || '1';

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-title" style="font-size: 1.05rem;">${p['Station Name']}</div>
                    <div class="tags">
                        ${discHtml}
                    </div>
                    <div class="card-city">📍 ${p['Location (Centre)']}</div>
                </div>
                <div class="card-footer" style="margin-top: auto;">
                    <div class="cutoff-label">Openings / Projects</div>
                    <div class="cutoff-val" style="font-size: 1rem;">${totalProjects}</div>
                </div>
            `;
            fragment.appendChild(card);
        });

        projectsGrid.appendChild(fragment);
    }

    // 4. Filtering
    function applyFilters() {
        const searchVal = searchInput.value.toLowerCase();
        const selDomain = domainFilter.value;
        const selCity = cityFilter.value;

        // Get all currently checked tags
        const checkedInputs = Array.from(degreeCheckboxesContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

        const filtered = allProjects.filter(p => {
            // Search Text
            if (searchVal) {
                const combined = `${p['Station Name']} ${p['Location (Centre)']} ${p['Description']} ${p['Project Domain']}`.toLowerCase();
                if (!combined.includes(searchVal)) return false;
            }
            
            // Dropdowns
            if (selDomain !== 'all' && p['Business Domain'] !== selDomain) return false;
            if (selCity !== 'all' && p['Location (Centre)'] !== selCity) return false;
            
            // Checkbox Logic: If any boxes are checked, the project must contain AT LEAST ONE of the checked tags
            if (checkedInputs.length > 0) {
                const hasMatchingTag = p.displayTags.some(tag => checkedInputs.includes(tag));
                if (!hasMatchingTag) return false;
            }

            return true;
        });

        renderProjects(filtered);
    }

    // Attach listeners
    searchInput.addEventListener('input', applyFilters);
    domainFilter.addEventListener('change', applyFilters);
    cityFilter.addEventListener('change', applyFilters);

    // 5. Modal Logic
    window.openModal = function(station) {
        document.getElementById('modal-title').textContent = station['Station Name'] || 'Unknown Station';
        document.getElementById('modal-location').textContent = `📍 ${station['Location (Centre)'] || 'N/A'}`;
        document.getElementById('modal-domain').textContent = station['Business Domain'] || 'General';

        const bodyEl = document.getElementById('modal-body');
        
        let content = '';
        if(station['Title'] && station['Title'].trim() !== '') {
            content += `<strong style="color:#fff;">Project Titles:</strong>\n${station['Title']}\n\n`;
        }
        if(station['Project Domain'] && station['Project Domain'].trim() !== '') {
            content += `<strong style="color:#fff;">Domains:</strong>\n${station['Project Domain']}\n\n`;
        }
        if(station['Description'] && station['Description'].trim() !== '') {
            let desc = station['Description']
                .replace(/Description:/g, '\n<strong style="color:#F7C948;">Description:</strong>')
                .replace(/Skill sets:/gi, '\n<strong style="color:#F7C948;">Skill sets:</strong>')
                .replace(/Expected learning:/gi, '\n<strong style="color:#F7C948;">Expected learning:</strong>')
                .replace(/Specific courses required for project execution:/gi, '\n<strong style="color:#F7C948;">Courses Required:</strong>');
            
            content += desc;
        }

        if(!content.trim()) content = "No detailed description provided by the station.";

        bodyEl.innerHTML = content;
        document.getElementById('detailsModal').style.display = 'flex';
        document.body.style.overflow = 'hidden'; 
    };

    window.closeModal = function(event) {
        if (event && event.target.id !== 'detailsModal' && event.target.className !== 'modal-close') {
            return; 
        }
        document.getElementById('detailsModal').style.display = 'none';
        document.body.style.overflow = 'auto'; 
    };
});