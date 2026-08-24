(function (window, document, $) {
    "use strict";

    if (!$) {
        var messageBox = document.getElementById("messageBox");
        messageBox.hidden = false;
        messageBox.className = "message-box message-error";
        messageBox.textContent =
            "jQuery could not be loaded. Check the internet connection and reload the page.";
        return;
    }

    var config = window.appConfig || { apiBaseUrl: "" };
    var state = {
        allInvoices: [],
        selectedInvoiceId: null,
        isLoadingInvoices: false,
        isLoadingDetails: false
    };

    var currencyFormatter = new Intl.NumberFormat("en-BD", {
        style: "currency",
        currency: "BDT",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    $(initialize);

    function initialize() {
        bindEvents();
        checkApiHealth();
    }

    function bindEvents() {
        $("#loadInvoicesButton").on("click", loadInvoices);
        $("#clearSearchButton").on("click", clearSearch);
        $("#searchInput").on("input", applySearch);
        $("#closeDetailButton").on("click", closeInvoiceDetails);
        $("#openReportButton").on("click", function () {
            openCrystalReport(state.selectedInvoiceId);
        });

        $("#invoiceTableBody")
            .on("click", ".view-data-button", function () {
                loadInvoiceReportData(readInvoiceId(this));
            })
            .on("click", ".report-button", function () {
                openCrystalReport(readInvoiceId(this));
            });
    }

    function apiUrl(path) {
        return String(config.apiBaseUrl || "").replace(/\/$/, "") + path;
    }

    function checkApiHealth() {
        $.ajax({
            url: apiUrl("/api/health"),
            method: "GET",
            dataType: "json",
            timeout: 8000
        })
            .done(function () {
                setApiStatus(true);
            })
            .fail(function () {
                setApiStatus(false);
            });
    }

    function setApiStatus(isConnected) {
        var $status = $("#apiStatus");
        $status
            .removeClass("status-checking status-connected status-disconnected")
            .addClass(isConnected ? "status-connected" : "status-disconnected");
        $status.find(".status-text").text(isConnected ? "API connected" : "API unavailable");
    }

    function loadInvoices() {
        if (state.isLoadingInvoices) {
            return;
        }

        clearMessage();
        setInvoiceLoading(true);

        $.ajax({
            url: apiUrl("/api/invoices"),
            method: "GET",
            dataType: "json",
            timeout: 15000
        })
            .done(function (response) {
                state.allInvoices = Array.isArray(response) ? response : [];
                $("#searchInput, #clearSearchButton").prop("disabled", false);
                applySearch();

                if (state.allInvoices.length > 0) {
                    showMessage(
                        "success",
                        state.allInvoices.length +
                            (state.allInvoices.length === 1
                                ? " invoice loaded successfully."
                                : " invoices loaded successfully.")
                    );
                }
            })
            .fail(function (xhr) {
                state.allInvoices = [];
                renderInvoiceTable([]);
                updateResultCount(0, 0);
                showMessage("error", getAjaxError(xhr, "Invoice list could not be loaded."));
            })
            .always(function () {
                setInvoiceLoading(false);
            });
    }

    function setInvoiceLoading(isLoading) {
        state.isLoadingInvoices = isLoading;
        var $button = $("#loadInvoicesButton");
        $button.prop("disabled", isLoading).toggleClass("is-loading", isLoading);
        $button.find(".button-label").text(isLoading ? "Loading…" : "Load invoices");
    }

    function applySearch() {
        var query = normalize($("#searchInput").val());
        var filteredInvoices = state.allInvoices.filter(function (invoice) {
            if (!query) {
                return true;
            }

            var searchableValues = [
                invoice.id,
                invoice.invoiceNumber,
                invoice.customerName,
                formatDate(invoice.invoiceDate)
            ];

            return searchableValues.some(function (value) {
                return normalize(value).indexOf(query) !== -1;
            });
        });

        renderInvoiceTable(filteredInvoices);
        updateResultCount(filteredInvoices.length, state.allInvoices.length);
    }

    function clearSearch() {
        $("#searchInput").val("").trigger("focus");
        applySearch();
    }

    function renderInvoiceTable(invoices) {
        var $tableBody = $("#invoiceTableBody").empty();
        var hasInvoices = invoices.length > 0;

        $("#invoiceTableWrap").prop("hidden", !hasInvoices);
        $("#invoiceEmptyState").prop("hidden", hasInvoices);

        if (!hasInvoices) {
            var hasLoadedData = state.allInvoices.length > 0;
            $("#invoiceEmptyState h3").text(
                hasLoadedData ? "No matching invoices" : "No invoices available"
            );
            $("#invoiceEmptyState p").text(
                hasLoadedData
                    ? "Try a different invoice ID, number, customer, or date."
                    : "Load the invoice directory or check that invoice data exists."
            );
            return;
        }

        invoices.forEach(function (invoice) {
            var invoiceId = parsePositiveInteger(invoice.id);
            var $row = $("<tr>").attr("data-invoice-id", invoiceId);

            if (invoiceId === state.selectedInvoiceId) {
                $row.addClass("is-selected");
            }

            appendTextCell($row, invoiceId || "—");
            appendTextCell($row, invoice.invoiceNumber || "—", "invoice-number");
            appendTextCell($row, formatDate(invoice.invoiceDate));
            appendTextCell($row, invoice.customerName || "—", "customer-name");
            appendTextCell($row, formatMoney(invoice.discountAmount), "numeric-column");
            appendTextCell($row, formatMoney(invoice.totalAmount), "numeric-column");

            var $actions = $("<div>").addClass("row-actions");
            var $viewButton = $("<button>", {
                type: "button",
                class: "row-button view-data-button",
                text: "View data"
            }).attr("data-invoice-id", invoiceId);
            var $reportButton = $("<button>", {
                type: "button",
                class: "row-button report-button",
                text: "Open report"
            }).attr("data-invoice-id", invoiceId);

            $actions.append($viewButton, $reportButton);
            $("<td>").addClass("action-column").append($actions).appendTo($row);
            $tableBody.append($row);
        });
    }

    function appendTextCell($row, value, className) {
        var $cell = $("<td>").text(value == null ? "—" : String(value));
        if (className) {
            $cell.addClass(className);
        }
        $row.append($cell);
    }

    function updateResultCount(visibleCount, totalCount) {
        if (totalCount === 0) {
            $("#resultCount").text("No invoices loaded");
            return;
        }

        $("#resultCount").text(
            visibleCount === totalCount
                ? totalCount + (totalCount === 1 ? " invoice" : " invoices")
                : "Showing " + visibleCount + " of " + totalCount
        );
    }

    function loadInvoiceReportData(invoiceId) {
        if (!invoiceId || state.isLoadingDetails) {
            if (!invoiceId) {
                showMessage("error", "A valid invoice ID is required.");
            }
            return;
        }

        state.isLoadingDetails = true;
        state.selectedInvoiceId = invoiceId;
        clearMessage();
        markSelectedInvoice(invoiceId);
        $("#invoiceDetailPanel").prop("hidden", false).attr("aria-busy", "true");
        $("#detailHeading").text("Loading invoice…");
        $("#detailSubtitle").text("Retrieving the Crystal Report data contract.");
        $("#openReportButton").prop("disabled", true);

        $.ajax({
            url: apiUrl("/api/reports/invoices/" + encodeURIComponent(invoiceId) + "/data"),
            method: "GET",
            dataType: "json",
            timeout: 15000
        })
            .done(function (invoice) {
                renderInvoiceDetails(invoice);
                $("#openReportButton").prop("disabled", false);
                scrollDetailsIntoView();
            })
            .fail(function (xhr) {
                closeInvoiceDetails();
                showMessage(
                    "error",
                    getAjaxError(xhr, "Invoice report data could not be loaded.")
                );
            })
            .always(function () {
                state.isLoadingDetails = false;
                $("#invoiceDetailPanel").removeAttr("aria-busy");
            });
    }

    function renderInvoiceDetails(invoice) {
        var items = Array.isArray(invoice.items) ? invoice.items : [];
        var invoiceNumber = invoice.invoiceNumber || "Invoice";

        $("#detailHeading").text(invoiceNumber);
        $("#detailSubtitle").text(
            items.length + (items.length === 1 ? " product line" : " product lines")
        );
        setText("#detailInvoiceId", invoice.invoiceId);
        setText("#detailInvoiceDate", formatDate(invoice.invoiceDate));
        setText("#detailCustomerName", invoice.customerName);
        setText("#detailCustomerPhone", invoice.customerPhone);
        setText("#detailCustomerAddress", invoice.customerAddress);
        setText("#detailSubtotal", formatMoney(invoice.subtotal));
        setText("#detailDiscount", formatMoney(invoice.discountAmount));
        setText("#detailTotal", formatMoney(invoice.totalAmount));

        var $itemTableBody = $("#invoiceItemTableBody").empty();
        if (items.length === 0) {
            $("<tr>")
                .append(
                    $("<td>", {
                        colspan: 4,
                        text: "No product lines are available for this invoice."
                    })
                )
                .appendTo($itemTableBody);
            return;
        }

        items.forEach(function (item) {
            var $row = $("<tr>");
            appendTextCell($row, item.productName || "—");
            appendTextCell($row, item.quantity, "numeric-column");
            appendTextCell($row, formatMoney(item.unitPrice), "numeric-column");
            appendTextCell($row, formatMoney(item.lineTotal), "numeric-column");
            $itemTableBody.append($row);
        });
    }

    function closeInvoiceDetails() {
        state.selectedInvoiceId = null;
        state.isLoadingDetails = false;
        $("#invoiceDetailPanel").prop("hidden", true).removeAttr("aria-busy");
        $("#invoiceTableBody tr").removeClass("is-selected");
    }

    function markSelectedInvoice(invoiceId) {
        $("#invoiceTableBody tr").each(function () {
            $(this).toggleClass(
                "is-selected",
                parsePositiveInteger($(this).attr("data-invoice-id")) === invoiceId
            );
        });
    }

    function openCrystalReport(invoiceId) {
        invoiceId = parsePositiveInteger(invoiceId);
        if (!invoiceId) {
            showMessage("error", "Select a valid invoice before opening its report.");
            return;
        }

        var reportWindow = window.open("about:blank", "_blank");
        if (!reportWindow) {
            showMessage("error", "The browser blocked the report window. Allow pop-ups and retry.");
            return;
        }

        reportWindow.opener = null;
        reportWindow.location.href = apiUrl(
            "/api/reports/invoices/" + encodeURIComponent(invoiceId) + "/pdf?inline=true"
        );
    }

    function readInvoiceId(element) {
        return parsePositiveInteger($(element).attr("data-invoice-id"));
    }

    function parsePositiveInteger(value) {
        var parsed = Number.parseInt(value, 10);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }

    function normalize(value) {
        return String(value == null ? "" : value)
            .trim()
            .toLocaleLowerCase();
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }

        var date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }).format(date);
    }

    function formatMoney(value) {
        var amount = Number(value);
        return Number.isFinite(amount) ? currencyFormatter.format(amount) : "—";
    }

    function setText(selector, value) {
        $(selector).text(value == null || value === "" ? "—" : String(value));
    }

    function scrollDetailsIntoView() {
        var detailPanel = document.getElementById("invoiceDetailPanel");
        if (detailPanel && typeof detailPanel.scrollIntoView === "function") {
            detailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    function showMessage(type, message) {
        $("#messageBox")
            .removeClass("message-success message-error message-info")
            .addClass("message-" + type)
            .text(message)
            .prop("hidden", false);
    }

    function clearMessage() {
        $("#messageBox")
            .removeClass("message-success message-error message-info")
            .text("")
            .prop("hidden", true);
    }

    function getAjaxError(xhr, fallbackMessage) {
        if (xhr && xhr.status === 404) {
            return "The requested invoice was not found.";
        }

        if (xhr && xhr.status === 0) {
            return "The API is unavailable. Check that the application is running.";
        }

        var response = xhr && xhr.responseJSON;
        if (response && response.message) {
            return response.detail ? response.message + " " + response.detail : response.message;
        }

        return fallbackMessage;
    }
})(window, document, window.jQuery);
