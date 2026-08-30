/*
 * ================================================================
 * Invoice Report page-এর সম্পূর্ণ কাজের ধারা (সহজ Bangla guide)
 * ================================================================
 *
 * ১) HTML page load হলে এই file execute হয়।
 * ২) jQuery পাওয়া গেলে $(initialize) DOM ready হওয়ার পর initialize চালায়।
 * ৩) initialize প্রথমে button/input-এর event listener বসায় এবং /api/health
 *    call করে backend চালু আছে কি না status দেখায়।
 * ৪) ব্যবহারকারী Load invoices চাপলে /api/invoices endpoint থেকে সব invoice
 *    আনা হয় এবং state.allInvoices array-তে রাখা হয়।
 * ৫) applySearch invoice ID, number, customer name ও date মিলিয়ে filter করে।
 * ৬) renderInvoiceTable প্রতিটি filtered invoice-এর জন্য নিরাপদে <tr>, <td>
 *    এবং action button তৈরি করে table-এ যোগ করে।
 * ৭) View data চাপলে /api/reports/invoices/{id}/data endpoint থেকে customer,
 *    total এবং product line আসে; renderInvoiceDetails এগুলো detail panel-এ বসায়।
 * ৮) Open report চাপলে নতুন tab খুলে /api/reports/invoices/{id}/pdf?inline=true
 *    URL-এ যায়। Backend Crystal Reports দিয়ে PDF তৈরি করে browser-এ দেখায়।
 * ৯) সব network request asynchronous; তাই browser আটকে যায় না। done() সফল
 *    response, fail() error এবং always() উভয় অবস্থার common কাজ করে।
 *
 * গুরুত্বপূর্ণ ধারণা:
 * - $ দিয়ে শুরু variable হলো jQuery object, যেমন $button বা $row।
 * - state হলো page-এর memory; server নয়, browser-এর বর্তমান UI state।
 * - function declaration আগে লেখা হলেও JavaScript hoisting-এর কারণে কাজ করে।
 * - return মানে function এখানেই শেষ; return value না থাকলে undefined।
 * - null মানে কোনো valid value নেই; [] মানে খালি list।
 * ================================================================
 */
(function (window, document, $) {
    // এই IIFE পুরো কোডকে আলাদা scope-এ রাখে, যাতে অন্য JavaScript-এর variable-এর সঙ্গে সংঘর্ষ না হয়।
    "use strict";
    // Strict mode JavaScript-এর সাধারণ ভুল ধরতে সাহায্য করে।

    if (!$) {
        // jQuery না থাকলে AJAX ও event handler কাজ করবে না, তাই error দেখিয়ে থামছি।
        var messageBox = document.getElementById("messageBox");
        messageBox.hidden = false;
        messageBox.className = "message-box message-error";
        messageBox.textContent =
            "jQuery could not be loaded. Check the internet connection and reload the page.";
        return;
    }

    var config = window.appConfig || { apiBaseUrl: "" };
    // appConfig থেকে backend API-এর base URL নেওয়া হচ্ছে।
    var state = {
        // এই object-এ page-এর বর্তমান data ও loading state রাখা হয়।
        allInvoices: [],
        selectedInvoiceId: null,
        isLoadingInvoices: false,
        isLoadingDetails: false
    };

    var currencyFormatter = new Intl.NumberFormat("en-BD", {
        // বাংলাদেশি Taka-তে টাকা দেখানোর formatter।
        style: "currency",
        currency: "BDT",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    $(initialize);
    // DOM তৈরি শেষ হলে initialize function চালু হবে।

    function initialize() {
        // initialize হলো page-এর entry point; DOM ready-এর পর একবার চলে।
        // bindEvents ছাড়া button চাপলেও কোনো action হবে না।
        // checkApiHealth user-কে শুরুতেই backend-এর অবস্থা জানায়।
        // প্রথমে event বসাই, তারপর API সচল কি না পরীক্ষা করি।
        bindEvents();
        checkApiHealth();
    }

    function bindEvents() {
        // এই function UI event এবং business function-এর মধ্যে connection তৈরি করে।
        // on("click", fn) অর্থ click হলে fn function call হবে।
        // on("input", fn) অর্থ user প্রতিটি character বদলালে fn call হবে।
        // button ও input-এর user action-এর সঙ্গে নির্দিষ্ট function যুক্ত করছি।
        $("#loadInvoicesButton").on("click", loadInvoices);
        $("#clearSearchButton").on("click", clearSearch);
        $("#searchInput").on("input", applySearch);
        $("#closeDetailButton").on("click", closeInvoiceDetails);
        $("#openReportButton").on("click", function () {
            openCrystalReport(state.selectedInvoiceId);
        });

        $("#invoiceTableBody")
            // table body-তে delegation করা হয়েছে, কারণ row/button পরে তৈরি হয়।
            .on("click", ".view-data-button", function () {
                loadInvoiceReportData(readInvoiceId(this));
            })
            .on("click", ".report-button", function () {
                openCrystalReport(readInvoiceId(this));
            });
    }

    function apiUrl(path) {
        // path সাধারণত /api/... দিয়ে শুরু হয়।
        // String(...) config-এর null/undefined value-কে নিরাপদ string বানায়।
        // replace(...) শুধু শেষে থাকা একটি slash সরায়।
        // শেষে base URL + path return করে।
        // base URL-এর শেষের slash সরিয়ে path-এর সঙ্গে সঠিক URL বানাই।
        return String(config.apiBaseUrl || "").replace(/\/$/, "") + path;
    }

    function checkApiHealth() {
        // health check-এর উদ্দেশ্য invoice আনা নয়; শুধু server reachable কি না দেখা।
        // timeout: 8000 মানে ৮ সেকেন্ডে response না এলে request failed ধরা হবে।
        // dataType: json response-কে JavaScript object হিসেবে parse করতে বলে।
        // backend-এর health endpoint-এ GET request পাঠাই।
        $.ajax({
            url: apiUrl("/api/health"),
            method: "GET",
            dataType: "json",
            timeout: 8000
        })
            .done(function () {
                setApiStatus(true);
                loadInvoices();
            })
            .fail(function (xhr) {
                var statusText = xhr.responseJSON && xhr.responseJSON.status
                    ? xhr.responseJSON.status
                    : "API unavailable";
                setApiStatus(false, statusText);
                showMessage("error", statusText + ". Start SQL Server Express and reload the page.");
            });
    }

    function setApiStatus(isConnected, unavailableText) {
        // parameter isConnected একটি boolean: true হলে connected, false হলে unavailable।
        // removeClass পুরনো visual state সরায়, addClass নতুন state বসায়।
        // ternary operator (condition ? trueValue : falseValue) দিয়ে text বাছাই হয়।
        // API connected নাকি unavailable—সেই অনুযায়ী status UI বদলাই।
        var $status = $("#apiStatus");
        $status
            .removeClass("status-checking status-connected status-disconnected")
            .addClass(isConnected ? "status-connected" : "status-disconnected");
        $status.find(".status-text").text(
            isConnected ? "API connected" : unavailableText || "API unavailable"
        );
    }

    function loadInvoices() {
        // এটি invoice directory load করার মূল function।
        // প্রথম guard duplicate click থেকে server-কে অতিরিক্ত request থেকে বাঁচায়।
        // clearMessage পুরনো success/error message সরায়।
        // setInvoiceLoading button disable করে যাতে request চলাকালে আবার click না হয়।
        // একই সময়ে দ্বিতীয়বার invoice request পাঠানো আটকাই।
        if (state.isLoadingInvoices) {
            return;
        }

        clearMessage();
        // আগের message সরিয়ে loading UI চালু করি।
        setInvoiceLoading(true);

        $.ajax({
            // backend থেকে invoice list আনার AJAX request।
            url: apiUrl("/api/invoices"),
            method: "GET",
            dataType: "json",
            timeout: 15000
        })
            .done(function (response) {
                // response হলো backend-এর JSON result।
                // Array.isArray যাচাই করে নিশ্চিত করা হয় যে data list আকারে এসেছে।
                // filter করার আগে মূল list রেখে দিই, যাতে search clear করলে সব ফিরে আসে।
                // সফল response array হলে state-এ রেখে table-এ দেখাই।
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
                // xhr object-এ HTTP status, responseJSON ইত্যাদি error তথ্য থাকে।
                // error হলে stale data রাখা বিপজ্জনক, তাই state reset করা হয়।
                // request ব্যর্থ হলে table খালি করে সহজ error দেখাই।
                state.allInvoices = [];
                renderInvoiceTable([]);
                updateResultCount(0, 0);
                showMessage("error", getAjaxError(xhr, "Invoice list could not be loaded."));
            })
            .always(function () {
                // সফল/ব্যর্থ উভয় ক্ষেত্রেই loading বন্ধ করি।
                setInvoiceLoading(false);
            });
    }

    function setInvoiceLoading(isLoading) {
        // isLoading=true: request চলছে; false: request শেষ।
        // prop("disabled", ...) button-এর interaction বন্ধ/চালু করে।
        // toggleClass CSS animation বা loading style চালু/বন্ধ করে।
        // loading flag ও load button-এর disabled/label state বদলাই।
        state.isLoadingInvoices = isLoading;
        var $button = $("#loadInvoicesButton");
        $button.prop("disabled", isLoading).toggleClass("is-loading", isLoading);
        $button.find(".button-label").text(isLoading ? "Loading…" : "Load invoices");
    }

    function applySearch() {
        // filtering কখনো server data মুছে না; শুধু কোন row দেখা যাবে তা ঠিক করে।
        // query empty হলে filter callback true return করে, তাই সব invoice থাকে।
        // filter নতুন array বানায়; state.allInvoices অপরিবর্তিত থাকে।
        // search text normalize করে matching invoice বাছাই করি।
        var query = normalize($("#searchInput").val());
        var filteredInvoices = state.allInvoices.filter(function (invoice) {
            if (!query) {
                return true;
            }

            var searchableValues = [
                // ID, number, customer এবং date—এই field-গুলোতে search হয়।
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
        // val("") input-এর value reset করে।
        // trigger("focus") cursor-কে আবার search box-এ রাখে।
        // applySearch empty query দিয়ে সব invoice পুনরায় render করে।
        // search field খালি করে পুরো list আবার দেখাই।
        $("#searchInput").val("").trigger("focus");
        applySearch();
    }

    function renderInvoiceTable(invoices) {
        // এই function data থেকে DOM বানানোর দায়িত্বে; API call করে না।
        // প্রথমে empty() করা জরুরি, নইলে প্রতিবার আগের row-এর সঙ্গে নতুন row duplicate হবে।
        // hidden property দিয়ে table অথবা empty-state-এর মধ্যে সঠিকটি দেখানো হয়।
        // পুরনো table row মুছে নতুন invoice row তৈরি করি।
        var $tableBody = $("#invoiceTableBody").empty();
        var hasInvoices = invoices.length > 0;

        $("#invoiceTableWrap").prop("hidden", !hasInvoices);
        $("#invoiceEmptyState").prop("hidden", hasInvoices);

        if (!hasInvoices) {
            // কোনো result না থাকলে empty-state message দেখাই।
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
            // forEach list-এর প্রতিটি object একবার করে process করে।
            // invoice.id validate করে data attribute-এ রাখি, পরে button click-এ এটি পড়ব।
            // প্রতিটি invoice-এর জন্য একটি table row তৈরি করছি।
            var invoiceId = parsePositiveInteger(invoice.id);
            var $row = $("<tr>").attr("data-invoice-id", invoiceId);

            if (invoiceId === state.selectedInvoiceId) {
                // নির্বাচিত invoice-এর row highlight করি।
                $row.addClass("is-selected");
            }

            appendTextCell($row, invoiceId || "—");
            appendTextCell($row, invoice.invoiceNumber || "—", "invoice-number");
            appendTextCell($row, formatDate(invoice.invoiceDate));
            appendTextCell($row, invoice.customerName || "—", "customer-name");
            appendTextCell($row, formatMoney(invoice.discountAmount), "numeric-column");
            appendTextCell($row, formatMoney(invoice.totalAmount), "numeric-column");

            var $actions = $("<div>").addClass("row-actions");
            // প্রতিটি row-তে View data এবং Open report button বানাই।
            var $viewButton = $("<button>", {
                // jQuery object দিয়ে element বানালে browser DOM API-এর বদলে chain করে কাজ করা যায়।
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
        // একই ধরনের <td> বারবার লেখার code এক function-এ রাখা হয়েছে (reuse)।
        // value null/undefined হলে dash দেখানো হয়, যাতে UI-তে ফাঁকা ঘর না থাকে।
        // String(value) number/date-সহ যেকোনো value-কে text হিসেবে নেয়।
        // নিরাপদে text cell যোগ করি; text() ব্যবহার করায় HTML injection হয় না।
        var $cell = $("<td>").text(value == null ? "—" : String(value));
        if (className) {
            $cell.addClass(className);
        }
        $row.append($cell);
    }

    function updateResultCount(visibleCount, totalCount) {
        // visibleCount filter-এর পর কয়টি row দেখা যাচ্ছে।
        // totalCount server থেকে পাওয়া মোট invoice সংখ্যা।
        // totalCount=0 হলে function early return করে, নিচের formatting আর চালায় না।
        // মোট invoice ও filter-এর পর দৃশ্যমান invoice সংখ্যা দেখাই।
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
        // invoice list-এর row থেকে পাওয়া ID দিয়ে বিস্তারিত data চাওয়া হয়।
        // invalid ID হলে backend call না করে সঙ্গে সঙ্গে user error দেখানো হয়।
        // isLoadingDetails guard একই detail request-এর duplicate call আটকায়।
        // aria-busy screen reader-কে জানায় যে panel এখনও data load করছে।
        // নির্বাচিত invoice-এর detail/data contract backend থেকে আনি।
        if (!invoiceId || state.isLoadingDetails) {
            if (!invoiceId) {
                showMessage("error", "A valid invoice ID is required.");
            }
            return;
        }

        state.isLoadingDetails = true;
        // selected ID রেখে detail panel-কে loading অবস্থায় নিই।
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
                // invoice এখানে detail API-এর JSON object।
                // renderInvoiceDetails DOM update করে; তারপর report button enable হয়।
                // data এলে detail panel ও product lines render করি।
                renderInvoiceDetails(invoice);
                $("#openReportButton").prop("disabled", false);
                scrollDetailsIntoView();
            })
            .fail(function (xhr) {
                // detail request ব্যর্থ হলে panel বন্ধ করে error দেখাই।
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
        // detail API-এর এক invoice object-কে panel-এর আলাদা আলাদা field-এ ভাগ করা হয়।
        // items না থাকলে empty array নেওয়া হয়, তাই items.forEach error করে না।
        // setText/setMoney helper null data-কে user-friendly placeholder বানায়।
        // invoice-এর customer, total এবং product line detail panel-এ বসাই।
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
            // product line না থাকলে table-এ একটি explanatory row দেখানো হয়।
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
            // প্রতিটি product line-এর জন্য table row বানাই।
            var $row = $("<tr>");
            appendTextCell($row, item.productName || "—");
            appendTextCell($row, item.quantity, "numeric-column");
            appendTextCell($row, formatMoney(item.unitPrice), "numeric-column");
            appendTextCell($row, formatMoney(item.lineTotal), "numeric-column");
            $itemTableBody.append($row);
        });
    }

    function closeInvoiceDetails() {
        // close করার সময় শুধু panel লুকানো নয়, selection ও loading state-ও reset করা জরুরি।
        // তা না হলে পরে নতুন invoice খুললে আগের invoice selected দেখা যেতে পারে।
        // detail panel বন্ধ করে selected state reset করি।
        state.selectedInvoiceId = null;
        state.isLoadingDetails = false;
        $("#invoiceDetailPanel").prop("hidden", true).removeAttr("aria-busy");
        $("#invoiceTableBody tr").removeClass("is-selected");
    }

    function markSelectedInvoice(invoiceId) {
        // table-এর row-গুলোর data-invoice-id-এর সঙ্গে target ID তুলনা করি।
        // toggleClass দ্বিতীয় argument true/false অনুযায়ী class যোগ বা সরিয়ে দেয়।
        // matching invoice row-তে selected CSS class বসাই।
        $("#invoiceTableBody tr").each(function () {
            $(this).toggleClass(
                "is-selected",
                parsePositiveInteger($(this).attr("data-invoice-id")) === invoiceId
            );
        });
    }

    function openCrystalReport(invoiceId) {
        // এই function detail data আনে না; সরাসরি PDF endpoint browser tab-এ খোলে।
        // parsePositiveInteger invalid/null/string ID reject করে।
        // about:blank আগে খোলায় popup blocker-এর ফলাফল তৎক্ষণাৎ জানা যায়।
        // opener=null security-এর জন্য; নতুন tab যেন মূল page-এ script চালাতে না পারে।
        // valid invoice ID যাচাই করে PDF report-এর নতুন tab খুলি।
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
        // this হলো যেই button-এ user click করেছে সেই DOM element।
        // attr(...) HTML-এর data-invoice-id attribute পড়ছে।
        // button-এর data-invoice-id attribute পড়ি।
        return parsePositiveInteger($(element).attr("data-invoice-id"));
    }

    function parsePositiveInteger(value) {
        // parseInt("12abc", 10) 12 দিতে পারে, তাই পরে integer ও >0 পরীক্ষা করা হয়।
        // invalid ID হলে null return করা হয়—এটি falsy, তাই caller সহজে reject করতে পারে।
        // value-কে positive base-10 integer বানাই; invalid হলে null ফেরত দিই।
        var parsed = Number.parseInt(value, 10);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }

    function normalize(value) {
        // search comparison case-insensitive করার জন্য lowercase করা হয়।
        // trim শুরু/শেষের অপ্রয়োজনীয় space সরায়।
        // null-safe string বানিয়ে trim ও lowercase করি, যাতে search সহজ হয়।
        return String(value == null ? "" : value)
            .trim()
            .toLocaleLowerCase();
    }

    function formatDate(value) {
        // API date string-কে Date object বানিয়ে readable format দেখায়।
        // invalid date হলে original value ফেরত দেওয়া হয়, data পুরোপুরি হারায় না।
        // date-কে readable দিন-মাস-বছর format-এ রূপান্তর করি।
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
        // Number(value) string number-কে numeric value বানায়।
        // Number.isFinite NaN/Infinity বাদ দেয়, কারণ এগুলো টাকা হিসেবে দেখানো যাবে না।
        // সংখ্যাকে বাংলাদেশি currency format-এ রূপান্তর করি।
        var amount = Number(value);
        return Number.isFinite(amount) ? currencyFormatter.format(amount) : "—";
    }

    function setText(selector, value) {
        // selector দিয়ে target element বেছে নিয়ে plain text বসায়।
        // text() ব্যবহার করায় API data HTML হিসেবে execute হয় না।
        // value থাকলে text বসাই, না থাকলে dash placeholder দেখাই।
        $(selector).text(value == null || value === "" ? "—" : String(value));
    }

    function scrollDetailsIntoView() {
        // detail panel সফলভাবে render হওয়ার পর user-এর চোখের সামনে আনা হয়।
        // existence/type check পুরনো browser বা missing element-এ error আটকায়।
        // detail panel-টি screen-এ smooth scroll করে আনি।
        var detailPanel = document.getElementById("invoiceDetailPanel");
        if (detailPanel && typeof detailPanel.scrollIntoView === "function") {
            detailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    function showMessage(type, message) {
        // type সাধারণত success/error/info; CSS class message-{type} তৈরি হয়।
        // removeClass আগের রঙ সরায়, text message বসায়, hidden=false করে দেখায়।
        // message box-এ success/error/info message দেখাই।
        $("#messageBox")
            .removeClass("message-success message-error message-info")
            .addClass("message-" + type)
            .text(message)
            .prop("hidden", false);
    }

    function clearMessage() {
        // error/success message সরানোর reusable helper।
        // message box খালি করে লুকিয়ে রাখি।
        $("#messageBox")
            .removeClass("message-success message-error message-info")
            .text("")
            .prop("hidden", true);
    }

    function getAjaxError(xhr, fallbackMessage) {
        // server-এর technical error-কে user বোঝে এমন message-এ রূপান্তর করা হয়।
        // 404 মানে invoice পাওয়া যায়নি; status 0 সাধারণত network/server unavailable।
        // responseJSON.message থাকলে backend-এর custom error ব্যবহার করা হয়।
        // detail থাকলে মূল message-এর সঙ্গে অতিরিক্ত কারণ যোগ করা হয়।
        // server error status দেখে user-friendly error text ফেরত দিই।
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
