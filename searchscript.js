
console.log("Hello");

// Generate or get visitor ID
async function getOrCreateVisitorId() {
    let visitorId = localStorage.getItem('visitorId');
    if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem('visitorId', visitorId);
    }
    return visitorId;
}

// Check if the token has expired
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp && payload.exp < Math.floor(Date.now() / 1000);
    } catch (e) {
        return true;
    }
}

// Get or fetch visitor session token
async function getVisitorSessionToken() {
    try {
        const existingToken = localStorage.getItem('visitorSessionToken');
        if (existingToken && !isTokenExpired(existingToken)) {
            console.log("Using existing token from localStorage");
            return existingToken;
        }

        const visitorId = await getOrCreateVisitorId();
        const siteName = window.location.hostname.replace(/^www\./, '').split('.')[0];
        console.log("Current Hostname for get visitorId: ", siteName);

        const response = await fetch('https://search-server.long-rain-28bb.workers.dev/api/visitor-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                visitorId,
                userAgent: navigator.userAgent,
                siteName,
            }),
        });

        if (!response.ok) throw new Error('Failed to fetch visitor session token');

        const data = await response.json();
        localStorage.setItem('visitorSessionToken', data.token);
        return data.token;
    } catch (error) {
        console.error('Error getting visitor session token:', error);
        return null;
    }
}

// Render search results with pagination
function renderResults(results, title, displayMode, maxItems, gridColumns = 3, paginationType = "None", container, currentPage = 1) {
    if (!Array.isArray(results) || results.length === 0) return "";

    const totalPages = maxItems ? Math.ceil(results.length / maxItems) : 1;
    const startIndex = maxItems ? (currentPage - 1) * maxItems : 0;
    const endIndex = maxItems ? startIndex + maxItems : results.length;
    const pagedResults = results.slice(startIndex, endIndex);

    const itemsHtml = pagedResults.map(item => {
        const titleText = item.name || item.title || "Untitled";
        const url = item.publishedPath || item.slug || "#";
        const matchedText = item.matchedText?.slice(0, 200) || "";

        const fieldsHtml = Object.entries(item).map(([key, value]) => {
            if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
                value = new Date(value).toLocaleString();
            }

            if (typeof value === 'object' && value !== null) {
                const imageUrl = (Array.isArray(value) && value[0]?.url)
                    || value.url || value.src || value.href;

                if (imageUrl) {
                    return `<p><strong>${key}:</strong><br><img src="${imageUrl}" alt="${key}" class="item-image" style="max-width: 100%; border-radius: 4px;" /></p>`;
                }

                return `<p><strong>${key}:</strong> ${JSON.stringify(value)}</p>`;
            }

            return `<p><strong>${key}:</strong> ${value}</p>`;
        }).join("");

        return `
           <div class="search-result-item" style="${displayMode === 'Grid' ? `
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);` : `margin-bottom: 1rem;`
}">

            <h4><a href="${url}" target="_blank">${titleText}</a></h4>
            ${matchedText ? `<p>${matchedText}...</p>` : fieldsHtml}
        </div>`;
    }).join("");

    let paginationHtml = "";
    if (paginationType === "Numbered" && totalPages > 1) {
        paginationHtml = `<div class="pagination" style="margin-top: 1rem;">`;
        for (let i = 1; i <= totalPages; i++) {
            paginationHtml += `<button class="pagination-button" data-page="${i}" style="margin: 0 4px; padding: 4px 8px;">${i}</button>`;
        }
        paginationHtml += `</div>`;
    }

    if (paginationType === "Load More" && endIndex < results.length) {
        paginationHtml += `<div style="text-align:center;"><button class="load-more-button" style="margin-top:1rem;">Load More</button></div>`;
    }

    const sectionHtml = `
        <section style="margin-top: 2rem;">
            <h3>${title}</h3>
            <div class="search-results-wrapper" style="
  display: ${displayMode === 'Grid' ? 'grid' : 'block'};
  grid-template-columns: repeat(${gridColumns}, 1fr);
  gap: 1rem;
">

                ${itemsHtml}
            </div>
            ${paginationHtml}
        </section>`;

    if (container) {
        container.innerHTML = sectionHtml;
        if (paginationType === "Numbered") {
            container.querySelectorAll('.pagination-button').forEach(btn => {
                btn.addEventListener('click', () => {
                    const page = parseInt(btn.getAttribute('data-page'));
                    renderResults(results, title, displayMode, maxItems, gridColumns, paginationType, container, page);
                });
            });
        }

        if (paginationType === "Load More") {
            const loadBtn = container.querySelector('.load-more-button');
            if (loadBtn) {
                loadBtn.addEventListener('click', () => {
                    renderResults(results, title, displayMode, endIndex + maxItems, gridColumns, paginationType, container, 1);
                });
            }
        }
    }

    return sectionHtml;
}

document.addEventListener("DOMContentLoaded", async function () {
    const searchConfigDiv = document.querySelector('#search-config');

    if (!searchConfigDiv) {
        console.error("❌ 'search-config' div not found.");
        return;
    }

    const selectedCollections = JSON.parse(searchConfigDiv.getAttribute('data-selected-collections') || '[]');
    const selectedFields = JSON.parse(searchConfigDiv.getAttribute('data-selected-fields') || '[]');
    const selectedOption = searchConfigDiv.getAttribute('data-selected-option');
    const displayMode = searchConfigDiv.getAttribute('data-display-mode');
    const paginationType = searchConfigDiv.getAttribute('data-pagination-type') || "None";
    const gridRows = parseInt(searchConfigDiv.getAttribute('data-grid-rows'), 10) || 1;
    const gridColumns = parseInt(searchConfigDiv.getAttribute('data-grid-columns'), 10) || 1;
    const itemsPerPage = parseInt(searchConfigDiv.getAttribute('data-items-per-page'), 10) || 10;
    const resultType = searchConfigDiv.getAttribute('data-result-type') || "Click on search";

    const maxItems = displayMode === "Grid" ? gridRows * gridColumns : itemsPerPage;

    const collectionsParam = encodeURIComponent(JSON.stringify(selectedCollections));
    const fieldsParam = encodeURIComponent(JSON.stringify(selectedFields));

    const form = document.querySelector(".w-form, #search-form");
    const input = document.querySelector("input[name='query']");
    const resultsContainer = document.querySelector(".searchresults");
    const base_url = "https://search-server.long-rain-28bb.workers.dev";
    const siteName = window.location.hostname.replace(/^www\./, '').split('.')[0];

    if (!form || !input || !resultsContainer) {
        console.warn("Search form or elements not found.");
        return;
    }

    form.removeAttribute("action");
    form.setAttribute("action", "#");

    const token = await getVisitorSessionToken();
    console.log("Generated Token: ", token);

    async function performSearch() {
        const query = input.value.trim().toLowerCase();
        if (!query) return;

        resultsContainer.innerHTML = "<p>Searching...</p>";

        try {
            const headers = { Authorization: `Bearer ${token}` };

            const [pageRes, cmsRes] = await Promise.all([
                fetch(`${base_url}/api/search-index?query=${encodeURIComponent(query)}&siteName=${siteName}`, { headers }),
                fetch(`${base_url}/api/search-cms?query=${encodeURIComponent(query)}&siteName=${siteName}&collections=${collectionsParam}&fields=${fieldsParam}`, { headers }),
            ]);

            const [pageData, cmsData] = await Promise.all([
                pageRes.ok ? pageRes.json() : { results: [] },
                cmsRes.ok ? cmsRes.json() : { results: [] },
            ]);

            const pageResults = Array.isArray(pageData.results) ? pageData.results : [];
            const cmsResults = Array.isArray(cmsData.results) ? cmsData.results : [];

            if (pageResults.length === 0 && cmsResults.length === 0) {
                resultsContainer.innerHTML = "<p>No results found.</p>";
                return;
            }

            resultsContainer.innerHTML = "";

            if ((selectedOption === "Pages" || selectedOption === "Both") && pageResults.length > 0) {
                const container = document.createElement('div');
                resultsContainer.appendChild(container);
                renderResults(pageResults, "Page Results", displayMode, maxItems, gridColumns, paginationType, container);
            }

            if ((selectedOption === "Collection" || selectedOption === "Both") && cmsResults.length > 0) {
                const container = document.createElement('div');
                resultsContainer.appendChild(container);
                renderResults(cmsResults, "CMS Results", displayMode, maxItems, gridColumns, paginationType, container);
            }

        } catch (error) {
            console.warn("API search failed, falling back to page search.");
            resultsContainer.innerHTML = "<p>No results found.</p>";
        }
    }

    if (resultType === "Auto result") {
        input.addEventListener("input", debounce(performSearch, 500));
    } else {
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            performSearch();
        });
    }

    function debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }
});
