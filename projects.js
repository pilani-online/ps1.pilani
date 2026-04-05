document.addEventListener('DOMContentLoaded', () => {
    let allProjects = [];
    
    const splashScreen = document.getElementById('splash-screen');
    const projectsGrid = document.getElementById('projectsGrid');
    const countDisplay = document.getElementById('projectCountDisplay');
    const searchInput = document.getElementById('projectSearch');
    const domainFilter = document.getElementById('domainFilter');
    const cityFilter = document.getElementById('cityFilter');
    const degreeCheckboxesContainer = document.getElementById('degreeCheckboxes');

    // Helper to strip raw HTML tags out of JSON strings
    function stripHtml(html) {
        if (!html) return '';
        let tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }

    // 1. Fetch the index file to know which JSON files actually exist
    fetch('stations_index.json')
        .then(res => {
            if (!res.ok) throw new Error("stations_index.json not found");
            return res.json();
        })
        .then(indexData => {
            // Create a Set of valid Station IDs
            const validIds = new Set(indexData.map(s => String(s.id)));

            // 2. Parse the CSV file and filter it against the valid IDs
            Papa.parse("List of stations with project titles and description - April 4th, 2026.xlsx - Sheet1.csv", {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    const invalidTags = ['any', 'n/a', 'na', 'none', 'null', 'undefined', ''];
                    
                    // ONLY keep stations that exist in station_data folder
                    let allowedCsvProjects = results.data.filter(row => row['Station Id'] && validIds.has(String(row['Station Id'])));
                    
                    allProjects = allowedCsvProjects.map(p => {
                        let rawTags = p['Tags'] ? p['Tags'].split(',') : [];
                        let isSingleDegree = false;
                        let isDualDegree = false;
                        let processedTags = new Set(); 

                        rawTags.forEach(t => {
                            let tag = t.trim();
                            let lower = tag.toLowerCase();
                            
                            if (lower === 'any') {
                                isSingleDegree = true;
                                processedTags.add("Any Single Degree");
                            } else if (lower.startsWith('any') && tag.length >= 4) {
                                isDualDegree = true;
                                let branch = tag.substring(3).toUpperCase();
                                if (branch.startsWith('B')) {
                                    processedTags.add(`${branch} + Any Single Degree`);
                                } else {
                                    processedTags.add(`Dual Degree + ${branch}`);
                                }
                            } else if (tag && !invalidTags.includes(lower)) {
                                processedTags.add(tag.toUpperCase());
                            }
                        });

                        p.isSingleDegree = isSingleDegree;
                        p.isDualDegree = isDualDegree;
                        p.displayTags = Array.from(processedTags);
                        return p;
                    });
                    
                    initializeFilters();
                    renderProjects(allProjects);
                    hideSplash();
                },
                error: function(err) {
                    console.error("Error reading CSV:", err);
                    projectsGrid.innerHTML = '<div style="color:red; text-align:center; padding:2rem;">Error loading CSV file.</div>';
                    hideSplash();
                }
            });
        })
        .catch(err => {
            console.error("Error:", err);
            projectsGrid.innerHTML = '<div style="color:red; text-align:center; padding:2rem;">Error loading index file. Ensure build_index.py was run.</div>';
            hideSplash();
        });

    const splashStart = Date.now();
    function hideSplash() {
        const remaining = Math.max(0, 1000 - (Date.now() - splashStart));
        setTimeout(() => {
            splashScreen.classList.add('hidden-splash');
            setTimeout(() => splashScreen.remove(), 600);
        }, remaining);
    }

    // 2. Initialize Filters
    function initializeFilters() {
        const domains = new Set();
        const cities = new Set();
        const allUniqueDegrees = new Set();

        allProjects.forEach(p => {
            if (p['Business Domain']) domains.add(p['Business Domain'].trim());
            if (p['Location (Centre)']) cities.add(p['Location (Centre)'].trim());
            p.displayTags.forEach(tag => allUniqueDegrees.add(tag));
        });

        Array.from(domains).sort().forEach(d => {
            if(d && d.toLowerCase() !== 'n/a' && d.toLowerCase() !== 'null') {
                const opt = document.createElement('option');
                opt.value = d; opt.textContent = d;
                domainFilter.appendChild(opt);
            }
        });

        Array.from(cities).sort().forEach(c => {
            if(c && c.toLowerCase() !== 'n/a' && c.toLowerCase() !== 'null') {
                const opt = document.createElement('option');
                opt.value = c; opt.textContent = c;
                cityFilter.appendChild(opt);
            }
        });

        degreeCheckboxesContainer.innerHTML = '';
        Array.from(allUniqueDegrees).sort().forEach(tag => {
            const label = document.createElement('label');
            label.className = 'checkbox-label';
            label.innerHTML = `<input type="checkbox" value="${tag}"> ${tag}`;
            
            const input = label.querySelector('input');
            input.addEventListener('change', (e) => {
                if (e.target.checked) label.classList.add('checked');
                else label.classList.remove('checked');
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

        projects.forEach((p) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.cursor = 'pointer';
            
            card.onclick = () => openModal(p);

            let displayTagsHtml = p.displayTags.map(tagText => {
                if (tagText === "Any Single Degree") {
                    return `<span class="tag" style="color: #81D4FA; background: rgba(129, 212, 250, 0.1);">${tagText}</span>`;
                } else if (tagText.startsWith("Dual Degree +") || tagText.includes("+ Any Single Degree")) {
                    return `<span class="tag" style="color: #CE93D8; background: rgba(206, 147, 216, 0.1);">${tagText}</span>`;
                } else {
                    return `<span class="tag disc">${tagText}</span>`;
                }
            });

            let discHtml = displayTagsHtml.join(' ');
            if (displayTagsHtml.length === 0 && p['Business Domain'] && !invalidTags.includes(p['Business Domain'].toLowerCase())) {
                discHtml = `<span class="tag disc">${p['Business Domain']}</span>`;
            }

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-title" style="font-size: 1.05rem;">${p['Station Name']}</div>
                    <div class="tags">${discHtml}</div>
                    <div class="card-city">📍 ${p['Location (Centre)']}</div>
                </div>
                <div class="card-footer" style="margin-top: auto;">
                    <div class="cutoff-label">Required Students</div>
                    <div class="cutoff-val" style="font-size: 1rem;">${p['Total Project'] || 'TBD'}</div>
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
        const checkedInputs = Array.from(degreeCheckboxesContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

        const filtered = allProjects.filter(p => {
            if (searchVal) {
                const combined = `${p['Station Name']} ${p['Location (Centre)']} ${p['Business Domain']}`.toLowerCase();
                if (!combined.includes(searchVal)) return false;
            }
            if (selDomain !== 'all' && p['Business Domain'] !== selDomain) return false;
            if (selCity !== 'all' && p['Location (Centre)'] !== selCity) return false;
            
            if (checkedInputs.length > 0) {
                const hasMatchingTag = p.displayTags.some(tag => checkedInputs.includes(tag));
                if (!hasMatchingTag) return false;
            }
            return true;
        });
        renderProjects(filtered);
    }

    searchInput.addEventListener('input', applyFilters);
    domainFilter.addEventListener('change', applyFilters);
    cityFilter.addEventListener('change', applyFilters);

    // 5. FETCH FULL JSON ON CLICK + EXTRA CSV DATA
    window.openModal = function(stationCsvData) {
        document.getElementById('modal-title').textContent = stationCsvData['Station Name'];
        document.getElementById('modal-location').textContent = `📍 ${stationCsvData['Location (Centre)']}`;
        document.getElementById('modal-domain').textContent = stationCsvData['Business Domain'];

        const bodyEl = document.getElementById('modal-body');
        bodyEl.innerHTML = `<div style="text-align:center; padding: 3rem; color: var(--accent-color); font-weight: 600;">Loading full station details...</div>`;
        document.getElementById('detailsModal').style.display = 'flex';
        document.body.style.overflow = 'hidden'; 

        // Fetch the raw JSON from the folder based on ID
        fetch(`station_data/${stationCsvData['Station Id']}.json`)
            .then(res => {
                if (!res.ok) throw new Error("JSON file not found");
                return res.json();
            })
            .then(data => {
                let html = '';
                const basic = data.station_basic || {};
                const details = data.station_details || {};
                const pbs = data.problem_banks || [];

                // A. METADATA ROW
                html += `<div style="display:flex; gap: 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; font-size: 0.9rem;">`;
                
                // Validate Website
                if (details.websiteAddress) {
                    let websiteUrl = details.websiteAddress.trim();
                    let checkUrl = websiteUrl.replace(/^https?:\/\//i, '').toLowerCase(); 
                    if (checkUrl !== '' && checkUrl !== 'www.com' && checkUrl !== 'null') {
                        if (!websiteUrl.match(/^https?:\/\//i)) websiteUrl = 'https://' + websiteUrl;
                        html += `<a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-color); text-decoration:none;">🔗 Visit Website</a>`;
                    }
                }
                
                if (details.associationDateText && details.associationDateText !== "null") {
                    html += `<span style="color:#aaa;">📅 Associated Since: ${details.associationDateText}</span>`;
                }
                if (basic.accomodation && basic.accomodation !== "null") {
                    html += `<span style="color:#aaa;">🏠 Accommodation: ${basic.accomodation}</span>`;
                }
                html += `</div>`;

                // Address (Compiled)
                const addrParts = [details.address1, details.address2, details.zip, basic.city, basic.state, basic.country];
                const cleanAddr = addrParts.filter(a => a && a !== "null" && a.trim() !== "").join(', ');
                if (cleanAddr) {
                    html += `<p style="color:#888; font-size:0.85rem; margin-bottom:1.5rem;">📍 ${cleanAddr}</p>`;
                }

                // B. COMPANY DESCRIPTION
                const compDesc = stripHtml(details.companyDescription);
                if (compDesc && compDesc.length > 5 && compDesc !== '-') {
                    html += `<strong style="color:#F7C948;">About Company:</strong><br><div style="color:#ccc; margin-top:0.5rem; white-space:pre-wrap;">${compDesc}</div>`;
                    html += `<hr style="border:0; border-top:1px solid #333; margin:1.5rem 0;">`;
                }

                // C. PROJECTS (Display all projects from the latest problem bank)
                let latest_pb = null;
                if (pbs.length > 0) {
                    latest_pb = pbs.sort((a, b) => (b.problem_bank?.batchId || 0) - (a.problem_bank?.batchId || 0))[0];
                }

                if (latest_pb && latest_pb.projects && latest_pb.projects.length > 0) {
                    html += `<h3 style="color:#fff; margin-bottom:1rem; padding-bottom:0.5rem; border-bottom:1px solid #333;">Available Projects</h3>`;
                    
                    latest_pb.projects.forEach(proj => {
                        html += `<div style="background: rgba(255,255,255,0.03); padding: 1.25rem; border-radius: 8px; margin-bottom: 1.25rem; border: 1px solid #2a2a2a;">`;
                        
                        if (proj.projectTitle && proj.projectTitle !== "null") {
                            html += `<h4 style="color:#fff; margin-bottom: 0.8rem; font-size: 1.1rem;">${proj.projectTitle}</h4>`;
                        }
                        if (proj.projectDomain && proj.projectDomain !== "null") {
                            html += `<p style="margin-bottom:0.5rem;"><strong style="color:#F7C948;">Domain:</strong> ${proj.projectDomain}</p>`;
                        }
                        if (proj.projectDescription && proj.projectDescription !== "null") {
                            html += `<p style="margin-bottom:0.5rem;"><strong style="color:#F7C948;">Description:</strong><br><span style="color:#ddd; white-space:pre-wrap;">${stripHtml(proj.projectDescription)}</span></p>`;
                        }
                        if (proj.skillSets && proj.skillSets !== "null") {
                            html += `<p style="margin-bottom:0.5rem;"><strong style="color:#F7C948;">Skill Sets:</strong> ${stripHtml(proj.skillSets)}</p>`;
                        }
                        if (proj.expectedLearning && proj.expectedLearning !== "null") {
                            html += `<p style="margin-bottom:0.5rem;"><strong style="color:#F7C948;">Expected Learning:</strong> ${stripHtml(proj.expectedLearning)}</p>`;
                        }
                        if (proj.stipend && proj.stipend !== "null" && proj.stipend != "0") {
                            html += `<p style="margin-bottom:0.5rem;"><strong style="color:#F7C948;">Stipend:</strong> ${proj.stipend}</p>`;
                        }
                        html += `</div>`;
                    });
                }

                // D. APPEND EXTRA CSV DETAILS (If available)
                const hasCsvExtra = stationCsvData['Title'] || stationCsvData['Project Domain'] || stationCsvData['Description'];
                if (hasCsvExtra) {
                    html += `<h3 style="color:#fff; margin-top: 2.5rem; margin-bottom:1rem; padding-bottom:0.5rem; border-bottom:1px solid #333;">Additional Overview</h3>`;
                    html += `<div style="background: rgba(247, 201, 72, 0.05); padding: 1.25rem; border-radius: 8px; border: 1px solid rgba(247, 201, 72, 0.2); margin-bottom: 1.25rem;">`;
                    
                    if (stationCsvData['Title']) {
                        html += `<p style="margin-bottom:0.5rem;"><strong style="color:#F7C948;">Titles:</strong> ${stationCsvData['Title']}</p>`;
                    }
                    if (stationCsvData['Project Domain']) {
                        html += `<p style="margin-bottom:0.5rem;"><strong style="color:#F7C948;">Domain:</strong> ${stationCsvData['Project Domain']}</p>`;
                    }
                    if (stationCsvData['Description']) {
                        let desc = stationCsvData['Description']
                            .replace(/Description:/g, '\n<strong style="color:#F7C948;">Description:</strong>')
                            .replace(/Skill sets:/gi, '\n<strong style="color:#F7C948;">Skill sets:</strong>')
                            .replace(/Expected learning:/gi, '\n<strong style="color:#F7C948;">Expected learning:</strong>')
                            .replace(/Specific courses required for project execution:/gi, '\n<strong style="color:#F7C948;">Courses Required:</strong>');
                        html += `<div style="color:#ddd; white-space:pre-wrap; margin-top: 0.5rem;">${desc}</div>`;
                    }
                    html += `</div>`;
                }

                bodyEl.innerHTML = html;
            })
            .catch(err => {
                console.error(err);
                bodyEl.innerHTML = `<div style="color:red; text-align:center; padding:2rem;">Failed to fetch specific station data.</div>`;
            });
    };

    window.closeModal = function(event) {
        if (event && event.target.id !== 'detailsModal' && event.target.className !== 'modal-close') return; 
        document.getElementById('detailsModal').style.display = 'none';
        document.body.style.overflow = 'auto'; 
    };
});