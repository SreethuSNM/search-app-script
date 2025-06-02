<script>
  
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

  document.addEventListener('DOMContentLoaded', function () {
    
    if (window.location.pathname === '/search-results') return;
    
    const form = document.querySelector(".w-form, #search-form");
    const input = document.querySelector("input[name='query']");
    const searchConfigDiv = document.querySelector("#search-config");
    

  
    

    if (!form || !input || !searchConfigDiv) return;

    // === Result Type Behavior ===
    const resultType = searchConfigDiv.getAttribute('data-result-type') || "Click on search";
    const searchBarType = searchConfigDiv.getAttribute('data-search-bar');
    const selectedCollections = JSON.parse(searchConfigDiv.getAttribute('data-selected-collections') || '[]');
    const selectedFieldsSearch = JSON.parse(searchConfigDiv.getAttribute('data-selected-fields-search') || '[]');
    
      const collectionsParam = encodeURIComponent(JSON.stringify(selectedCollections));
    const fieldsSearchParam = encodeURIComponent(JSON.stringify(selectedFieldsSearch));

    // Hide submit button if Auto result
    const submitButton = form.querySelector("input[type='submit']");
    if (submitButton) {
  submitButton.addEventListener('click', () => {
    // Add press animation effect
    submitButton.style.transition = 'transform 0.1s ease, box-shadow 0.1s ease';
    submitButton.style.transform = 'scale(0.95)';
    submitButton.style.boxShadow = 'inset 0 0 5px rgba(0,0,0,0.2)';

    // Revert the button after a short delay
    setTimeout(() => {
      submitButton.style.transform = 'scale(1)';
      submitButton.style.boxShadow = '';
    }, 150);
  });
}

    if (resultType === "Auto result" && submitButton) {
      submitButton.style.display = "none";
    }

    // === Search Bar Display Mode ===
    if (searchBarType === "Icon") {
      // Hide form, show icon
      form.style.display = "none";
      const iconContainer = document.querySelector(".searchiconcontainer");
      if (!iconContainer) {
        console.error("'.searchiconcontainer' element not found.");
        return;
      }

      iconContainer.style.cursor = "pointer";
      iconContainer.style.display = ""; // Show icon

      iconContainer.addEventListener("click", () => {
        form.style.display = "";
        iconContainer.style.display = "none";
        input.focus();
      });
    } else {
      // Expanded: show form, hide icon if exists
      form.style.display = "";
      const iconContainer = document.querySelector(".searchiconcontainer");
      if (iconContainer) iconContainer.style.display = "none";
    }

    
    // Inject styles dynamically for suggestions
    const style = document.createElement("style");
    style.textContent = `
     .searchsuggestionbox {
  position: absolute;
  top: 100%;           /* Places it directly below the input */
  left: 0;
  background: white;
  border: 1px solid #ccc;
  max-height: 200px;
  overflow-y: auto;
  width: 100%;
  display: none;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
      .suggestion-item {
        padding: 8px;
        cursor: pointer;
      }
      .suggestion-item:hover {
        background-color: #eee;
      }
    `;
    document.head.appendChild(style);
    // === Suggestion Box ===
    let suggestionBox = document.querySelector(".searchsuggestionbox");
    if (!suggestionBox) {
      suggestionBox = document.createElement("div");
      suggestionBox.className = "searchsuggestionbox";
      input.parentNode.style.position = "relative";
      input.parentNode.appendChild(suggestionBox);
    }

    input.addEventListener("input", async () => {
      const query = input.value.trim();
      if (!query) {
        suggestionBox.style.display = "none";
        suggestionBox.innerHTML = "";
        return;
      }

      try {
      
       
        
        const siteName = window.location.hostname.replace(/^www\./, '').split('.')[0];

        const url = `https://search-server.long-rain-28bb.workers.dev/api/suggestions?query=${encodeURIComponent(query)}&siteName=${encodeURIComponent(siteName)}&collections=${collectionsParam}&searchFields=${fieldsSearchParam}`;
        const response = await fetch(url);

        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();

        if (data.suggestions && data.suggestions.length > 0) {
          suggestionBox.style.display = "block";
          suggestionBox.innerHTML = data.suggestions
            .map(s => `<div class="suggestion-item">${s}</div>`)
            .join("");

          suggestionBox.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
              const selected = item.textContent;
              window.location.href = `/search-results?q=${encodeURIComponent(selected)}`;
            });
          });

        } else {
          suggestionBox.style.display = "none";
          suggestionBox.innerHTML = "";
        }
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
        suggestionBox.style.display = "none";
        suggestionBox.innerHTML = "";
      }
    });

    // === Form Submit Redirect ===
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const query = encodeURIComponent(input.value.trim());
      if (query) {
        window.location.href = `/search-results?q=${query}`;
      }
    });
  });
</script>
