document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("travelForm");

    const interestButtons =
        document.querySelectorAll(".interest-button");

    const methodCards =
        document.querySelectorAll(".method-card");

    const methodInput =
        document.getElementById("prompting_method");

    const submitButton =
        document.getElementById("submitButton");

    const submitText =
        document.getElementById("submitText");

    const emptyState =
        document.getElementById("emptyState");

    const loadingState =
        document.getElementById("loadingState");

    const itinerary =
        document.getElementById("itinerary");

    const errorState =
        document.getElementById("errorState");

    const errorMessage =
        document.getElementById("errorMessage");

    const retryButton =
        document.getElementById("retryButton");

    const resultMethod =
        document.getElementById("resultMethod");


    let selectedInterests = [];


    /* INTEREST SELECTION */

    interestButtons.forEach((button) => {

        button.addEventListener("click", () => {

            const interest =
                button.dataset.interest;

            if (selectedInterests.includes(interest)) {

                selectedInterests =
                    selectedInterests.filter(
                        item => item !== interest
                    );

                button.classList.remove("selected");

                button.querySelector("span:last-child").textContent = "+";

            } else {

                selectedInterests.push(interest);

                button.classList.add("selected");

                button.querySelector("span:last-child").textContent = "✓";
            }

        });

    });


    /* PROMPTING METHOD */

    methodCards.forEach((card) => {

        card.addEventListener("click", () => {

            methodCards.forEach((item) => {
                item.classList.remove("active");
            });

            card.classList.add("active");

            const method =
                card.dataset.method;

            methodInput.value = method;

            const labels = {
                "zero-shot": "Zero-Shot",
                "few-shot": "Few-Shot",
                "structured": "Structured"
            };

            resultMethod.textContent =
                labels[method] || method;

        });

    });


    /* MARKDOWN */

    function escapeHtml(text) {

        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function inlineMarkdown(text) {

        let result = escapeHtml(text);

        result = result.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );

        result = result.replace(
            /\*(.*?)\*/g,
            "<em>$1</em>"
        );

        result = result.replace(
            /`(.*?)`/g,
            "<code>$1</code>"
        );

        return result;
    }


    function markdownToHtml(markdown) {

        const lines =
            markdown.replace(/\r/g, "").split("\n");

        let html = "";

        let inList = false;
        let inTable = false;
        let tableHeader = false;


        function closeList() {

            if (inList) {
                html += "</ul>";
                inList = false;
            }

        }


        function closeTable() {

            if (inTable) {
                html += "</tbody></table>";
                inTable = false;
                tableHeader = false;
            }

        }


        for (let i = 0; i < lines.length; i++) {

            const rawLine = lines[i];
            const line = rawLine.trim();

            if (!line) {
                closeList();
                continue;
            }


            /* TABLE */

            if (line.startsWith("|") && line.endsWith("|")) {

                const cells =
                    line
                        .slice(1, -1)
                        .split("|")
                        .map(cell => cell.trim());

                const isSeparator =
                    cells.every(cell =>
                        /^:?-+:?$/.test(cell)
                    );

                if (isSeparator) {
                    tableHeader = true;
                    continue;
                }

                if (!inTable) {

                    closeList();

                    html += "<table><thead><tr>";

                    cells.forEach(cell => {
                        html += `<th>${inlineMarkdown(cell)}</th>`;
                    });

                    html += "</tr></thead><tbody>";

                    inTable = true;

                } else {

                    html += "<tr>";

                    cells.forEach(cell => {
                        html += `<td>${inlineMarkdown(cell)}</td>`;
                    });

                    html += "</tr>";
                }

                continue;
            }

            closeTable();


            /* HEADINGS */

            if (line.startsWith("### ")) {

                closeList();

                html += `<h3>${inlineMarkdown(
                    line.slice(4)
                )}</h3>`;

                continue;
            }


            if (line.startsWith("## ")) {

                closeList();

                html += `<h2>${inlineMarkdown(
                    line.slice(3)
                )}</h2>`;

                continue;
            }


            if (line.startsWith("# ")) {

                closeList();

                html += `<h1>${inlineMarkdown(
                    line.slice(2)
                )}</h1>`;

                continue;
            }


            /* BULLET */

            if (/^[-*]\s+/.test(line)) {

                if (!inList) {

                    html += "<ul>";
                    inList = true;

                }

                html += `<li>${inlineMarkdown(
                    line.replace(/^[-*]\s+/, "")
                )}</li>`;

                continue;
            }


            /* NUMBERED LIST */

            if (/^\d+\.\s+/.test(line)) {

                if (!inList) {

                    html += "<ul>";
                    inList = true;

                }

                html += `<li>${inlineMarkdown(
                    line.replace(/^\d+\.\s+/, "")
                )}</li>`;

                continue;
            }


            /* BLOCKQUOTE */

            if (line.startsWith("> ")) {

                closeList();

                html += `<blockquote>${inlineMarkdown(
                    line.slice(2)
                )}</blockquote>`;

                continue;
            }


            /* NORMAL PARAGRAPH */

            closeList();

            html += `<p>${inlineMarkdown(line)}</p>`;
        }

        closeList();
        closeTable();

        return html;
    }


    /* UI STATES */

    function showEmpty() {

        emptyState.hidden = false;
        loadingState.hidden = true;
        itinerary.hidden = true;
        errorState.hidden = true;

    }


    function showLoading() {

        emptyState.hidden = true;
        loadingState.hidden = false;
        itinerary.hidden = true;
        errorState.hidden = true;

    }


    function showItinerary(content) {

        emptyState.hidden = true;
        loadingState.hidden = true;
        itinerary.hidden = false;
        errorState.hidden = true;

        itinerary.innerHTML =
            markdownToHtml(content);

        window.scrollTo({
            top: document.querySelector(".results").offsetTop - 30,
            behavior: "smooth"
        });

    }


    function showError(message) {

        emptyState.hidden = true;
        loadingState.hidden = true;
        itinerary.hidden = true;
        errorState.hidden = false;

        errorMessage.textContent =
            message || "Please try again.";

    }


    /* FORM SUBMISSION */

    form.addEventListener("submit", async (event) => {

        event.preventDefault();


        const name =
            document.getElementById("name").value.trim();

        const destination =
            document.getElementById("destination").value.trim();

        const days =
            Number(document.getElementById("days").value);

        const budget =
            Number(document.getElementById("budget").value);

        const travelStyle =
            document.querySelector(
                'input[name="travel_style"]:checked'
            )?.value;


        if (!name) {
            showError("Please enter your name.");
            return;
        }


        if (!destination) {
            showError("Please enter a destination.");
            return;
        }


        if (!days || days < 1) {
            showError("Please enter a valid number of travel days.");
            return;
        }


        if (!budget || budget <= 0) {
            showError("Please enter a valid budget.");
            return;
        }


        if (selectedInterests.length === 0) {
            showError("Please select at least one interest.");
            return;
        }


        if (!travelStyle) {
            showError("Please choose a travel style.");
            return;
        }


        const method =
            methodInput.value;


        const payload = {
            name: name,
            destination: destination,
            days: days,
            budget: budget,
            interests: selectedInterests,
            travel_style: travelStyle,
            method: method
        };


        showLoading();


        submitButton.disabled = true;

        submitText.textContent =
            "Weaving your journey...";


        try {

            const response =
                await fetch("/api/plan", {

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
                throw new Error(
                    "The server returned an invalid response."
                );
            }


            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Unable to generate your itinerary."
                );

            }


            if (!data.itinerary) {

                throw new Error(
                    "Gemini returned an empty itinerary."
                );

            }


            const methodNames = {
                "zero-shot": "Zero-Shot",
                "few-shot": "Few-Shot",
                "structured": "Structured"
            };


            resultMethod.textContent =
                methodNames[data.method] ||
                data.method;


            showItinerary(data.itinerary);


        } catch (error) {

            console.error("Travel planner error:", error);

            showError(
                error.message ||
                "Unable to generate the itinerary. Please try again."
            );

        } finally {

            submitButton.disabled = false;

            submitText.textContent =
                "Weave my journey";

        }

    });


    /* RETRY */

    retryButton.addEventListener("click", () => {

        form.dispatchEvent(
            new Event("submit", {
                bubbles: true,
                cancelable: true
            })
        );

    });


    showEmpty();

});