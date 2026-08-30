# Invoice Report System: Frontend থেকে Backend পর্যন্ত সম্পূর্ণ ব্যাখ্যা

এই document-এ এই project-এর invoice report page কীভাবে কাজ করে তা একদম শুরু থেকে বলা হয়েছে। বিশেষ করে frontend, AJAX, backend API, database এবং Crystal Report-এর মধ্যে data কীভাবে যাতায়াত করে তা দেখানো হয়েছে।

## ১. পুরো system-এর সহজ চিত্র

```text
User click
   ↓
HTML button / input
   ↓
invoice-report.js
   ↓ AJAX (HTTP request)
ASP.NET Web API Controller
   ↓
InvoiceService
   ↓
Entity Framework + EnterpriseDbContext
   ↓
SQL Server: EnterpriseInvoiceDb
   ↓
JSON response অথবা PDF response
   ↓
JavaScript DOM update
   ↓
Browser-এ invoice দেখা যায়
```

এখানে frontend নিজে database-এ যায় না। Frontend শুধু API call করে। Database access-এর কাজ backend-এর `InvoiceService` করে।

## ২. Frontend page কীভাবে শুরু হয়

মূল HTML file:

`backend/EnterpriseInvoiceSystem/Frontend/index.html`

HTML-এর শেষে সাধারণত script এই ক্রমে load হয়:

1. jQuery load হয়।
2. `api-config.js` load হয়।
3. `invoice-report.js` load হয়।

`api-config.js`-এ আছে:

```javascript
window.appConfig = Object.freeze({
    apiBaseUrl: ""
});
```

`apiBaseUrl` খালি কারণ frontend এবং backend একই ASP.NET application থেকে serve হচ্ছে। তাই `/api/invoices` সরাসরি current domain-এর API endpoint।

যদি frontend আলাদা server-এ চলত, তাহলে এমন হতে পারত:

```javascript
apiBaseUrl: "https://localhost:5001"
```

## ৩. `invoice-report.js` কীভাবে শুরু হয়

ফাইলটি এই pattern ব্যবহার করে:

```javascript
(function (window, document, $) {
    // code
})(window, document, window.jQuery);
```

এটি IIFE। File load হওয়ার সঙ্গে সঙ্গে function execute হয়।

- `window`: browser-এর global object।
- `document`: HTML DOM access করার object।
- `$`: jQuery object।
- আলাদা scope-এর কারণে internal variable global scope নোংরা করে না।

এরপর `$(initialize)` লেখা আছে। এর অর্থ DOM ready হলে `initialize()` চালাবে।

```javascript
function initialize() {
    bindEvents();
    checkApiHealth();
}
```

এখানে দুইটি কাজ হয়:

- `bindEvents()` button/input-এর click বা input action ধরার ব্যবস্থা করে।
- `checkApiHealth()` backend জীবিত আছে কি না পরীক্ষা করে।

## ৪. State কী এবং কেন দরকার

```javascript
var state = {
    allInvoices: [],
    selectedInvoiceId: null,
    isLoadingInvoices: false,
    isLoadingDetails: false
};
```

এটি browser-side memory।

| Property | কাজ |
|---|---|
| `allInvoices` | `/api/invoices` থেকে আসা সব invoice রাখে |
| `selectedInvoiceId` | কোন invoice বর্তমানে selected তা রাখে |
| `isLoadingInvoices` | invoice list request চলছে কি না |
| `isLoadingDetails` | invoice detail request চলছে কি না |

State database নয়। Page refresh করলে state আবার খালি হয়ে যায় এবং data নতুন করে API থেকে আনতে হয়।

## ৫. AJAX কী

AJAX হলো page reload না করে server-এর সঙ্গে request/response করা। এখানে jQuery-এর `$.ajax()` ব্যবহার করা হয়েছে।

সাধারণ structure:

```javascript
$.ajax({
    url: "/api/invoices",
    method: "GET",
    dataType: "json",
    timeout: 15000
})
.done(function (response) {
    // সফল হলে
})
.fail(function (xhr) {
    // ব্যর্থ হলে
})
.always(function () {
    // সবসময়
});
```

- `url`: কোন backend address-এ যাবে।
- `method: GET`: data পড়বে, পরিবর্তন করবে না।
- `dataType: json`: response JSON হিসেবে parse করবে।
- `timeout`: নির্দিষ্ট সময়ের মধ্যে response না এলে fail হবে।
- `.done()`: HTTP request সফল।
- `.fail()`: network error বা HTTP error।
- `.always()`: success এবং failure উভয় ক্ষেত্রেই চলে।

## ৬. API health check

Frontend call করে:

```text
GET /api/health
```

এটি `HealthController`-এ যায়। Request সফল হলে frontend status দেখায় `API connected`; ব্যর্থ হলে `API unavailable`।

এই call invoice data আনে না। শুধু backend reachable কি না পরীক্ষা করে।

## ৭. Load invoices button-এর সম্পূর্ণ flow

User `Load invoices` button চাপলে:

```javascript
$("#loadInvoicesButton").on("click", loadInvoices);
```

তারপর `loadInvoices()` চলে।

### ধাপ ১: duplicate request আটকানো

```javascript
if (state.isLoadingInvoices) {
    return;
}
```

আগের request চললে function থেমে যায়। এতে user দ্রুত কয়েকবার click করলেও একই request বারবার যায় না।

### ধাপ ২: loading UI

```javascript
clearMessage();
setInvoiceLoading(true);
```

পুরনো message সরানো হয় এবং button disabled/loading style পায়।

### ধাপ ৩: AJAX request

```text
GET /api/invoices
```

এটি যায়:

```csharp
[RoutePrefix("api/invoices")]
public class InvoicesController : ApiController
```

এর `All()` method চলে:

```csharp
public async Task<IHttpActionResult> All()
{
    return Ok(await service.GetAllAsync());
}
```

Controller নিজে database query করছে না। এটি `InvoiceService.GetAllAsync()`-কে call করছে।

### ধাপ ৪: Backend database query

`InvoiceService.GetAllAsync()`:

1. `EnterpriseDbContext` তৈরি করে।
2. `Invoices` table query করে।
3. Customer relation include করে।
4. Invoice date অনুযায়ী newest আগে সাজায়।
5. প্রয়োজনীয় field-গুলো `InvoiceSummaryResponse`-এ map করে।
6. `ToListAsync()` database query execute করে।
7. List controller-এ ফেরত দেয়।

### ধাপ ৫: JSON response

Backend সাধারণত এমন JSON list ফেরত দেয়:

```json
[
  {
    "id": 1,
    "invoiceNumber": "INV-2026-0001",
    "invoiceDate": "2026-08-24T00:00:00",
    "customerName": "Example Customer",
    "discountAmount": 100.00,
    "totalAmount": 1500.00
  }
]
```

`Ok(...)` সাধারণত HTTP status `200 OK` তৈরি করে।

### ধাপ ৬: Frontend response রাখা

```javascript
state.allInvoices = Array.isArray(response) ? response : [];
```

Response array হলে state-এ রাখা হয়। Array না হলে নিরাপদভাবে empty list নেওয়া হয়।

এরপর:

```javascript
applySearch();
```

Search empty হলেও এটি সব invoice render করে।

## ৮. Data table-এ কীভাবে দেখায়

`applySearch()` প্রথমে invoice filter করে। এরপর:

```javascript
renderInvoiceTable(filteredInvoices);
```

`renderInvoiceTable()`:

1. পুরনো `<tbody>` খালি করে।
2. প্রতিটি invoice-এর জন্য `<tr>` বানায়।
3. ID, number, date, customer, discount এবং total-এর `<td>` বানায়।
4. `View data` এবং `Open report` button বানায়।
5. `data-invoice-id` attribute-এ invoice ID রাখে।
6. row-টি table body-তে append করে।

```javascript
var $row = $("<tr>").attr("data-invoice-id", invoiceId);
```

এই attribute পরে button click-এর সময় invoice ID বের করতে ব্যবহৃত হয়।

```javascript
appendTextCell($row, invoice.customerName || "—", "customer-name");
```

`appendTextCell()`-এর `.text()` ব্যবহার করা হয়েছে। তাই server data HTML হিসেবে execute হয় না; এটি নিরাপদ plain text হিসেবে দেখায়।

## ৯. Search কীভাবে কাজ করে

User search box-এ character লিখলেই:

```javascript
$("#searchInput").on("input", applySearch);
```

`applySearch()` search value normalize করে:

- trim করে।
- lowercase করে।
- null হলে empty string করে।

তারপর প্রতিটি invoice-এর এই field-এ খোঁজে:

- `invoice.id`
- `invoice.invoiceNumber`
- `invoice.customerName`
- formatted `invoice.invoiceDate`

এখানে নতুন server request যায় না। Search browser-এ আগে load করা `state.allInvoices` data-র ওপর হয়।

## ১০. View data button-এর সম্পূর্ণ flow

Button পরে তৈরি হয় বলে table body-তে event delegation ব্যবহার করা হয়েছে:

```javascript
$("#invoiceTableBody").on("click", ".view-data-button", function () {
    loadInvoiceReportData(readInvoiceId(this));
});
```

### ID কীভাবে পাওয়া যায়

```javascript
$(element).attr("data-invoice-id")
```

এরপর `parsePositiveInteger()` invalid ID বাদ দেয়।

### Backend endpoint

```text
GET /api/reports/invoices/{id}/data
```

উদাহরণ:

```text
GET /api/reports/invoices/1/data
```

এটি `ReportsController.Data(int id)` method-এ যায়।

Controller:

1. `InvoiceService.GetReportAsync(id)` call করে।
2. Invoice না পেলে `404 Not Found` দেয়।
3. পেলে `Ok(invoiceReport)` দিয়ে JSON দেয়।

## ১১. Report data backend-এ কীভাবে তৈরি হয়

`GetReportAsync()`:

1. Invoice table থেকে ID দিয়ে invoice খোঁজে।
2. Customer relation load করে।
3. Invoice items ও product relation load করে।
4. Customer name, phone, address নেয়।
5. Item line total যোগ করে subtotal তৈরি করে।
6. Discount এবং total নেয়।
7. প্রতিটি product item-কে report item DTO-তে map করে।
8. `InvoiceReportDto` ফেরত দেয়।

Response-এর গঠন:

```json
{
  "invoiceId": 1,
  "invoiceNumber": "INV-2026-0001",
  "invoiceDate": "2026-08-24T00:00:00",
  "customerName": "Example Customer",
  "customerPhone": "01700000000",
  "customerAddress": "Dhaka",
  "subtotal": 1600.00,
  "discountAmount": 100.00,
  "totalAmount": 1500.00,
  "items": [
    {
      "productName": "Product A",
      "quantity": 2,
      "unitPrice": 800.00,
      "lineTotal": 1600.00
    }
  ]
}
```

## ১২. Detail panel-এ data কীভাবে বসে

AJAX সফল হলে:

```javascript
renderInvoiceDetails(invoice);
```

এই function JSON-এর value-গুলো HTML-এর ID দিয়ে বসায়:

| JSON field | HTML element |
|---|---|
| `invoiceNumber` | `#detailHeading` |
| `invoiceId` | `#detailInvoiceId` |
| `invoiceDate` | `#detailInvoiceDate` |
| `customerName` | `#detailCustomerName` |
| `customerPhone` | `#detailCustomerPhone` |
| `customerAddress` | `#detailCustomerAddress` |
| `subtotal` | `#detailSubtotal` |
| `discountAmount` | `#detailDiscount` |
| `totalAmount` | `#detailTotal` |

`items` array-এর প্রতিটি object-এর জন্য নতুন product row তৈরি হয়:

- product name
- quantity
- unit price
- line total

## ১৩. Open report button-এর flow

User `Open report` চাপলে:

```text
GET /api/reports/invoices/{id}/pdf?inline=true
```

Frontend নতুন tab খোলে এবং URL সেট করে। এই request-এর response JSON নয়; response হলো PDF binary bytes।

Backend `ReportsController.Pdf()`:

1. একই `GetReportAsync(id)` দিয়ে report data আনে।
2. Invoice না পেলে `404` দেয়।
3. `CrystalReportService.GenerateInvoicePdf()` call করে।
4. `InvoiceReport.rpt` file server path-এ খোঁজে।
5. Report model list তৈরি করে।
6. Crystal Reports template load করে।
7. Data source হিসেবে model list bind করে।
8. PDF format-এ export করে।
9. PDF bytes HTTP response হিসেবে পাঠায়।

`inline=true` থাকায় browser PDF preview করার চেষ্টা করে। `inline=false` হলে attachment download behavior ব্যবহার করা হয়।

## ১৪. AJAX error কীভাবে frontend-এ আসে

সম্ভাব্য error:

| Status | অর্থ |
|---|---|
| `200` | সফল |
| `404` | invoice পাওয়া যায়নি |
| `400` | invalid request/business validation |
| `409` | duplicate invoice number-এর মতো conflict |
| `500` | backend বা Crystal Reports error |
| `0` | server/network unavailable বা request blocked |

Frontend `getAjaxError()` status দেখে সহজ message বানায়। Backend-এর `responseJSON.message` থাকলে সেটিও ব্যবহার করে।

## ১৫. সহজ debugging পদ্ধতি

Browser-এ `F12` চাপুন।

### Console tab

JavaScript error আছে কি না দেখুন। যেমন:

- `jQuery is not defined`
- `Cannot read properties of null`
- syntax error

### Network tab

Button চাপার পর দেখুন:

1. Request URL সঠিক কি না।
2. Method `GET` কি না।
3. Status `200`, `404`, `500` ইত্যাদি কি না।
4. Response tab-এ JSON এসেছে কি না।
5. PDF request হলে response `application/pdf` কি না।

### Backend console/log

যদি Network status `500` হয়, backend exception বা Crystal Reports runtime/configuration check করতে হবে।

## ১৬. এক লাইনে পুরো বিষয়

Frontend-এর button click → jQuery AJAX → ASP.NET Controller → `InvoiceService` → Entity Framework → SQL Server → JSON/PDF response → JavaScript DOM update → browser-এ data/report দেখানো।

