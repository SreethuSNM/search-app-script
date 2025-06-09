

  document.addEventListener("DOMContentLoaded", () => {
  // === Setup & Styling ===
  const radio1 = document.getElementById('radio');
  const labelSpan = radio1?.parentElement.querySelector('.w-form-label');
  if (labelSpan) labelSpan.textContent = 'Collection Filtering';

  const radio2 = document.getElementById('radio-2');
  const labelSpan2 = radio2?.parentElement.querySelector('.w-form-label');
  if (labelSpan2) labelSpan2.textContent = 'Site search';

  // Get radios
  const radioInputs = document.querySelectorAll('.radiocontainerstyle input[type="radio"]');

  // Set same name for grouping
  radioInputs.forEach(input => input.setAttribute('name', 'searchOption'));

  // Style container
  const container = document.querySelector('.radiocontainerstyle');
  if (container) {
    container.style.display = 'flex';
    container.style.gap = '8px';
    container.style.marginTop = '8px';
    container.style.justifyContent = 'center';

    // Style labels
    const labels = container.querySelectorAll('label.w-radio');
    labels.forEach(label => {
      label.style.padding = '8px 20px';
      label.style.border = '1px solid #8B77F9';
      label.style.borderRadius = '8px';
      label.style.cursor = 'pointer';
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '2px';
      label.style.backgroundColor = '#242137';
      label.style.color = 'white';
    });
  }

  // === Event Handling ===
  radioInputs.forEach(radio => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;

      if (radio.id === "radio") {
        runCollectionFilteringScript();
      } else if (radio.id === "radio-2") {
        runSiteSearchScript();
      }
    });
  });

  // Run on load if pre-selected
  const selected = document.querySelector('input[name="searchOption"]:checked');
  if (selected?.id === "radio") {
    runCollectionFilteringScript();
  } else if (selected?.id === "radio-2") {
    runSiteSearchScript();
  }

  // === Search form & input ===
  const form = document.querySelector(".w-form, #search-form");
  const input = document.querySelector("input[name='query']");
  const searchConfigDiv = document.querySelector("#search-config");
  const submitButton = form?.querySelector("input[type='submit']");
  const searchBarType = searchConfigDiv?.getAttribute("data-search-bar");

  if(input) input.style.borderRadius = "8px";
  if(form) {
    form.removeAttribute("action");
    form.setAttribute("action", "#");
  }

  if (submitButton) submitButton.style.display = "none";

  if (searchBarType === "Icon") {
    if(form) form.style.display = "none";

    const iconContainer = document.querySelector(".searchiconcontainer");
    if (!iconContainer) {
      console.error("'.searchiconcontainer' element not found.");
      return;
    }

    iconContainer.style.cursor = "pointer";
    iconContainer.style.display = ""; // Show icon

    iconContainer.addEventListener("click", () => {
      if(form) form.style.display = "";
      iconContainer.style.display = "none";
      if(input) input.focus();
    });
  } else {
    if(form) form.style.display = "";
    const iconContainer = document.querySelector(".searchiconcontainer");
    if (iconContainer) iconContainer.style.display = "none";
  }

  
  function runSiteSearchScript() {
  console.log("Running Site Search logic");
  

 
    
    if (window.location.pathname === '/search-app-results') return;
    
    
  
    const resultsContainer = document.querySelector(".searchresults");
    
   
    
   
 
   resultsContainer.style.display = "none";


   

    // === Result Type Behavior ===
    const resultType = searchConfigDiv.getAttribute('data-result-type') || "Click on search";
   
    const selectedCollections = JSON.parse(searchConfigDiv.getAttribute('data-selected-collections') || '[]');
    const selectedFieldsSearch = JSON.parse(searchConfigDiv.getAttribute('data-selected-fields-search') || '[]');
    
      const collectionsParam = encodeURIComponent(JSON.stringify(selectedCollections));
    const fieldsSearchParam = encodeURIComponent(JSON.stringify(selectedFieldsSearch));

   
    
   
    
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
              window.location.href = `/search-app-results?q=${encodeURIComponent(selected)}`;
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

  
  };



function runCollectionFilteringScript() {
  console.log("Running Collection Filtering logic");
  
  
  
  const originalList = document.querySelector(".w-dyn-list");
  const allItems = [...document.querySelectorAll(".w-dyn-item")];
  const searchResults = document.querySelector(".searchresults");
  
  

 

  if (!form || !input || !originalList || !searchResults || !searchConfigDiv) {
    console.warn("Search components not found.");
    return;
  }

  

 const paginationType = searchConfigDiv.getAttribute("data-pagination-type")?.toLowerCase() || "none";

  const itemsPerPage = parseInt(searchConfigDiv.getAttribute("data-items-per-page"), 10) || 10;
  
  
const targetCollection = searchConfigDiv.getAttribute("data-target-collection"); // ✅ Add this line


  let currentPage = 1;
  let matchedClones = [];

  // // Dynamically collect all data-* attributes from first item
  // const filterAttrs = new Set();
  // allItems[0]?.getAttributeNames().forEach(attr => {
  //   if (attr.startsWith("data-")) filterAttrs.add(attr);
  // });


  const filterAttrs = new Set();
  // Loop through all elements and collect unique data-* attributes
allItems.forEach(el => {
  el.getAttributeNames().forEach(attr => {
    if (attr.startsWith('data-')) {
      filterAttrs.add(attr);
    }
  });
});

console.log('All unique data-* attributes:', Array.from(filterAttrs));

  // Inject CSS styles dynamically
  const style = document.createElement("style");
  style.textContent = `
    mark {
      background-color: #ffeb3b;
      color: inherit;
      font-weight: bold;
      padding: 0 2px;
      border-radius: 2px;
    }
    .pagination-container {
      clear: both;
      text-align: center;
      margin-top: 10px;
    }
    .pagination-nav button,
    .load-more-btn {
      margin: 0 5px;
      padding: 5px 10px;
      cursor: pointer;
      border: 1px solid #ccc;
      background: white;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }
    .pagination-nav button:hover:not(:disabled),
    .load-more-btn:hover {
      background-color: #eee;
    }
    .pagination-nav button:disabled {
      opacity: 0.6;
      cursor: default;
    }
    .load-more-btn {
      margin-top: 10px;
      padding: 8px 15px;
      cursor: pointer;
    }

   .searchresults {
    width: 100%;
    max-width: 1200px;
    margin: 20px auto;
    padding: 10px;

    
    display: grid !important;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 5px;

    max-height: 80vh;
    overflow-y: auto;
    overflow-x: hidden;

    box-sizing: border-box;
    border-top: 1px solid #e0e0e0;
  }

  .searchresults > * {
    overflow: visible;
  }

.searchformcontainer {
    max-height: 80vh;         /* or any height you prefer */
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 10px;
    box-sizing: border-box;
  }

  .searchformcontainer::-webkit-scrollbar {
    width: 8px;
  }

  .searchformcontainer::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 4px;
  }
  `;
  document.head.appendChild(style);

  

  // Recursive highlight function
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

  // Render search results with pagination
  function render(page = 1) {
    searchResults.innerHTML = "";
    currentPage = page;

    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = matchedClones.slice(start, end).map(item => item.cloneNode(true));

    if (pageItems.length === 0) {
      const msg = document.createElement("div");
      msg.textContent = "No results found.";
      searchResults.appendChild(msg);
      return;
    }

    pageItems.forEach(item => {
    
        searchResults.appendChild(item);

    });

    const paginationContainer = document.createElement("div");
    paginationContainer.className = "pagination-container";

    if (paginationType === "load-more" && end < matchedClones.length) {
      const btn = document.createElement("button");
      btn.textContent = "Load more";
      btn.className = "load-more-btn";
      btn.onclick = () => render(currentPage + 1);
      paginationContainer.appendChild(btn);
    }

    if (paginationType === "numbered") {
      const totalPages = Math.ceil(matchedClones.length / itemsPerPage);
      if (totalPages > 1) {
        const nav = document.createElement("div");
        nav.className = "pagination-nav";
        for (let i = 1; i <= totalPages; i++) {
          const btn = document.createElement("button");
          btn.textContent = i;
          if (i === page) btn.disabled = true;
          btn.onclick = () => render(i);
          nav.appendChild(btn);
        }
        paginationContainer.appendChild(nav);
      }
    }

    if (paginationContainer.children.length > 0) {
      searchResults.appendChild(paginationContainer);
    }
  }

  


  // Search input logic
  input.addEventListener("input", () => {
    const query = input.value.toLowerCase().trim();
    matchedClones = [];
    
    console.log("Target collection:", targetCollection);

    if (!query) {
      originalList.style.display = "block";
      searchResults.innerHTML = "";
      return;
    }

    originalList.style.display = "none";

    allItems.forEach(item => {
        
      const matches = [...filterAttrs].some(attr => {
        const attrVal = (item.getAttribute(attr) || "").toLowerCase();
        return attrVal.includes(query);
      });

      if (matches) {
        const clone = item.cloneNode(true);
        [...clone.querySelectorAll("*")].forEach(el => {
          if ((el.textContent || "").toLowerCase().includes(query)) {
            highlightText(el, query);
          }
        });
        matchedClones.push(clone);
      }
    });

    currentPage = 1;
    render(currentPage);
  });
};
  
  
});
  

