(function () {
    "use strict";

    var apiBase = window.location.protocol === "file:" ? "http://localhost:51234" : "";
    var form = document.getElementById("filterForm");
    var rows = document.getElementById("rows");
    var message = document.getElementById("message");
    var pdfButton = document.getElementById("pdf");

    function buildQuery() {
        var params = new URLSearchParams();
        [["id", "Id"], ["name", "Name"], ["min", "MinUnitPrice"], ["max", "MaxUnitPrice"]]
            .forEach(function (pair) {
                var value = document.getElementById(pair[0]).value.trim();
                if (value) params.set(pair[1], value);
            });
        return params.toString();
    }

    async function readError(response) {
        try {
            var data = await response.json();
            return data.message || data.Message || "Request failed.";
        } catch (_) {
            return "Request failed with status " + response.status + ".";
        }
    }

    async function loadProducts() {
        message.textContent = "Loading products...";
        try {
            var response = await fetch(apiBase + "/api/products/filter?" + buildQuery());
            if (!response.ok) throw new Error(await readError(response));
            var products = await response.json();
            rows.innerHTML = products.map(function (product) {
                return "<tr><td>" + product.id + "</td><td>" + product.name +
                    "</td><td>" + Number(product.unitPrice).toFixed(2) + "</td><td>" +
                    new Date(product.createdAtUtc).toLocaleDateString() + "</td></tr>";
            }).join("");
            message.textContent = products.length + " product(s) found.";
        } catch (error) {
            rows.innerHTML = "";
            message.textContent = error instanceof TypeError
                ? "The API is unavailable. Run the application, then open /Frontend/product-report.html."
                : error.message;
        }
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        loadProducts();
    });

    pdfButton.addEventListener("click", async function () {
        pdfButton.disabled = true;
        message.textContent = "Preparing PDF...";
        try {
            var response = await fetch(apiBase + "/api/reports/products/pdf?" + buildQuery());
            if (!response.ok) throw new Error(await readError(response));
            var url = URL.createObjectURL(await response.blob());
            var link = document.createElement("a");
            link.href = url;
            link.download = "Products_Filtered_Report.pdf";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            message.textContent = "PDF downloaded.";
        } catch (error) {
            message.textContent = error instanceof TypeError
                ? "The API is unavailable. Run the application and try again."
                : "PDF download failed: " + error.message;
        } finally {
            pdfButton.disabled = false;
        }
    });

    loadProducts();
})();
