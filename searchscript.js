<script>
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

// Function to render page or CMS results as Grid or List
function renderResults(results, title, displayMode, maxItems, gridColumns = 3) {
    if (!Array.isArray(results) || results.length === 0) return "";

    const slicedResults = maxItems ? results.slice(0, maxItems) : results;

    const itemsHtml = slicedResults.map(item => {
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
            flex: 1 1 calc(${100 / gridColumns}% - 1rem);
            max-width: calc(${100 / gridColumns}% - 1rem);
            margin: 0.5rem;
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

    return `
        <section style="margin-top: 2rem;">
            <h3>${title}</h3>
            <div class="search-results-wrapper" style="
                display: ${displayMode === 'Grid' ? 'flex' : 'block'};
                flex-wrap: wrap;
                gap: 1rem;
            ">
                ${itemsHtml}
            </div>
        </section>
    `;
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
    const gridRows = parseInt(searchConfigDiv.getAttribute('data-grid-rows'), 10) || 1;
    const gridColumns = parseInt(searchConfigDiv.getAttribute('data-grid-columns'), 10) || 1;

    const maxItems = displayMode === "Grid" ? gridRows * gridColumns : null;
    const collectionsParam = encodeURIComponent(JSON.stringify(selectedCollections));
    const fieldsParam = encodeURIComponent(JSON.stringify(selectedFields));

    const form = document.querySelector(".w-form, #search-form");
    const input = document.querySelector("input[name='query']");
    const resultsContainer = document.querySelector(".searchresults");
    const searchableItems = document.querySelectorAll(".search-item");
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

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const query = input.value.trim().toLowerCase();
        if (!query) return;

        resultsContainer.innerHTML = "<p>Searching...</p>";

        try {
            const headers = {
                Authorization: `Bearer ${token}`,
            };

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

            let html = "";

            if ((selectedOption === "Pages" || selectedOption === "Both") && pageResults.length > 0) {
                html += renderResults(pageResults, "Page Results", displayMode, maxItems, gridColumns);
            }

            if ((selectedOption === "Collection" || selectedOption === "Both") && cmsResults.length > 0) {
                html += renderResults(cmsResults, "CMS Results", displayMode, maxItems, gridColumns);
            }

            resultsContainer.innerHTML = html;

        } catch (error) {
            console.warn("API search failed, falling back to page search.");

            let matchCount = 0;
            searchableItems.forEach(item => {
                const text = item.textContent?.toLowerCase() || "";
                const isMatch = text.includes(query);
                item.style.display = isMatch ? "" : "none";
                if (isMatch) matchCount++;
            });

            resultsContainer.innerHTML = matchCount
                ? "<p>Found " + matchCount + " result(s) on this page.</p>"
                : "<p>No local matches found.</p>";
        }

        return false;
    });
});
</script>
