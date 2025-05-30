
  document.addEventListener('DOMContentLoaded', function () {
    const form = document.querySelector(".w-form, #search-form");
    const input = document.querySelector("input[name='query']");
    const searchConfigDiv = document.querySelector("#search-config");

    if (!form || !input || !searchConfigDiv) return;

    // === Result Type Behavior ===
    const resultType = searchConfigDiv.getAttribute('data-result-type') || "Click on search";
    const searchBarType = searchConfigDiv.getAttribute('data-search-bar');

    // Hide submit button if Auto result
    const submitButton = form.querySelector("input[type='submit']");
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
        const siteName = searchConfigDiv.dataset.siteName || "";
        const collectionsParam = searchConfigDiv.dataset.collections || "";
        const fieldsSearchParam = searchConfigDiv.dataset.searchFields || "";

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
