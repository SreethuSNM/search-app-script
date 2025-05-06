document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector(".w-form, #search-form");
  const input = document.querySelector("input[name='query']");
  const resultsContainer = document.querySelector(".searchresults");
  const searchableItems = document.querySelectorAll(".search-item");

  const config = window.__SEARCH_CONFIG__;
  const siteId = config?.siteId;
  const apiBaseUrl = config?.apiBaseUrl;
  const token = config?.token;


  // Log individual values to ensure they are correctly populated
  console.log('siteId:', siteId);
  console.log('apiBaseUrl:', apiBaseUrl);
  console.log('token:', token);

  if (!form || !input || !resultsContainer) {
    console.warn("Search form or elements not found.");
    return;
  }

  if (form) {
    form.removeAttribute("action");
    form.setAttribute("action", "#");
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const query = input.value.trim().toLowerCase();
    if (!query) return;

    resultsContainer.innerHTML = "<p>Searching...</p>";

    try {
      const res = await fetch(`${apiBaseUrl}/api/search-index?query=${encodeURIComponent(query)}&siteId=${siteId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

    return false;
  });
});
