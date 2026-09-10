document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const form = document.getElementById("travelForm");
    const methodInput = document.getElementById("prompting_method");
    const submitButton = document.getElementById("submitButton");
    const submitText = document.getElementById("submitText");

    const emptyState = document.getElementById("emptyState");
    const loadingState = document.getElementById("loadingState");
    const itinerary = document.getElementById("itinerary");

    const errorState = document.getElementById("errorState");
    const errorMessage = document.getElementById("errorMessage");
    const retryButton = document.getElementById("retryButton");

    const resultMethod = document.getElementById("resultMethod");

    // Selectors
    const interestButtons = document.querySelectorAll(".interest-button");
    const methodCards = document.querySelectorAll(".method-card");

    let selectedInterests = [];

    /* -------------------------------------------------------------------------
       1. INTEREST SELECTION
    ------------------------------------------------------------------------- */
    interestButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const interest = button.dataset.interest;

            if (selectedInterests.includes(interest)) {
                selectedInterests = selectedInterests.filter(
                    (item) => item !== interest
                );
                button.classList.remove("selected");

                const indicator = button.querySelector("span:last-child");
                if (indicator) {
                    indicator.textContent = "+";
                }
            } else {
                selectedInterests.push(interest);
                button.classList.add("selected");

                const indicator = button.querySelector("span:last-child");
                if (indicator) {
                    indicator.textContent = "✓";
                }
            }
        });
    });

    /* -------------------------------------------------------------------------
       2. PROMPTING METHOD SELECTION
    ------------------------------------------------------------------------- */
    const methodLabels = {
        "zero-shot": "Zero-Shot",
        "few-shot": "Few-Shot",
        "structured": "Structured"
    };

    methodCards.forEach((card) => {
        card.addEventListener("click", () => {
            methodCards.forEach((item) => {
                item.classList.remove("active");
            });

            card.classList.add("active");
            const method = card.dataset.method;

            if (methodInput) {
                methodInput.value = method;
            }

            if (resultMethod) {
                resultMethod.textContent = methodLabels[method] || method;
            }
        });
    });

    /* -------------------------------------------------------------------------
       3. MARKDOWN PARSER
    ------------------------------------------------------------------------- */
    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function inlineMarkdown(text) {
        let result = escapeHtml(text);

        // Inline code `code`
        result = result.replace(/`([^`]+)`/g, "<code>$1</code>");

        // Bold **text** or __text__
        result = result.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");

        // Italic *text* or _text_
        result = result.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");

        return result;
    }

    function markdownToHtml(markdown) {
        if (!markdown) return "";

        const lines = String(markdown)
            .replace(/\r/g, "")
            .split("\n");

        let html = "";
        let currentList = null; // "ul" or "ol"
        let inTable = false;

        function closeList() {
            if (currentList) {
                html += currentList === "ul" ? "</ul>" : "</ol>";
                currentList = null;
            }
        }

        function closeTable() {
            if (inTable) {
                html += "</tbody></table>";
                inTable = false;
            }
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (!line) {
                closeList();
                closeTable();
                continue;
            }

            // Horizontal Rule
            if (/^(---|[*]{3}|_{3})$/.test(line)) {
                closeList();
                closeTable();
                html += "<hr>";
                continue;
            }

            // Table Row
            if (line.startsWith("|") && line.endsWith("|")) {
                closeList();

                const cells = line
                    .slice(1, -1)
                    .split("|")
                    .map((cell) => cell.trim());

                const isSeparator = cells.every((cell) =>
                    /^:?-+:?$/.test(cell)
                );

                if (isSeparator) {
                    continue;
                }

                if (!inTable) {
                    html += "<table><thead><tr>";
                    cells.forEach((cell) => {
                        html += `<th>${inlineMarkdown(cell)}</th>`;
                    });
                    html += "</tr></thead><tbody>";
                    inTable = true;
                } else {
                    html += "<tr>";
                    cells.forEach((cell) => {
                        html += `<td>${inlineMarkdown(cell)}</td>`;
                    });
                    html += "</tr>";
                }
                continue;
            }

            closeTable();

            // Headings
            if (line.startsWith("#### ")) {
                closeList();
                html += `<h4>${inlineMarkdown(line.slice(5))}</h4>`;
                continue;
            }

            if (line.startsWith("### ")) {
                closeList();
                html += `<h3>${inlineMarkdown(line.slice(4))}</h3>`;
                continue;
            }

            if (line.startsWith("## ")) {
                closeList();
                html += `<h2>${inlineMarkdown(line.slice(3))}</h2>`;
                continue;
            }

            if (line.startsWith("# ")) {
                closeList();
                html += `<h1>${inlineMarkdown(line.slice(2))}</h1>`;
                continue;
            }

            // Blockquote
            if (line.startsWith("> ")) {
                closeList();
                html += `<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`;
                continue;
            }

            // Bullet List (- item or * item or + item)
            if (/^[-*+]\s+/.test(line)) {
                if (currentList !== "ul") {
                    closeList();
                    html += "<ul>";
                    currentList = "ul";
                }
                const content = line.replace(/^[-*+]\s+/, "");
                html += `<li>${inlineMarkdown(content)}</li>`;
                continue;
            }

            // Numbered List (1. item)
            if (/^\d+\.\s+/.test(line)) {
                if (currentList !== "ol") {
                    closeList();
                    html += "<ol>";
                    currentList = "ol";
                }
                const content = line.replace(/^\d+\.\s+/, "");
                html += `<li>${inlineMarkdown(content)}</li>`;
                continue;
            }

            // Regular Paragraph
            closeList();
            html += `<p>${inlineMarkdown(line)}</p>`;
        }

        closeList();
        closeTable();

        return html;
    }

    /* -------------------------------------------------------------------------
       4. UI STATE MANAGERS
    ------------------------------------------------------------------------- */
    function showEmpty() {
        if (emptyState) emptyState.hidden = false;
        if (loadingState) loadingState.hidden = true;
        if (itinerary) itinerary.hidden = true;
        if (errorState) errorState.hidden = true;
    }

    function showLoading() {
        if (emptyState) emptyState.hidden = true;
        if (loadingState) loadingState.hidden = false;
        if (itinerary) itinerary.hidden = true;
        if (errorState) errorState.hidden = true;
    }

    function showItinerary(content) {
        if (emptyState) emptyState.hidden = true;
        if (loadingState) loadingState.hidden = true;
        if (itinerary) {
            itinerary.hidden = false;
            itinerary.innerHTML = markdownToHtml(content);
        }
        if (errorState) errorState.hidden = true;

        const results = document.querySelector(".results");
        if (results) {
            window.scrollTo({
                top: results.offsetTop - 30,
                behavior: "smooth"
            });
        }
    }

    function showError(message) {
        if (emptyState) emptyState.hidden = true;
        if (loadingState) loadingState.hidden = true;
        if (itinerary) itinerary.hidden = true;
        if (errorState) {
            errorState.hidden = false;
            if (errorMessage) {
                errorMessage.textContent = message || "Please try again.";
            }
        }
    }

    /* -------------------------------------------------------------------------
       5. FORM SUBMISSION
    ------------------------------------------------------------------------- */
    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const nameInput = document.getElementById("name");
            const destinationInput = document.getElementById("destination");
            const daysInput = document.getElementById("days");
            const budgetInput = document.getElementById("budget");

            const name = nameInput ? nameInput.value.trim() : "";
            const destination = destinationInput ? destinationInput.value.trim() : "";
            const days = daysInput ? Number(daysInput.value) : 0;
            const budget = budgetInput ? Number(budgetInput.value) : 0;

            const travelStyleRadio = document.querySelector(
                'input[name="travel_style"]:checked'
            );
            const travelStyle = travelStyleRadio ? travelStyleRadio.value : "";
            const method = methodInput ? methodInput.value : "zero-shot";

            // Validations
            if (!name) {
                showError("Please enter your name.");
                return;
            }

            if (!destination) {
                showError("Please enter a destination.");
                return;
            }

            if (!days || days < 1 || days > 30) {
                showError("Please enter a valid number of travel days (1 to 30).");
                return;
            }

            if (!budget || budget <= 0) {
                showError("Please enter a valid budget amount.");
                return;
            }

            if (selectedInterests.length === 0) {
                showError("Please select at least one interest.");
                return;
            }

            if (!travelStyle) {
                showError("Please select a travel style.");
                return;
            }

            if (!method) {
                showError("Please choose a prompting method.");
                return;
            }

            const payload = {
                name: name,
                destination: destination,
                days: days,
                budget: budget,
                interests: selectedInterests,
                travel_style: travelStyle,
                method: method
            };

            console.log("Sending travel request:", payload);

            showLoading();

            if (submitButton) submitButton.disabled = true;
            if (submitText) submitText.textContent = "Weaving your journey...";

            try {
                const response = await fetch("/api/plan", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                let data;
                try {
                    data = await response.json();
                } catch {
                    throw new Error("The server returned an invalid JSON response.");
                }

                console.log("Server response:", data);

                if (!response.ok) {
                    throw new Error(
                        data.detail || "Unable to generate your itinerary."
                    );
                }

                if (!data.itinerary) {
                    throw new Error("Gemini returned an empty itinerary.");
                }

                if (resultMethod) {
                    resultMethod.textContent = methodLabels[data.method] || data.method;
                }

                showItinerary(data.itinerary);

            } catch (error) {
                console.error("Travel planner error:", error);
                showError(
                    error.message || "Unable to generate the itinerary. Please try again."
                );
            } finally {
                if (submitButton) submitButton.disabled = false;
                if (submitText) submitText.textContent = "Weave my journey";
            }
        });
    }

    /* -------------------------------------------------------------------------
       6. RETRY BUTTON
    ------------------------------------------------------------------------- */
    if (retryButton && form) {
        retryButton.addEventListener("click", () => {
            form.dispatchEvent(
                new Event("submit", {
                    bubbles: true,
                    cancelable: true
                })
            );
        });
    }

    /* -------------------------------------------------------------------------
       7. INITIAL PAGE LOAD
    ------------------------------------------------------------------------- */
    showEmpty();
});