
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
    
    if (window.location.pathname === '/search-app-results') return;
    
   
    const input = document.querySelector(".searchformwrapper input[type='text']");
   
 // === Only run suggestion + redirect logic if .searchformwrapper input exists ===
  if (input) {
    

  input.placeholder = "Search here";
  input.style.borderRadius = "8px"; // (your existing style)

    
    const searchConfigDiv = document.querySelector("#search-config");
    
    
   
   


   


    // === Result Type Behavior ===
    
    const searchBarType = searchConfigDiv.getAttribute('data-search-bar');
    const selectedCollections = JSON.parse(searchConfigDiv.getAttribute('data-selected-collections') || '[]');
    const selectedFieldsSearch = JSON.parse(searchConfigDiv.getAttribute('data-selected-fields-search') || '[]');
    
      const collectionsParam = encodeURIComponent(JSON.stringify(selectedCollections));
    const fieldsSearchParam = encodeURIComponent(JSON.stringify(selectedFieldsSearch));

   
    
    // === Search Bar Display Mode ===
    if (searchBarType === "Icon") {
      // Hide form, show icon
      input.style.display = "none";
      const iconContainer = document.querySelector(".searchiconcontainer");
      if (!iconContainer) {
        console.error("'.searchiconcontainer' element not found.");
        return;
      }

      iconContainer.style.cursor = "pointer";
      iconContainer.style.display = ""; // Show icon

      iconContainer.addEventListener("click", () => {
        input.style.display = "";
        iconContainer.style.display = "none";
        input.focus();
      });
    } else {
      // Expanded: show form, hide icon if exists
      input.style.display = "";
      const iconContainer = document.querySelector(".searchiconcontainer");
      if (iconContainer) iconContainer.style.display = "none";
    }

    
    // Inject styles dynamically for suggestions

   function sanitizeText(text) {
  const div = document.createElement("div");
  div.innerHTML = text;
  return div.textContent || div.innerText || "";
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
  );
}
   
const style = document.createElement("style");
style.textContent = `
 .searchsuggestionbox {
    position: absolute;
    top: 100%;
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

  .searchsuggestionbox .suggestion-item {
    padding: 8px;
    cursor: pointer;
    color: black !important;
    font-size: 12px !important;
    font-family: 'Inter', 'Arial', sans-serif !important;
    line-height: 1.4;
    background: white !important;
    border: none !important;
    text-transform: capitalize !important;
    white-space: normal;
  }

  .searchsuggestionbox .suggestion-item:hover {
    background-color: #eee;
  }
  .searchsuggestionbox .view-all-link {
    padding: 10px;
    text-align: center;
    font-weight: bold;
    color: #0073e6 !important;
    cursor: pointer;
    border-top: 1px solid #eee;
    background: #fafafa;
    font-family: Arial, sans-serif !important;
    font-size: 16px !important;
  }
`;
document.head.appendChild(style);


    
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
  .map((s, i) => {
    const cleanText = sanitizeText(s);
    const displayText = toTitleCase(cleanText); // consistent styling
    const url = data.detailUrls?.[i] || `/search-results?q=${encodeURIComponent(cleanText)}`;
    return `<div class="suggestion-item" data-url="${url}">${displayText}</div>`;
  })
  .join("");


      suggestionBox.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          const url = item.getAttribute("data-url");
          window.location.href = url;
        });
      });
      
    
// "View All" link
const viewAllLink = document.createElement("div");
viewAllLink.className = "view-all-link";
viewAllLink.textContent = "View All";
viewAllLink.style.cssText = `
  padding: 10px;
  text-align: center;
  font-weight: bold;
  color: #0073e6;
  cursor: pointer;
  border-top: 1px solid #eee;
  background: #fafafa;
`;
// viewAllLink.addEventListener("click", () => {
//   window.location.href = `/search-app-results?q=${encodeURIComponent(query)}`;
// });

     viewAllLink.addEventListener("click", () => {
  const latestQuery = input.value.trim();
  window.location.href = `/search-app-results?q=${encodeURIComponent(latestQuery)}`;
});

// Append View All link inside the suggestion box
suggestionBox.appendChild(viewAllLink);
suggestionBox.style.display = "block";


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

  }



 const filterinput = document.querySelector(".searchfilterformcontainer input"); 
const allItems = [...document.querySelectorAll(".w-dyn-item")];

   if (!filterinput || allItems.length === 0) {
  console.warn("Search input or items not found.");
  return;
}

   // === Only run filtering + pagination if .searchfilterformcontainer input exists ===
  if (filterinput && allItems.length > 0) {



// Style the search input
filterinput.placeholder = "Search here";
filterinput.style.borderRadius = "8px";
filterinput.style.margin = "0 16px";
filterinput.style.width = "50%";

// Collect all unique data-* attributes from all items
const filterAttrs = new Set();
allItems.forEach(el => {
  el.getAttributeNames().forEach(attr => {
    if (attr.startsWith("data-")) {
      filterAttrs.add(attr);
    }
  });
});

// Inject CSS for highlight
const highlightStyle = document.createElement("style");
highlightStyle.textContent = `
  mark {
    background-color: #ffeb3b;
    color: inherit;
    font-weight: bold;
    padding: 0 2px;
    border-radius: 2px;
  }
`;
document.head.appendChild(highlightStyle);

// Remove existing highlights
function removeAllHighlights(item) {
  item.querySelectorAll("mark").forEach(mark => {
    const parent = mark.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    }
  });
}

// Highlight matching text
function highlightText(element, query) {
  const regex = new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), "gi");
  element.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE && regex.test(node.textContent)) {
      const span = document.createElement("span");
      span.innerHTML = node.textContent.replace(regex, match => `<mark>${match}</mark>`);
      element.replaceChild(span, node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      highlightText(node, query);
    }
  });
}

// Pagination logic
const itemsPerPage = 10;
let currentPage = 1;
let filteredItems = [...allItems];

// Create pagination container
const paginationContainer = document.createElement("div");
paginationContainer.style.display = "flex";
paginationContainer.style.gap = "8px";
paginationContainer.style.marginTop = "20px";
paginationContainer.style.flexWrap = "wrap";
paginationContainer.style.justifyContent = "center";
document.querySelector(".w-dyn-items")?.after(paginationContainer);

// Render pagination buttons
function renderPagination(totalItems) {
  paginationContainer.innerHTML = "";
  const pageCount = Math.ceil(totalItems / itemsPerPage);

  for (let i = 1; i <= pageCount; i++) {
    const button = document.createElement("button");
    button.textContent = i;
    button.style.padding = "6px 12px";
    button.style.border = "1px solid black";
    button.style.color = "orange";
    button.style.borderRadius = "4px";
    button.style.cursor = "pointer";
    button.style.background = i === currentPage ? "#ffe0b3" : "transparent";

    button.addEventListener("click", () => {
      currentPage = i;
      showPage();
    });

    paginationContainer.appendChild(button);
  }
}

// Show current page items
function showPage() {
  allItems.forEach(item => item.style.display = "none");
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const itemsToShow = filteredItems.slice(start, end);
  itemsToShow.forEach(item => item.style.display = "");
  renderPagination(filteredItems.length);
}

// Main search input listener with pagination
filterinput.addEventListener("input", () => {
  const query = filterinput.value.toLowerCase().trim();

  filteredItems = allItems.filter(item => {
    removeAllHighlights(item);

    const matches = [...filterAttrs].some(attr => {
      const val = (item.getAttribute(attr) || "").toLowerCase();
      return val.includes(query);
    });

    if (query && matches) {
      [...item.querySelectorAll("*")].forEach(el => {
        if ((el.textContent || "").toLowerCase().includes(query)) {
          highlightText(el, query);
        }
      });
      return true;
    } else if (!query) {
      return true;
    }
    return false;
  });

  currentPage = 1;
  showPage();
});

// Initial display
showPage();

  }

  
  });


