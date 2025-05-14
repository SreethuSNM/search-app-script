console.log("Hello");


// Function to generate or get visitor ID
async function getOrCreateVisitorId() {
    let visitorId = localStorage.getItem('visitorId');
    if (!visitorId) {
        visitorId = crypto.randomUUID(); // Generate a new unique ID if not found
        localStorage.setItem('visitorId', visitorId); // Store it in localStorage
    }
    return visitorId;
}


// Function to check if the token has expired
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1])); // Decode the payload
        return payload.exp && payload.exp < Math.floor(Date.now() / 1000); // Check expiry
    } catch (e) {
        return true; // If token decoding fails, assume it is expired
    }
}

// Function to get visitor session token
async function getVisitorSessionToken() {
    try {
        // Check if we have a valid token in localStorage first
        const existingToken = localStorage.getItem('visitorSessionToken');
        if (existingToken && !isTokenExpired(existingToken)) {
            console.log("Using existing token from localStorage");
            return existingToken; // Return if a valid token is found
        }

        // Generate a new visitor ID and get cleaned hostname
        const visitorId = await getOrCreateVisitorId();
       
       
        
    const siteName = window.location.hostname.replace(/^www\./, '').split('.')[0];
    console.log("Current Hostname for get visitorid: ", siteName);

       // Make the API request to get a new session token
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
        localStorage.setItem('visitorSessionToken', data.token); // Save the new token
        return data.token; // Return the token
    } catch (error) {
        console.error('Error getting visitor session token:', error);
        return null; // In case of error, return null
    }
}

/* Event Listener for Search Form */
document.addEventListener("DOMContentLoaded", async function () {
 // Find the div with id="search-config"
const searchConfigDiv = document.querySelector('#search-config');

if (searchConfigDiv) {
  // Get the custom attributes
  const selectedCollections = searchConfigDiv.getAttribute('data-selected-collections');
  const selectedFields = searchConfigDiv.getAttribute('data-selected-fields');
  const selectedOption = searchConfigDiv.getAttribute('data-selected-option');

  // Parse the JSON attributes if they exist
  const collections = selectedCollections ? JSON.parse(selectedCollections) : [];
  const fields = selectedFields ? JSON.parse(selectedFields) : [];

  // Log the values to see them
  console.log("Selected Collections:", collections);
  console.log("Selected Fields:", fields);
  console.log("Selected Option:", selectedOption);
} else {
  console.error("❌ 'search-config' div not found.");
}


    
    const form = document.querySelector(".w-form, #search-form");
    const input = document.querySelector("input[name='query']");
    const resultsContainer = document.querySelector(".searchresults");
    const searchableItems = document.querySelectorAll(".search-item");

    const base_url = "https://search-server.long-rain-28bb.workers.dev";

    if (!form || !input || !resultsContainer) {
        console.warn("Search form or elements not found.");
        return;
    }

    // Prevent default form action
    form.removeAttribute("action");
    form.setAttribute("action", "#");

    
   
    // Extract the subdomain from a Webflow-hosted site (e.g., 'search-site-14f0a1' from 'search-site-14f0a1.webflow.io')
    const siteName = window.location.hostname.replace(/^www\./, '').split('.')[0];
    console.log("Current Hostname: ", siteName);

    // Get the visitor session token and hostname
    const token = await getVisitorSessionToken();
    console.log("Generated Token: ", token);

    // Add submit event listener to the search form
    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const query = input.value.trim().toLowerCase();
        if (!query) return;      

    resultsContainer.innerHTML = "<p>Searching...</p>"; // Show loading message

    try {
        const headers = {
            Authorization: `Bearer ${token}`,
        };

       // Perform both page and CMS searches in parallel
        const [pageRes, cmsRes] = await Promise.all([
            fetch(`${base_url}/api/search-index?query=${encodeURIComponent(query)}&siteName=${siteName}`, { headers }),
            fetch(`${base_url}/api/search-cms?query=${encodeURIComponent(query)}&siteName=${siteName}`, { headers }),
        ]);

        const [pageData, cmsData] = await Promise.all([
            pageRes.ok ? pageRes.json() : { results: [] },
            cmsRes.ok ? cmsRes.json() : { results: [] },
        ]);

        const pageResults = Array.isArray(pageData.results) ? pageData.results : [];
        const cmsResults = Array.isArray(cmsData.results) ? cmsData.results : [];

        console.log("Page Results:", pageResults);
        console.log("CMS Results:", cmsResults);


        if (pageResults.length === 0 && cmsResults.length === 0) {
            resultsContainer.innerHTML = "<p>No results found.</p>";
            return;
        }

        let html = "";


        // Render Page Search Results
       if ((selectedOption === "Pages" || selectedOption === "Both") && pageResults.length > 0) {
            html += "<h3>Page Results</h3>";
            html += pageResults
                .map(item =>
                    "<div class='search-result'>" +
                    "<h4><a href='" + item.publishedPath + "' target='_blank'>" +
                    (item.title || item.name || "Untitled") + "</a></h4>" +
                    "<p>" + item.matchedText.slice(0, 200) + "...</p>" +
                    "</div>"
                ).join("");
        }
// Render CMS Search Results if required
      if ((selectedOption === "Collection" || selectedOption === "Both") && cmsResults.length > 0) {
        html += "<h3>CMS Results</h3>";
       html += cmsResults
    .map(item => {
        const title = item.name || item.title || "Untitled";

        const fieldsHtml = Object.entries(item)
    .map(([key, value]) => {
        // Format date strings
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
            value = new Date(value).toLocaleString();
        }

        // Handle image objects
        if (typeof value === 'object' && value !== null) {
            const imageUrl =
                (Array.isArray(value) && typeof value[0]?.url === 'string' && value[0].url) ||
                (typeof value.url === 'string' && value.url) ||
                (typeof value.src === 'string' && value.src) ||
                (typeof value.href === 'string' && value.href);

            if (imageUrl) {
                return `<p><strong>${key}:</strong><br><img src="${imageUrl}" alt="${key}" class="item-image" style="max-width: 100%; border-radius: 4px;" /></p>`;
            }

            return `<p><strong>${key}:</strong> ${JSON.stringify(value)}</p>`;
        }

        // Default rendering
        return `<p><strong>${key}:</strong> ${value}</p>`;
    }).join("");


        return `
        <div style="
            flex: 1 1 calc(33% - 1rem);
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 1rem;
            background: #f9f9f9;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            max-width: calc(33% - 1rem);
        ">
            <h4 style="margin-top: 0;">${title}</h4>
            ${fieldsHtml}
        </div>
        `;
    }).join("");

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

       

            // Display local search results count
            resultsContainer.innerHTML = matchCount
                ? "<p>Found " + matchCount + " result(s) on this page.</p>"
                : "<p>No local matches found.</p>";
        }

        return false;
    });
});
