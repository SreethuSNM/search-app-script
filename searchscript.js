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

// Render search results with pagination and styling
function renderResults(
    results,
    title,
    displayMode,
    maxItems,
    gridColumns = 3,
    paginationType = "None",
    container,
    currentPage = 1,
    isPageResult = true,
    styles = {}
) {
    if (!Array.isArray(results) || results.length === 0) return "";

    const totalPages = maxItems ? Math.ceil(results.length / maxItems) : 1;
    const startIndex = maxItems ? (currentPage - 1) * maxItems : 0;
    const endIndex = maxItems ? startIndex + maxItems : results.length;
    const pagedResults = results.slice(startIndex, endIndex);

    const {
        titleFontSize = "16px",
        titleFontFamily = "Arial",
        titleColor = "#000",
        borderRadius = "6px",
        otherFieldsColor = "#333",
        otherFieldsFontSize = "14px",
    } = styles;

    const itemsHtml = pagedResults
        .map((item) => {
            const titleText = item.name || item.title || "Untitled";
            const url = item.publishedPath || item.slug || "#";
            const matchedText = item.matchedText?.slice(0, 200) || "";

            const fieldsHtml = Object.entries(item)
                .map(([key, value]) => {
                    if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
                        value = new Date(value).toLocaleString();
                    }

                    if (typeof value === "object" && value !== null) {
                        const imageUrl =
                            (Array.isArray(value) && value[0]?.url) || value.url || value.src || value.href;

                        if (imageUrl) {
                            const imageStyle =
                                displayMode === "Grid" ? "max-width: 100%;" : "max-width: 50%;";

                            return `<p style="color: ${otherFieldsColor}; font-size: ${otherFieldsFontSize};"><strong>${key}:</strong><br><img src="${imageUrl}" alt="${key}" class="item-image" style="${imageStyle} border-radius: 4px;" /></p>`;
                        }

                        return `<p style="color: ${otherFieldsColor}; font-size: ${otherFieldsFontSize};"><strong>${key}:</strong> ${JSON.stringify(value)}</p>`;
                    }

                    return `<p style="color: ${otherFieldsColor}; font-size: ${otherFieldsFontSize};"><strong>${key}:</strong> ${value}</p>`;
                })
                .join("");

            const titleHtml = isPageResult
                ? `<h4 style="font-size: ${titleFontSize}; font-family: ${titleFontFamily}; color: ${titleColor}; margin-bottom: 0.5rem;"><a href="${url}" target="_blank" style="color: inherit; text-decoration: none;">${titleText}</a></h4>`
                : ""; // No title for CMS results

            return `
      <div class="search-result-item" style="
        background: #fff;
        border: 1px solid #ddd;
        border-radius: ${borderRadius};
        padding: 1rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      ">
        ${titleHtml}
        ${matchedText ? `<p style="color: ${otherFieldsColor}; font-size: ${otherFieldsFontSize};">${matchedText}...</p>` : fieldsHtml}
      </div>
    `;
        })
        .join("");

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
      display: ${displayMode === "Grid" ? "grid" : "block"};
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
            container.querySelectorAll(".pagination-button").forEach((btn) => {
                btn.addEventListener("click", () => {
                    const page = parseInt(btn.getAttribute("data-page"));
                    renderResults(
                        results,
                        title,
                        displayMode,
                        maxItems,
                        gridColumns,
                        paginationType,
                        container,
                        page,
                        isPageResult,
                        styles
                    );
                });
            });
        }

        if (paginationType === "Load More") {
            const loadBtn = container.querySelector(".load-more-button");
            if (loadBtn) {
                loadBtn.addEventListener("click", () => {
                    renderResults(
                        results,
                        title,
                        displayMode,
                        endIndex + maxItems,
                        gridColumns,
                        paginationType,
                        container,
                        1,
                        isPageResult,
                        styles
                    );
                });
            }
        }
    }

    return sectionHtml;
}

document.addEventListener("DOMContentLoaded", async function () {
    const searchConfigDiv = document.querySelector("#search-config");

    if (!searchConfigDiv) {
        console.error("❌ 'search-config' div not found.");
        return;
    }

    // Read config attributes from #search-config div
    const selectedCollections = JSON.parse(searchConfigDiv.getAttribute("data-selected-collections") || "[]");
    const selectedFieldsSearch = JSON.parse(searchConfigDiv.getAttribute("data-selected-fields-search") || "[]");
    const selectedFieldsDisplay = JSON.parse(searchConfigDiv.getAttribute("data-selected-fields-display") || "[]");
    const selectedOption = searchConfigDiv.getAttribute("data-selected-option");
    const displayMode = searchConfigDiv.getAttribute("data-display-mode");
    const paginationType = searchConfigDiv.getAttribute("data-pagination-type") || "None";
    const gridRows = parseInt(searchConfigDiv.getAttribute("data-grid-rows"), 10) || 1;
    const gridColumns = parseInt(searchConfigDiv.getAttribute("data-grid-columns"), 10) || 1;
    const itemsPerPage = parseInt(searchConfigDiv.getAttribute("data-items-per-page"), 10) || 10;
    const resultType = searchConfigDiv.getAttribute("data-result-type") || "Click on search";
    const searchBarType = searchConfigDiv.getAttribute("data-search-bar");
    const resultPage = searchConfigDiv.getAttribute("data-result-page") || "Same page";

    // Style attributes from search-config
    const titleFontSize = searchConfigDiv.getAttribute("data-title-font-size") || "16px";
    const titleFontFamily = searchConfigDiv.getAttribute("data-title-font-family") || "Arial";
    const titleColor = searchConfigDiv.getAttribute("data-title-color") || "#000";
    const borderRadius = searchConfigDiv.getAttribute("data-border-radius") || "6px";
    const otherFieldsColor = searchConfigDiv.getAttribute("data-other-fields-color") || "#333";
    const otherFieldsFontSize = searchConfigDiv.getAttribute("data-other-fields-font-size") || "14px";

    const styles = {
        titleFontSize,
        titleFontFamily,
        titleColor,
        borderRadius,
        otherFieldsColor,
        otherFieldsFontSize,
    };

    const maxItems = displayMode === "Grid" ? gridRows * gridColumns : itemsPerPage;

    const collectionsParam = encodeURIComponent(JSON.stringify(selectedCollections));
    const fieldsSearchParam = encodeURIComponent(JSON.stringify(selectedFieldsSearch));
    const fieldsDisplayParam = encodeURIComponent(JSON.stringify(selectedFieldsDisplay));

    const form = document.querySelector(".w-form, #search-form");
    const input = document.querySelector("input[name='query']");
    const resultsContainer = document.querySelector(".searchresults");
    const base_url = "https://search-server.long-rain-28bb.workers.dev";
    const siteName = window.location.hostname.replace(/^www\./, "").split(".")[0];

    // Hide submit button if Auto result
    const submitButton = form?.querySelector("input[type='submit']");
    if (resultType === "Auto result" && submitButton) {
        submitButton.style.display = "none";
    }

    if (!form || !input || !resultsContainer) {
        console.warn("Search form or elements not found.");
        return;
    }

    form.removeAttribute("action");
    form.setAttribute("action", "#");

    const token = await getVisitorSessionToken();
    console.log("Generated Token: ", token);

    // Implement Search Bar Display Mode
    if (searchBarType === "Icon") {
        form.style.display = "none";

        const iconContainer = document.querySelector(".searchiconcontainer");
        if (!iconContainer) {
            console.error("❌ '.searchiconcontainer' element not found.");
            return;
        }

        iconContainer.style.cursor = "pointer";
        iconContainer.style.display = "";

        iconContainer.addEventListener("click", () => {
            form.style.display = "";
            iconContainer.style.display = "none";
            input.focus();
        });
    } else {
        form.style.display = "";
        const iconContainer = document.querySelector(".searchiconcontainer");
        if (iconContainer) iconContainer.style.display = "none";
    }

    async function performSearch() {
        const query = input.value.trim().toLowerCase();
        if (!query) return;

        resultsContainer.innerHTML = "<p>Searching...</p>";

        try {
            const headers = { Authorization: `Bearer ${token}` };

            const [pageRes, cmsRes] = await Promise.all([
                fetch(
                    `${base_url}/api/search-index?query=${encodeURIComponent(
                        query
                    )}&siteName=${siteName}`,
                    { headers }
                ),
                fetch(
                    `${base_url}/api/search-cms?query=${encodeURIComponent(
                        query
                    )}&siteName=${siteName}&collections=${collectionsParam}&searchFields=${fieldsSearchParam}&displayFields=${fieldsDisplayParam}`,
                    { headers }
                ),
            ]);

            if (!pageRes.ok || !cmsRes.ok) {
                throw new Error("Search API error");
            }

            const [pageData, cmsData] = await Promise.all([
                pageRes.json(),
                cmsRes.json(),
            ]);

            // Filter page results by selected collections if specified
            let filteredPageResults = pageData.results || [];
            if (selectedCollections.length > 0) {
                filteredPageResults = filteredPageResults.filter((item) =>
                    selectedCollections.includes(item.collectionName)
                );
            }

            resultsContainer.innerHTML = "";
            if (filteredPageResults.length) {
                renderResults(
                    filteredPageResults,
                    "Page Results",
                    displayMode,
                    maxItems,
                    gridColumns,
                    paginationType,
                    resultsContainer,
                    1,
                    true,
                    styles
                );
            }
            if (cmsData.results?.length) {
                renderResults(
                    cmsData.results,
                    "CMS Results",
                    displayMode,
                    maxItems,
                    gridColumns,
                    paginationType,
                    resultsContainer,
                    1,
                    false,
                    styles
                );
            }

        } catch (error) {
            console.error(error);
            resultsContainer.innerHTML = "<p>Error fetching search results.</p>";
        }
    }

    if (resultType === "Click on search") {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            performSearch();
        });
    } else if (resultType === "Auto result") {
        input.addEventListener("input", () => {
            performSearch();
        });
    }

});
