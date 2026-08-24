# Frontend O Crystal Report Integration Porikolpona

## 1. Goal

Ei porikolponar goal holo ekta simple, clean ebong normal frontend UI toiri kora jekhane:

- Raw HTML diye page structure toiri hobe.
- Plain CSS diye design kora hobe.
- API call-er jonno jQuery ebong AJAX use kora hobe.
- Invoice search kora jabe.
- `Load Invoices` button click kore invoice list load kora jabe.
- Prottek invoice-er full report data alada kore dekha jabe.
- `Open Crystal Report` button click korle invoice PDF notun browser tab-e open hobe.
- Crystal Report data binding-er jonno dedicated C# model thakbe.
- React, Angular, Vue, Bootstrap ba onno frontend framework use kora hobe na.

## 2. Recommended Approach

Frontend file-gulo ASP.NET Web API project-er moddhe static content hisebe rakha hobe.
Ete frontend ebong API same origin theke run korbe, tai prothom version-e alada CORS
configuration lagbe na.

Recommended frontend URL:

```text
http://localhost:<port>/Frontend/index.html
```

API URL relative rakha hobe:

```text
/api/invoices
/api/invoices/{id}
/api/reports/invoices/{id}/data
/api/reports/invoices/{id}/pdf
```

## 3. Proposed File Structure

```text
backend/
└── EnterpriseInvoiceSystem/
    ├── Frontend/
    │   ├── index.html
    │   ├── css/
    │   │   └── invoice-report.css
    │   ├── js/
    │   │   ├── api-config.js
    │   │   └── invoice-report.js
    │   └── vendor/
    │       └── jquery-3.7.1.min.js
    ├── ReportModels/
    │   └── InvoiceReportDataModel.cs
    ├── Controllers/
    │   ├── InvoicesController.cs
    │   └── ReportsController.cs
    ├── Services/
    │   ├── InvoiceService.cs
    │   └── CrystalReportService.cs
    └── Reports/
        ├── InvoiceReport.rpt
        └── InvoiceReportData.xsd
```

`jquery-3.7.1.min.js` local file hisebe rakha hoyeche, tai internet charao frontend run korbe.

## 4. Frontend UI Layout

Page-ti panchta main section-e vag kora hobe.

### 4.1 Page Header

- Application title: `Enterprise Invoice Reports`
- Choto subtitle: invoice search, data preview ebong PDF report access
- API connection/status indicator

### 4.2 Search and Action Bar

Ei section-e thakbe:

- Search input
- `Load Invoices` button
- `Clear Search` button
- Result count
- Loading indicator

Search input diye ei value-gulo match kora hobe:

- Invoice ID
- Invoice number
- Customer name
- Invoice date

### 4.3 Invoice List Table

Table column:

| Column | Kaj |
|---|---|
| Invoice ID | Internal invoice ID |
| Invoice Number | User-friendly invoice number |
| Date | Formatted invoice date |
| Customer | Customer name |
| Discount | Discount amount |
| Total | Final payable amount |
| Actions | `View Data` ebong `Open Crystal Report` button |

### 4.4 Selected Invoice Data Preview

`View Data` click korle nicher detail panel-e dekhabe:

- Invoice ID
- Invoice number
- Invoice date
- Customer name
- Customer phone
- Customer address
- Product item table
- Subtotal
- Discount
- Grand total

### 4.5 Message Area

Ei area-te success, empty state ebong error message dekhano hobe:

- `Invoice list successfully loaded.`
- `No matching invoice found.`
- `Invoice report data could not be loaded.`
- `Crystal Report could not be opened.`

## 5. Simple UI Wireframe

```text
+--------------------------------------------------------------------+
| Enterprise Invoice Reports                         API: Connected   |
| Search, preview and open Crystal Report invoices                  |
+--------------------------------------------------------------------+
| [ Search invoice/customer...         ] [Load Invoices] [Clear]    |
| Showing 3 invoices                                                |
+--------------------------------------------------------------------+
| ID | Invoice No | Date       | Customer | Total     | Actions      |
|  1 | INV-001    | 24-08-2026 | Rahim    | 89,500.00 | View | PDF   |
|  2 | INV-002    | 24-08-2026 | Karim    | 20,000.00 | View | PDF   |
+--------------------------------------------------------------------+
| Selected Invoice: INV-001                                         |
| Customer: Rahim | Phone: ... | Address: ...                       |
|--------------------------------------------------------------------|
| Product              | Quantity | Unit Price | Line Total          |
| Laptop               |        1 |  80,000.00 |  80,000.00          |
| Mouse                |        2 |   1,500.00 |   3,000.00          |
|                                      Subtotal: 90,500.00           |
|                                      Discount: 1,000.00            |
|                                      Total:    89,500.00            |
|                              [Open Crystal Report]                 |
+--------------------------------------------------------------------+
```

## 6. Button Behavior

### 6.1 Load Invoices

Button click korle:

1. Existing error/message clear hobe.
2. Button disabled hobe.
3. Loading text/spinner dekhabe.
4. AJAX diye `GET /api/invoices` call hobe.
5. Response memory-te `allInvoices` array-te store hobe.
6. Invoice list table render hobe.
7. Search result count update hobe.
8. Request sesh hole button abar enabled hobe.

### 6.2 Search

Prothom version-e search client-side hobe, karon current `GET /api/invoices` endpoint
shob invoice return kore ebong backend-e search query parameter nei.

Search behavior:

- User type korar shathe shathe filter kora jabe.
- Input trim ebong lowercase kore compare kora hobe.
- Invoice ID exact/partial match support korbe.
- Invoice number ebong customer name case-insensitive match korbe.
- Empty search hole shob loaded invoice abar dekhabe.
- Search request server-e pathano hobe na.

Data onek boro hole phase 2-te backend pagination/search add kora hobe:

```http
GET /api/invoices?search=INV-001&page=1&pageSize=20
```

### 6.3 Clear Search

- Search input empty korbe.
- Full cached invoice list render korbe.
- Result count update korbe.
- Selected invoice detail automatically remove korbe na.

### 6.4 View Data

Row-er `View Data` button click korle:

```http
GET /api/reports/invoices/{id}/data
```

Response diye selected invoice detail panel render hobe. Ei endpoint use korar karon holo
Crystal Report je exact report-ready data use kore, frontend preview-o shei data dekhabe.

### 6.5 Open Crystal Report

Row ba detail panel-er `Open Crystal Report` button click korle:

```javascript
window.open('/api/reports/invoices/' + invoiceId + '/pdf', '_blank');
```

Er fole PDF endpoint notun browser tab-e open hobe. Browser configuration onujayi PDF
preview hote pare ba download hote pare, karon backend response-e attachment header ache.

Popup blocker avoid korar jonno `window.open` direct user click handler-er moddhe call korte
hobe; AJAX success callback-er onek pore call kora uchit na.

## 7. jQuery AJAX Plan

### Invoice List Load

```javascript
$.ajax({
    url: '/api/invoices',
    method: 'GET',
    dataType: 'json'
});
```

### Report Data Load

```javascript
$.ajax({
    url: '/api/reports/invoices/' + invoiceId + '/data',
    method: 'GET',
    dataType: 'json'
});
```

Common AJAX lifecycle:

- `beforeSend`: loader show ebong button disable
- `done`: response validate ebong UI render
- `fail`: HTTP status onujayi friendly message
- `always`: loader hide ebong button enable

Expected status handling:

| HTTP Status | Frontend behavior |
|---|---|
| `200` | Data render korbe |
| `404` | `Invoice not found` message dekhabe |
| `500` | Generic server/report error dekhabe |
| Network error | API unavailable message dekhabe |

## 8. Dedicated Crystal Report Binding Model

Raw HTML/jQuery frontend C# model directly use korte pare na. C# model backend-er Crystal
Report data contract hisebe use hobe; frontend JSON object receive korbe.

Proposed file:

```text
backend/EnterpriseInvoiceSystem/ReportModels/InvoiceReportDataModel.cs
```

Implemented model-ti nested API DTO duplicate kore na. Eta `.rpt`-er exact flat
`InvoiceRows` record represent kore:

```csharp
namespace EnterpriseInvoiceSystem.ReportModels
{
    public class InvoiceReportDataModel
    {
        public int InvoiceId { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public string CustomerName { get; set; }
        public string CustomerPhone { get; set; }
        public string CustomerAddress { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal LineTotal { get; set; }
        public decimal Subtotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TotalAmount { get; set; }
    }
}
```

Required namespace imports:

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using EnterpriseInvoiceSystem.DTOs;
```

### Existing DTO-er shathe relationship

Implementation-e low-risk separation use kora hoyeche:

- `InvoiceService` existing DTO return korbe
- `InvoiceReportDataModel.FromInvoice` nested DTO-ke flat report row list-e convert korbe
- `CrystalReportService.CreateInvoiceDataTable` flat model list receive korbe
- `/data` endpoint-er existing nested JSON contract unchanged thakbe
- Crystal binding-er exact 14-column contract alada ebong explicit thakbe

## 9. Data Binding Contract

`InvoiceReportDataModel` theke `DataTable("InvoiceRows")` create hobe. Ei tin jaygay exact
field name ebong type same thakte hobe:

1. `InvoiceReportDataModel.cs`
2. `InvoiceReportData.xsd`
3. `CrystalReportService.CreateInvoiceDataTable`

`.rpt` file-o same `InvoiceRows` field reference korbe.

Binding sequence:

```text
Database entities
    -> InvoiceReportDto
    -> InvoiceReportDataModel list (one row per item)
    -> InvoiceRows DataTable
    -> InvoiceReport.rpt
    -> PDF stream
    -> Browser tab/download
```

## 10. HTML Plan

`index.html`-e semantic structure use kora hobe:

```text
header
main
  section.search-panel
  section.invoice-list-panel
  section.invoice-detail-panel
  section.message-panel
footer
```

Important element ID:

| Element ID | Purpose |
|---|---|
| `searchInput` | Search text |
| `loadInvoicesButton` | Invoice API call start |
| `clearSearchButton` | Search clear |
| `loadingIndicator` | Request progress |
| `resultCount` | Filtered result count |
| `invoiceTableBody` | Dynamic invoice row container |
| `invoiceDetailPanel` | Selected report data preview |
| `invoiceItemTableBody` | Selected invoice item rows |
| `openReportButton` | Selected invoice PDF open |
| `messageBox` | Success/error/empty message |

## 11. CSS Plan

Plain CSS use kore:

- Maximum content width set kora
- White card/panel layout
- Readable system font stack
- Consistent spacing and border radius
- Invoice table-er numeric column right aligned
- Action button-er clear visual hierarchy
- Loading/disabled state
- Success/error/empty message color
- Mobile-e responsive stacked layout
- Choto screen-e table-er horizontal scroll
- Keyboard focus state visible rakha
- Sufficient foreground/background contrast

External UI framework use kora hobe na.

## 12. JavaScript Module Responsibility

### `api-config.js`

- API base URL define korbe
- Same-origin hole empty string use korbe
- Future separate frontend deployment hole ek jaygay URL change kora jabe

Example:

```javascript
window.appConfig = {
    apiBaseUrl: ''
};
```

### `invoice-report.js`

State:

```javascript
var allInvoices = [];
var selectedInvoiceId = null;
```

Main function:

- `loadInvoices()`
- `filterInvoices(searchText)`
- `renderInvoiceTable(invoices)`
- `loadInvoiceReportData(invoiceId)`
- `renderInvoiceDetails(invoice)`
- `openCrystalReport(invoiceId)`
- `formatDate(value)`
- `formatMoney(value)`
- `setLoading(isLoading)`
- `showMessage(type, message)`
- `clearMessage()`

Event binding:

- Load button click
- Clear button click
- Search input event
- Table event delegation for dynamic row buttons
- Detail panel report button click

Dynamic row-er jonno direct click binding-er bodole event delegation use kora hobe:

```javascript
$('#invoiceTableBody').on('click', '.view-data-button', function () {
    // Selected invoice report data load korbe.
});
```

## 13. Security and Data Safety

- API response render korar shomoy `.html()` diye untrusted value inject kora jabe na.
- Customer/product text-er jonno `.text()` ba safe DOM creation use korte hobe.
- Invoice ID URL-e use korar age positive integer validate korte hobe.
- Unexpected API response hole render bondho kore error dekhate hobe.
- Server exception/stack trace UI-te dekhano hobe na.
- Report access future-e sensitive hole authentication/authorization add korte hobe.
- Frontend filter security boundary na; backend authorization authoritative hobe.

## 14. Accessibility Plan

- Prottek input-er visible label thakbe.
- Button name clear hobe.
- Keyboard diye shob action use kora jabe.
- Loading status `aria-live` region-e announce kora jabe.
- Error message sudhu color diye indicate kora hobe na; text/icon-o thakbe.
- Table header-e proper `<th scope="col">` use kora hobe.
- Focus indicator remove kora hobe na.
- New tab open korbe—button label/title-e eta clear kora hobe.

## 15. Backend Change Plan

### Required

1. `ReportModels/InvoiceReportDataModel.cs` add/refactor kora.
2. Invoice service-er report mapping updated model-e convert kora.
3. Crystal report service updated model bind kora.
4. Frontend static file-gulo `.csproj`-e Content hisebe include kora.
5. Same-origin static frontend route/build output verify kora.

### Current API Reuse

Prothom version-e notun API endpoint mandatory na. Existing endpoint use kora jabe:

- `GET /api/invoices`
- `GET /api/reports/invoices/{id}/data`
- `GET /api/reports/invoices/{id}/pdf`

### Optional Future Backend Search

Invoice beshi hole `InvoicesController.All`-e optional parameter add kora:

```csharp
public async Task<IHttpActionResult> All(string search = null, int page = 1, int pageSize = 20)
```

Server-side search criteria:

- Invoice number contains
- Customer name contains
- Exact numeric ID
- Optional date range

## 16. Implementation Phase

### Phase 1: Static UI Foundation

- Frontend folder/file create
- Raw HTML layout
- Plain CSS styling
- jQuery local reference
- Empty/loading/error state

### Phase 2: Invoice List and Search

- `GET /api/invoices` AJAX integration
- Table render
- Client-side search
- Result count
- Load/clear behavior

### Phase 3: Report Data Preview

- `GET /api/reports/invoices/{id}/data` integration
- Header/customer details render
- Item table render
- Subtotal/discount/total render

### Phase 4: Crystal Report Open

- Row action button
- Detail panel action button
- PDF endpoint new tab-e open
- Missing invoice/report error behavior

### Phase 5: Dedicated C# Report Model

- `InvoiceReportDataModel.cs` create/refactor
- Service return/parameter type update
- DataTable schema mapping verify
- JSON contract unchanged ache ki na test

### Phase 6: Verification and Polish

- Desktop/mobile layout test
- Keyboard/accessibility test
- Long text/large amount test
- API failure test
- Crystal PDF binding test
- Build/publish content test

## 17. Testing Checklist

### Normal Flow

- Page successfully load hoy
- `Load Invoices` invoice table populate kore
- Search invoice number diye kaj kore
- Search customer name diye kaj kore
- Clear button shob result fire ane
- View Data exact invoice details dekhay
- Item row count API response-er shathe mile
- Total calculation display thik ache
- Open Crystal Report correct PDF khole

### Empty and Error Flow

- Empty invoice list-er message dekhay
- No search result-er message dekhay
- Invalid invoice ID safely handle hoy
- API 404 friendly message dekhay
- API 500 friendly message dekhay
- Network unavailable hole loader stop hoy
- Repeated click duplicate request/UI corruption create kore na

### UI and Security

- Long customer/product name layout break kore na
- Mobile width-e table usable thake
- Customer name-e HTML-like text thakleo script execute hoy na
- Keyboard focus visible
- Buttons loading-er shomoy disabled
- Currency/date consistent format-e dekhay

### Crystal Binding

- JSON report data correct
- `InvoiceRows` table-er 14 field exact ache
- Product item-gulo Details section-e show hoy
- Header/footer value correct
- Generated file-er signature `%PDF-`
- Updated `.rpt` output folder-e copy hoy

## 18. Acceptance Criteria

Frontend complete bola jabe jokhon:

1. Raw HTML, plain CSS ebong jQuery/AJAX chara kono frontend framework thakbe na.
2. User ek click-e invoice list load korte parbe.
3. Invoice ID, number ba customer diye search korte parbe.
4. User selected invoice-er exact report data UI-te dekhte parbe.
5. User selected invoice-er Crystal PDF notun tab/download-e open korte parbe.
6. Loading, empty, 404, 500 ebong network error state clear hobe.
7. Dedicated `InvoiceReportDataModel.cs` Crystal binding contract hisebe use hobe.
8. XSD, DataTable ebong RPT schema unchanged/correct thakbe.
9. Desktop ebong mobile-e UI usable hobe.
10. Backend build error/warning chara complete hobe.

## 19. Important Decision Summary

- Frontend framework: kono framework na; raw HTML + plain CSS
- API library: jQuery AJAX
- Hosting: ASP.NET application-er moddhe same-origin static frontend
- Initial search: client-side
- Future large-data search: backend pagination/filter
- List API: `/api/invoices`
- Preview API: `/api/reports/invoices/{id}/data`
- PDF API: `/api/reports/invoices/{id}/pdf`
- Report model file: `ReportModels/InvoiceReportDataModel.cs`
- PDF opening: direct user click theke new browser tab
- Security: safe text rendering, validated ID, generic error message

## 20. Implementation-er Shomoy Je File-gulo Touch Hobe

Notun file:

- `Frontend/index.html`
- `Frontend/css/invoice-report.css`
- `Frontend/js/api-config.js`
- `Frontend/js/invoice-report.js`
- `Frontend/vendor/jquery-3.7.1.min.js`
- `ReportModels/InvoiceReportDataModel.cs`

Existing file update:

- `EnterpriseInvoiceSystem.csproj`
- `Services/InvoiceService.cs`
- `Services/CrystalReportService.cs`
- Proyojon hole `Controllers/ReportsController.cs`
- `DTOs/InvoiceReportDto.cs` API contract hisebe unchanged

Existing user-designed `Reports/InvoiceReport.rpt` layout unnecessarily modify kora hobe na.
