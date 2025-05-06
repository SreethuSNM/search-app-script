// Function to get the Site ID dynamically
function getSiteId() {
  // First, check if it's available in data-site-id on <html> tag
  const attrSiteId = document.documentElement.dataset.siteId;
  if (attrSiteId) return attrSiteId;

  // If not, check for the meta tag Webflow includes
  const meta = document.querySelector('meta[name="wf-site"]');
  return meta?.content || null;
}

document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector(".w-form, #search-form");
  const input = document.querySelector("input[name='query']");
  const resultsContainer = document.querySelector(".searchresults");
  const searchableItems = document.querySelectorAll(".search-item");

  if (!form || !input || !resultsContainer) {
    console.warn("Search form or elements not found.");
    return;
  }

  form.removeAttribute("action");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const query = input.value.trim().toLowerCase();
    if (!query) return;

    resultsContainer.innerHTML = "<p>Searching...</p>";

    // Get Site ID here
    const siteId = getSiteId();
    if (!siteId) {
      resultsContainer.innerHTML = "<p>Site ID not found.</p>";
      return;
    }

    // Try remote API search first
    try {
      const res = await fetch(`/api/search-index?query=${encodeURIComponent(query)}&siteId=${siteId}`);
      if (!res.ok) throw new Error("Search failed");

      const data = await res.json();

      if (!Array.isArray(data.results) || data.results.length === 0) {
        resultsContainer.innerHTML = "<p>No results found.</p>";
        return;
      }

      resultsContainer.innerHTML = data.results
        .map(item =>
          "<div class='search-result'>" +
          "<h4><a href='" + item.publishedPath + "' target='_blank'>" +
          (item.title || item.name || "Untitled") +
          "</a></h4>" +
          "<p>" + item.matchedText.slice(0, 200) + "...</p>" +
          "</div>"
        )
        .join("");
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
  });
});

