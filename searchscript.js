console.log("Helloo");

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
       
       
        
           function cleanHostname(hostname) {
          const withoutWWW = hostname.replace(/^www\./, '');
          return withoutWWW.split('.')[0];
         }
        const rawHostname = window.location.hostname;
        
     const siteName = cleanHostname(rawHostname);
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
        function cleanHostname(hostname) {
          const withoutWWW = hostname.replace(/^www\./, '');
          return withoutWWW.split('.')[0];
         }
     const rawHostname = window.location.hostname;
    
    const siteName = cleanHostname(rawHostname);
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
            // Fetch results from the API
            const res = await fetch(`${base_url}/api/search-index?query=${encodeURIComponent(query)}&siteName=${siteName}`, {
                headers: {
                    Authorization: `Bearer ${token}`, // Pass the token for authentication
                },
            });

            if (!res.ok) throw new Error("Search failed");

            const data = await res.json(); // Parse the response data

            // If no results or not an array, display "No results found"
            if (!Array.isArray(data.results) || data.results.length === 0) {
                resultsContainer.innerHTML = "<p>No results found.</p>";
                return;
            }

            // Display search results
            resultsContainer.innerHTML = data.results
                .map(item =>
                    "<div class='search-result'>" +
                    "<h4><a href='" + item.publishedPath + "' target='_blank'>" +
                    (item.title || item.name || "Untitled") + "</a></h4>" +
                    "<p>" + item.matchedText.slice(0, 200) + "...</p>" +
                    "</div>"
                )
                .join(""); // Render the results dynamically

        } catch (error) {
            console.warn("API search failed, falling back to page search.");

            let matchCount = 0;
            searchableItems.forEach(item => {
                const text = item.textContent?.toLowerCase() || "";
                const isMatch = text.includes(query);
                item.style.display = isMatch ? "" : "none"; // Hide non-matching items
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
