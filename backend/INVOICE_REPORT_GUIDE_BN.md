# InvoiceReport.rpt — সম্পূর্ণ বাংলা গাইড ও প্রশ্নোত্তর

এই document-টি `EnterpriseInvoiceSystem` project-এর
`Reports/InvoiceReport.rpt` file কী কাজ করে, কীভাবে তৈরি ও design করতে হয়, কীভাবে
পরিবর্তন করতে হয় এবং application-এর data কীভাবে report-এ দেখা যায়—এসব ব্যাখ্যা করে।

## ১. InvoiceReport.rpt কী?

`InvoiceReport.rpt` হলো SAP Crystal Reports-এর একটি binary report-template file।
এটি invoice-এর layout, field placement, font, border, grouping, formula এবং
page-format সংরক্ষণ করে। এটি নিজে invoice data সংরক্ষণ করে না। Application চলার
সময় C# code report-টিতে data bind করে এবং তারপর PDF export করে।

সহজভাবে:

- `.rpt` বলে দেয় invoice দেখতে কেমন হবে।
- `InvoiceReportDto` বলে দেয় কোন business data report-এ যাবে।
- `InvoiceReportDataModel` nested invoice data-কে exact flat report row-তে বদলায়।
- `DataTable` সেই flat model-গুলো Crystal Reports-এর table হিসেবে বহন করে।
- `InvoiceReportData.xsd` designer-কে table ও field-এর নাম/type জানায়।
- `CrystalReportService` template load, data bind এবং PDF export করে।

> গুরুত্বপূর্ণ: `.rpt` একটি binary file। সাধারণ text editor বা Visual Studio code
> editor দিয়ে এর layout edit করা যায় না। SAP Crystal Reports Designer ব্যবহার করতে হয়।

## ২. এই project-এ report তৈরির সম্পূর্ণ data flow

```text
HTTP GET /api/reports/invoices/{id}/pdf
                    |
                    v
ReportsController.Pdf(id)
                    |
                    v
InvoiceService.GetReportAsync(id)
                    |
                    v
SQL/Entity Framework থেকে Invoice + Customer + Items + Products
                    |
                    v
InvoiceReportDto এবং InvoiceReportItemDto
                    |
                    v
InvoiceReportDataModel — প্রতি product-এর জন্য একটি flat binding row
                    |
                    v
CrystalReportService.CreateInvoiceDataTable(reportRows)
                    |
                    v
InvoiceRows নামের flat DataTable — প্রতি product-এর জন্য একটি row
                    |
                    v
ReportDocument.Load("InvoiceReport.rpt")
                    |
                    v
ReportDocument.SetDataSource(invoiceRows)
                    |
                    v
ExportFormatType.PortableDocFormat
                    |
                    v
application/pdf HTTP download
```

JSON data আলাদাভাবে যাচাই করার endpoint:

```http
GET /api/reports/invoices/{id}/data
```

PDF download করার endpoint:

```http
GET /api/reports/invoices/{id}/pdf
```

## ৩. Report-এর সঙ্গে সম্পর্কিত file-গুলো

| File | কাজ |
|---|---|
| `Reports/InvoiceReport.rpt` | Invoice-এর visual template এবং report layout |
| `Reports/InvoiceReportData.xsd` | `InvoiceRows` table-এর design-time schema |
| `DTOs/InvoiceReportDto.cs` | Invoice header, customer, totals ও item data বহন করে |
| `Services/InvoiceService.cs` | Database থেকে invoice data নিয়ে DTO তৈরি করে |
| `Services/CrystalReportService.cs` | DTO থেকে `DataTable` বানিয়ে `.rpt`-এ bind ও PDF export করে |
| `Controllers/ReportsController.cs` | Data ও PDF HTTP endpoint প্রকাশ করে |
| `EnterpriseInvoiceSystem.csproj` | `.xsd` ও `.rpt`-কে project content হিসেবে অন্তর্ভুক্ত করে |

## ৪. InvoiceRows schema-তে কোন data আছে?

এই report `InvoiceRows` নামের table ব্যবহার করে। এতে মোট ১৪টি field আছে। Field-এর
নাম ও type অবশ্যই XSD, C# `DataTable` এবং `.rpt`—এই তিন জায়গায় একই হতে হবে।

| Field | Type | Source | Report-এ ব্যবহার |
|---|---|---|---|
| `InvoiceId` | `int` | `invoice.InvoiceId` | Internal invoice identifier |
| `InvoiceNumber` | `string` | `invoice.InvoiceNumber` | Invoice number/header |
| `InvoiceDate` | `DateTime` | `invoice.InvoiceDate` | Invoice date |
| `CustomerName` | `string` | `invoice.CustomerName` | Customer name |
| `CustomerPhone` | `string` | `invoice.CustomerPhone` | Customer phone |
| `CustomerAddress` | `string` | `invoice.CustomerAddress` | Customer address |
| `ProductId` | `int` | `invoiceItem.ProductId` | Product identifier |
| `ProductName` | `string` | `invoiceItem.ProductName` | Details row-এর product name |
| `Quantity` | `int` | `invoiceItem.Quantity` | Item quantity |
| `UnitPrice` | `decimal` | `invoiceItem.UnitPrice` | একক মূল্য |
| `LineTotal` | `decimal` | `invoiceItem.LineTotal` | Quantity × Unit Price |
| `Subtotal` | `decimal` | `invoice.Subtotal` | Discount-এর আগের total |
| `DiscountAmount` | `decimal` | `invoice.DiscountAmount` | Discount amount |
| `TotalAmount` | `decimal` | `invoice.TotalAmount` | Final payable amount |

## ৫. একই invoice data কেন প্রতি item row-তে repeat হয়?

`InvoiceReportDto.Items` একটি nested list, কিন্তু Crystal Report-এর data source এখানে
flat `DataTable`। তাই প্রতিটি product-এর জন্য একটি row তৈরি হয়। সেই row-তে product
data-এর সঙ্গে invoice header, customer এবং total data-ও রাখা হয়। উদাহরণ:

| InvoiceNumber | CustomerName | ProductName | Quantity | LineTotal | TotalAmount |
|---|---|---|---:|---:|---:|
| INV-001 | Rahim | Laptop | 1 | 80000 | 89500 |
| INV-001 | Rahim | Mouse | 2 | 3000 | 89500 |
| INV-001 | Rahim | Keyboard | 1 | 6500 | 89500 |

একই header/total value data source-এ repeat হলেও report design-এ সেগুলো `Report
Header` বা `Report Footer`-এ রাখলে PDF-এ একবারই দেখা যায়। `Details` section শুধু
প্রতিটি product-এর জন্য repeat হয়।

## ৬. Report section কোন কাজে ব্যবহার হবে?

Crystal Reports-এর section অনুযায়ী recommended invoice layout:

| Section | কী রাখা ভালো | কখন print হয় |
|---|---|---|
| `Report Header` | Company logo/name, INVOICE title, invoice/customer information | Report-এর শুরুতে একবার |
| `Page Header` | Product, Quantity, Unit Price, Line Total column heading | প্রতিটি page-এর উপরে |
| `Details` | ProductName, Quantity, UnitPrice, LineTotal | প্রতিটি item row-এর জন্য |
| `Report Footer` | Subtotal, Discount, Grand Total, signature/note | Report-এর শেষে একবার |
| `Page Footer` | Page number, print date, footer text | প্রতিটি page-এর নিচে |

একটি সাধারণ layout:

```text
+----------------------------------------------------------+
| COMPANY NAME                              INVOICE         |
| Invoice No: INV-001       Date: 24-Aug-2026              |
| Customer: Rahim           Phone: 01XXXXXXXXX              |
| Address: Dhaka                                           |
+--------------------------+----------+----------+----------+
| Product                  | Quantity | Unit     | Total    |
+--------------------------+----------+----------+----------+
| Laptop                   |        1 | 80000.00 | 80000.00 |
| Mouse                    |        2 |  1500.00 |  3000.00 |
+--------------------------+----------+----------+----------+
|                                Subtotal:       90500.00   |
|                                Discount:        1000.00   |
|                                Grand Total:    89500.00   |
+----------------------------------------------------------+
```

## ৭. নতুন InvoiceReport.rpt কীভাবে তৈরি করবেন?

### প্রয়োজনীয় software

- Visual Studio, project-এর .NET Framework version support করে এমন edition
- SAP Crystal Reports for Visual Studio
- Application process-এর architecture-এর সঙ্গে মিল থাকা Crystal Reports runtime
- এই project-এর ক্ষেত্রে x64 configuration ব্যবহার করা উচিত

### ধাপে ধাপে report তৈরি

1. Visual Studio-তে `backend/EnterpriseInvoiceSystem.sln` খুলুন।
2. Solution Explorer-এ `EnterpriseInvoiceSystem/Reports` folder নির্বাচন করুন।
3. Right-click করে **Add → New Item → Crystal Report** নির্বাচন করুন।
4. File name দিন `InvoiceReport.rpt`।
5. Blank report নির্বাচন করুন।
6. **Database Expert** খুলুন।
7. **Create New Connection → ADO.NET (XML)** নির্বাচন করুন।
8. `Reports/InvoiceReportData.xsd` নির্বাচন করুন।
9. Schema থেকে `InvoiceRows` table report-এ add করুন।
10. **Field Explorer → Database Fields → InvoiceRows** expand করুন।
11. Header field-গুলো `Report Header` section-এ drag করুন।
12. Product column label-গুলো `Page Header`-এ রাখুন।
13. Item field-গুলো `Details` section-এ রাখুন।
14. Total field-গুলো `Report Footer`-এ রাখুন।
15. Currency field-গুলো দুই decimal place-এ format করুন।
16. Alignment, border, font, page size এবং margin ঠিক করুন।
17. Report save করুন।
18. File property-তে **Build Action = Content** দিন।
19. **Copy to Output Directory = Copy if newer** দিন।
20. Project rebuild করে PDF endpoint পরীক্ষা করুন।

## ৮. Report কীভাবে design করবেন?

### Header design

- `INVOICE` title বড় এবং স্পষ্ট রাখুন।
- Invoice number ও date পাশাপাশি রাখলে দ্রুত পড়া যায়।
- Customer name, phone ও address একটি আলাদা block-এ রাখুন।
- Logo ব্যবহার করলে image-এর aspect ratio ঠিক রাখুন।
- Header যেন item table-এর জন্য অতিরিক্ত vertical space না নেয়।

### Details/table design

- Text field যেমন `ProductName` left aligned রাখুন।
- Number field যেমন `Quantity`, `UnitPrice`, `LineTotal` right aligned রাখুন।
- `UnitPrice` ও `LineTotal` একই decimal format ব্যবহার করুক।
- Long product name-এর জন্য field grow করার option প্রয়োজন অনুযায়ী enable করুন।
- `Details` section খুব বেশি height-এর হলে প্রতি item-এর মাঝে অপ্রয়োজনীয় gap হবে।

### Totals design

- `Subtotal` ও `DiscountAmount` normal/bold mixed style-এ রাখা যায়।
- `TotalAmount` সবচেয়ে prominent করুন।
- Total field-গুলো `Report Footer`-এ রাখুন, `Details`-এ নয়; নইলে প্রতি item-এর
  পাশে একই total repeat হবে।

### Page design

- সাধারণ invoice-এর জন্য A4 portrait উপযুক্ত।
- অনেক column থাকলে landscape বিবেচনা করা যায়।
- Page Header repeat করলে multi-page invoice-এ column meaning পরিষ্কার থাকে।
- Page Footer-এ `Page N of M` এবং generation/print date যোগ করা যেতে পারে।

## ৯. Existing report কীভাবে modify করবেন?

### শুধু layout, text, color বা font পরিবর্তন

1. Visual Studio-তে `InvoiceReport.rpt` double-click করুন।
2. **Design** tab খুলুন।
3. Field বা text object select করে move/resize/format করুন।
4. **Format Object** থেকে font, border, number/date format পরিবর্তন করুন।
5. Save করে application rebuild করুন।
6. `/api/reports/invoices/{id}/pdf` call করে output যাচাই করুন।

এ ধরনের পরিবর্তনে সাধারণত DTO, XSD বা C# code বদলাতে হয় না।

### Existing field report-এ যোগ করা

Field যদি আগে থেকেই `InvoiceRows` schema-তে থাকে:

1. **Field Explorer** খুলুন।
2. `Database Fields → InvoiceRows` expand করুন।
3. প্রয়োজনীয় field উপযুক্ত section-এ drag করুন।
4. Format, alignment ও size ঠিক করুন।
5. Save, rebuild এবং PDF test করুন।

### সম্পূর্ণ নতুন field যোগ করা

নতুন field যোগ করলে এই order অনুসরণ করুন:

1. প্রয়োজন হলে entity/database query-তে value load করুন।
2. `InvoiceReportDto` বা `InvoiceReportItemDto`-তে property যোগ করুন।
3. `InvoiceService.GetReportAsync`-এ property map করুন।
4. `InvoiceReportData.xsd`-এর `InvoiceRows` schema-তে একই নাম/type-এর field যোগ করুন।
5. `CreateInvoiceDataTable`-এ একই নাম/type-এর column যোগ করুন।
6. `invoiceRows.Rows.Add(...)`-এ একই column order-এ value যোগ করুন।
7. Crystal Designer-এ **Database → Verify Database** চালান।
8. প্রয়োজন হলে **Set Datasource Location** দিয়ে updated XSD পুনরায় select করুন।
9. নতুন field report section-এ drag করুন।
10. JSON endpoint, PDF endpoint এবং build—সব পরীক্ষা করুন।

> সবচেয়ে গুরুত্বপূর্ণ নিয়ম: XSD field order/name/type, DataTable column এবং row value
> order একে অপরের সঙ্গে মিলতে হবে। না মিললে field binding error বা ভুল column-এ data
> দেখাতে পারে।

### Field rename বা remove করা

সরাসরি rename/remove করলে `.rpt` পুরোনো field reference ধরে রাখতে পারে। নিরাপদ পদ্ধতি:

1. আগে report থেকে পুরোনো field object ও formula reference সরান।
2. DTO, mapping, XSD এবং DataTable update করুন।
3. **Verify Database** চালান।
4. নতুন field আবার report-এ বসান।
5. Formula, sorting, grouping ও suppression rule পরীক্ষা করুন।

## ১০. Data report-এ কীভাবে show হয়?

`CreateInvoiceDataTable` প্রথমে exact schema তৈরি করে:

```csharp
var invoiceRows = new DataTable("InvoiceRows");
invoiceRows.Columns.Add("InvoiceNumber", typeof(string));
invoiceRows.Columns.Add("ProductName", typeof(string));
invoiceRows.Columns.Add("Quantity", typeof(int));
```

এরপর প্রতি invoice item-এর জন্য row যোগ করে:

```csharp
foreach (var invoiceItem in invoice.Items)
{
    invoiceRows.Rows.Add(
        invoice.InvoiceNumber,
        invoiceItem.ProductName,
        invoiceItem.Quantity
    );
}
```

বাস্তব project-এ এখানে সব ১৪টি value দেওয়া হয়। তারপর:

```csharp
reportDocument.Load(reportPath);
reportDocument.SetDataSource(invoiceDataTable);
```

`SetDataSource`-এর পরে `.rpt`-এর `{InvoiceRows.ProductName}` object সংশ্লিষ্ট
DataTable column-এর value দেখায়। `Details` section প্রতি row-তে একবার render হয়।

## ১১. Report পরীক্ষা করার সঠিক পদ্ধতি

### ধাপ ১: JSON data পরীক্ষা

```http
GET /api/reports/invoices/1/data
```

- HTTP 200 হলে invoice পাওয়া গেছে।
- Header/customer/item/totals value সঠিক কি না দেখুন।
- JSON ভুল হলে আগে `InvoiceService` বা database mapping ঠিক করুন।

### ধাপ ২: PDF পরীক্ষা

```http
GET /api/reports/invoices/1/pdf
```

Expected response:

- Status: `200 OK`
- Content-Type: `application/pdf`
- Content-Disposition: `attachment`
- Filename: `Invoice_<InvoiceNumber>.pdf`

### ধাপ ৩: PDF signature পরীক্ষা

```powershell
$pdfBytes = [IO.File]::ReadAllBytes('.\test-output\Invoice_INV-2026-0001.pdf')
[Text.Encoding]::ASCII.GetString($pdfBytes[0..4])
```

Expected output:

```text
%PDF-
```

### ধাপ ৪: Visual verification

- Invoice number/date ঠিক আছে কি না
- Customer details সম্পূর্ণ কি না
- সব product row এসেছে কি না
- Quantity × UnitPrice = LineTotal কি না
- Subtotal − DiscountAmount = TotalAmount কি না
- Multi-page invoice-এ Page Header repeat হচ্ছে কি না
- Text overlap, clipping বা unwanted blank page হচ্ছে কি না

## ১২. গুরুত্বপূর্ণ প্রশ্ন ও উত্তর

### প্রশ্ন ১: `.rpt` file কি database?

না। এটি report layout/template। এই project-এ actual data Entity Framework দিয়ে database
থেকে আসে এবং runtime-এ `DataTable` হিসেবে report-এ bind হয়।

### প্রশ্ন ২: `.rpt` file-এর ভিতরে invoice data স্থায়ীভাবে save থাকে?

সাধারণ execution flow-তে না। Template শুধু field definition/layout ধরে রাখে। Runtime
data `SetDataSource` দিয়ে দেওয়া হয়। Designer-এ **Save Data with Report** enable থাকলে
sample data binary-তে থেকে যেতে পারে; production template-এ sensitive saved data না
রাখাই ভালো।

### প্রশ্ন ৩: XSD কেন দরকার?

Design time-এ database call না করেও Crystal Designer যেন `InvoiceRows` table-এর field
ও type জানতে পারে, তাই XSD ব্যবহার করা হয়েছে। Runtime-এ actual `DataTable` একই schema
অনুসরণ করে।

### প্রশ্ন ৪: Report সরাসরি SQL Server-এ connect না করে DataTable কেন ব্যবহার করে?

এতে business logic এক জায়গায় থাকে, report database credential জানে না, calculated
value application থেকেই আসে এবং designer/runtime-এর data contract পরিষ্কার থাকে।

### প্রশ্ন ৫: `SetDataSource` কী করে?

এটি runtime-এর `invoiceDataTable`-কে loaded `.rpt` template-এর data source হিসেবে bind
করে। Report-এর database field object-গুলো এরপর matching column থেকে value নেয়।

### প্রশ্ন ৬: `ReportDocument.Load` কেন দরকার?

এটি disk থেকে `.rpt` template load করে। Load না করলে Crystal engine layout, fields বা
sections সম্পর্কে জানবে না।

### প্রশ্ন ৭: `ExportToStream(PortableDocFormat)` কী করে?

সম্পূর্ণ rendered report-কে PDF stream-এ export করে। Controller পরে সেই bytes-কে
`application/pdf` response হিসেবে পাঠায়।

### প্রশ্ন ৮: `using` block কেন ব্যবহার করা হয়েছে?

`ReportDocument` ও stream unmanaged/native resource ব্যবহার করতে পারে। `using` scope
শেষে সেগুলো dispose করে, ফলে file lock ও memory/resource leak-এর ঝুঁকি কমে।

### প্রশ্ন ৯: Report file কোথায় খোঁজা হয়?

`HostingEnvironment.MapPath("~/Reports/InvoiceReport.rpt")` application-relative path-কে
deployed physical path-এ বদলায়। File না থাকলে controlled `FileNotFoundException` হয়।

### প্রশ্ন ১০: `Build Action = Content` কেন?

এতে `.rpt` application content হিসেবে deployment/publish output-এ অন্তর্ভুক্ত হয়। শুধু
project folder-এ file থাকলেই deployed server-এ পাওয়া যাবে—এমন নিশ্চয়তা নেই।

### প্রশ্ন ১১: `Copy if newer` কেন?

Report নতুন হলে output folder-এ copy হয়, কিন্তু অপ্রয়োজনে প্রতিবার copy হয় না। Updated
layout deploy না হওয়ার সমস্যা এভাবে এড়ানো যায়।

### প্রশ্ন ১২: Header data প্রতি product row-তে কেন repeat হয়?

Nested DTO-কে flat table-এ রূপান্তর করার কারণে। Report section control ব্যবহার করে
repeated source value-কে PDF-এ একবার বা প্রয়োজনমতো দেখানো হয়।

### প্রশ্ন ১৩: `Details` section-এ TotalAmount রাখলে কী হবে?

প্রতিটি item row-এর সঙ্গে একই grand total repeat হবে। Grand total সাধারণত `Report
Footer`-এ রাখা উচিত।

### প্রশ্ন ১৪: Product row কেন দেখা যাচ্ছে না?

সম্ভাব্য কারণ:

- `invoice.Items` খালি
- `Details` section suppressed
- Database field `Details` section-এ রাখা হয়নি
- XSD এবং DataTable schema mismatch
- Report পুরোনো data-source definition ব্যবহার করছে

### প্রশ্ন ১৫: JSON ঠিক কিন্তু PDF ভুল—কোথায় সমস্যা?

সাধারণত `InvoiceReportData.xsd`, `CreateInvoiceDataTable`, `.rpt` field binding, formula,
section suppression অথবা Crystal runtime/design-এ সমস্যা। JSON ঠিক থাকলে EF query ও DTO
mapping সাধারণত ঠিক আছে।

### প্রশ্ন ১৬: JSON-ও ভুল হলে কোথায় দেখব?

`InvoiceService.GetReportAsync`, Entity Framework `Include`, database record, DTO mapping,
subtotal/discount/total calculation এবং invoice item list পরীক্ষা করুন।

### প্রশ্ন ১৭: নতুন company logo কীভাবে যোগ করব?

Designer-এ `Insert → Picture` ব্যবহার করে `Report Header`-এ image বসান। Image যেন
deployment-independentভাবে report-এর সঙ্গে embedded থাকে এবং aspect ratio ঠিক থাকে তা
PDF test করে যাচাই করুন। Dynamic logo প্রয়োজন হলে আলাদা binary/image field ও binding
strategy দরকার হবে।

### প্রশ্ন ১৮: Currency symbol কীভাবে দেখাব?

Numeric field-এর **Format Field → Number/Currency** option ব্যবহার করুন অথবা formula/text
object দিয়ে currency label দিন। Database numeric value string-এ পরিবর্তন না করে decimal
রাখলে calculation ও alignment সহজ হয়।

### প্রশ্ন ১৯: Date format কীভাবে বদলাব?

`InvoiceDate` field-এর **Format Field → Date and Time** থেকে প্রয়োজনীয় format নির্বাচন
করুন। এটি শুধু presentation বদলায়; DTO-এর `DateTime` value বদলায় না।

### প্রশ্ন ২০: Page number কীভাবে যোগ করব?

`Special Fields` থেকে Page Number বা Page N of M `Page Footer`-এ drag করুন। Multi-page
invoice test করুন।

### প্রশ্ন ২১: Invoice এক page-এর বেশি হলে column heading কীভাবে repeat করাব?

Column label-গুলো `Page Header` section-এ রাখুন। `Report Header`-এ রাখলে শুধু প্রথম
page-এ দেখা যাবে।

### প্রশ্ন ২২: Blank second page কেন তৈরি হয়?

Report object বা section page-এর printable width/height অতিক্রম করলে blank page হতে পারে।
Page size, margin, object width, section height এবং `New Page Before/After` option দেখুন।

### প্রশ্ন ২৩: Field-এর text কেটে গেলে কী করব?

Object width বাড়ান, font ছোট করুন অথবা **Can Grow** enable করুন। `Can Grow` ব্যবহার করলে
adjacent object overlap করছে কি না পরীক্ষা করুন।

### প্রশ্ন ২৪: Schema field-এর নাম case-sensitive কি?

Crystal binding-এর ক্ষেত্রে exact নাম বজায় রাখাই নিরাপদ। XSD, DataTable এবং report field
একই spelling ও casing ব্যবহার করবে।

### প্রশ্ন ২৫: Field type mismatch হলে কী হয়?

Report load/bind/export error হতে পারে, অথবা formatting/calculation ভুল হতে পারে। যেমন
XSD-তে decimal কিন্তু DataTable-এ string দেওয়া উচিত নয়।

### প্রশ্ন ২৬: Report modify করার পর পুরোনো design কেন দেখা যায়?

সম্ভবত পুরোনো `.rpt` output/deployment folder-এ রয়ে গেছে। Save, rebuild, output copy
setting, deployed Reports folder এবং running application restart পরীক্ষা করুন।

### প্রশ্ন ২৭: `.rpt` Git merge করা সহজ কি?

না। এটি binary file, তাই line-by-line diff বা automatic merge কার্যকর নয়। একজন designer
এক সময়ে পরিবর্তন করা, ছোট focused commit করা এবং generated PDF/screenshot দিয়ে review
করা ভালো।

### প্রশ্ন ২৮: Report change review করার ভালো পদ্ধতি কী?

Commit message-এ পরিবর্তনের উদ্দেশ্য লিখুন, representative invoice দিয়ে PDF generate
করুন, layout/totals যাচাই করুন এবং সম্ভব হলে before/after screenshot বা sample PDF
review করুন। Sensitive customer data commit করবেন না।

### প্রশ্ন ২৯: `BadImageFormatException` কেন হয়?

Application process এবং Crystal runtime architecture mismatch হলে সাধারণত এই error হয়।
এই project x64-এ চালান, matching x64 runtime ব্যবহার করুন এবং `Prefer 32-bit` disable
রাখুন।

### প্রশ্ন ৩০: `Could not load CrystalDecisions...` কেন হয়?

Crystal Reports runtime/Visual Studio integration অনুপস্থিত, corrupt অথবা assembly
version mismatch হতে পারে। Installed runtime architecture ও referenced assembly version
মিলিয়ে দেখুন।

### প্রশ্ন ৩১: `InvoiceReport.rpt was not found` কীভাবে ঠিক করব?

- File `EnterpriseInvoiceSystem/Reports` folder-এ আছে কি না দেখুন।
- File project-এ included কি না দেখুন।
- Build Action `Content` কি না দেখুন।
- Copy setting `Copy if newer` কি না দেখুন।
- Deployed application-এর `Reports` folder পরীক্ষা করুন।

### প্রশ্ন ৩২: `Load report failed` হলে কী পরীক্ষা করব?

- Physical report path সঠিক কি না
- Application account file read করতে পারে কি না
- `.rpt` file valid/compatible কি না
- Crystal runtime install ও version সঠিক কি না
- অন্য process report file lock করেছে কি না

### প্রশ্ন ৩৩: `The report has no tables` বা field binding error কেন হয়?

`.rpt`-এ `InvoiceRows` table add হয়নি, updated XSD verify হয়নি অথবা report অন্য data
source reference করছে। Database Expert ও Set Datasource Location পরীক্ষা করুন।

### প্রশ্ন ৩৪: Empty invoice item list report-এ কী দেখাবে?

বর্তমান DataTable logic কোনো row তৈরি করবে না। ফলে repeated row-এর মধ্যে রাখা header বা
total field-ও data না পেতে পারে। Business validation দিয়ে item ছাড়া invoice প্রতিরোধ
করা সবচেয়ে পরিষ্কার সমাধান; প্রয়োজন হলে empty-report layout আলাদাভাবে design করতে হবে।

### প্রশ্ন ৩৫: Null CustomerAddress কীভাবে handle হয়?

`CreateInvoiceDataTable` null address-কে empty string-এ বদলায়। এতে string field bind করার
সময় null-related সমস্যা কমে এবং report-এ ফাঁকা address দেখায়।

### প্রশ্ন ৩৬: Report-এ calculation করা ভালো, নাকি C#-এ?

Business-critical subtotal, discount ও total C# service-এ calculate করা ভালো, যাতে API
ও report একই result ব্যবহার করে। শুধুমাত্র presentation-specific calculation বা label
Crystal formula-তে রাখা যেতে পারে।

### প্রশ্ন ৩৭: Formula field কখন ব্যবহার করব?

Display text, conditional label, formatted address বা simple presentation logic-এর জন্য।
Core pricing/business rule formula field-এ duplicate না করাই ভালো।

### প্রশ্ন ৩৮: Conditional formatting কীভাবে করব?

Field-এর **Format Object**-এ formula button ব্যবহার করে color, suppression বা font style
condition অনুযায়ী বদলানো যায়। উদাহরণ: discount zero হলে discount row suppress করা।

### প্রশ্ন ৩৯: PDF download name কোথা থেকে আসে?

`ReportsController` invoice number ব্যবহার করে `Invoice_<number>.pdf` বানায়। Invalid
filename character underscore-এ বদলে দেওয়া হয়।

### প্রশ্ন ৪০: Production-এ report error detail কেন সীমিত রাখা হয়?

Unexpected exception-এর stack trace বা internal configuration client-কে দিলে security
তথ্য leak হতে পারে। তাই controller controlled generic error দেয়; detailed diagnosis
server log-এ রাখা উচিত।

## ১৩. সাধারণ সমস্যা ও দ্রুত সমাধান

| সমস্যা | সম্ভাব্য কারণ | সমাধান |
|---|---|---|
| PDF endpoint 404 | Invoice ID নেই | Data endpoint দিয়ে ID যাচাই করুন |
| `InvoiceReport.rpt was not found` | Report deploy হয়নি | Content/copy setting ও deployed path ঠিক করুন |
| `BadImageFormatException` | x86/x64 mismatch | Application ও runtime দুটোই x64 করুন |
| Crystal assembly load error | Runtime missing/version mismatch | Matching runtime install/repair করুন |
| Field binding error | XSD/DataTable/RPT mismatch | Exact field name/type মিলিয়ে Verify Database করুন |
| JSON ঠিক, PDF ভুল | Layout/binding/runtime সমস্যা | `.rpt`, XSD ও Crystal service পরীক্ষা করুন |
| Product repeat হচ্ছে না | Details suppressed বা item নেই | Details section ও JSON items দেখুন |
| Total প্রতি row-তে repeat | Total field Details-এ | Report Footer-এ সরান |
| Text কেটে যাচ্ছে | Object ছোট | Width বাড়ান বা Can Grow ব্যবহার করুন |
| Blank extra page | Printable width অতিক্রম | Margin/object width/page setting ঠিক করুন |
| পুরোনো report দেখা যায় | Stale output/deployment | Rebuild, recopy এবং app restart করুন |

## ১৪. পরিবর্তনের আগে ও পরে checklist

### পরিবর্তনের আগে

- একটি working `.rpt` backup বা Git commit আছে
- Representative invoice ID জানা আছে
- `/data` endpoint-এর expected result জানা আছে
- XSD এবং DataTable-এর current schema বোঝা হয়েছে
- Visual Studio/Crystal runtime x64 configuration ঠিক আছে

### পরিবর্তনের পরে

- `.rpt` save হয়েছে
- Database Verify সফল হয়েছে
- Project build error/warning ছাড়া শেষ হয়েছে
- JSON endpoint সঠিক data দেয়
- PDF endpoint HTTP 200 দেয়
- PDF-এর শুরু `%PDF-`
- Header, item এবং total data সঠিক
- Long product/customer data-তে layout ভাঙে না
- Multi-page report ঠিকভাবে render হয়
- Updated `.rpt` deployment output-এ copy হয়েছে
- Sensitive sample data report-এর সঙ্গে save হয়নি

## ১৫. সবচেয়ে গুরুত্বপূর্ণ নিয়মগুলোর সংক্ষিপ্তসার

1. `.rpt` হলো layout; actual data runtime-এ C# থেকে আসে।
2. XSD, DataTable এবং `.rpt` field-এর নাম/type অবশ্যই মিলবে।
3. Item field `Details`-এ, header field `Report Header`-এ এবং totals `Report Footer`-এ রাখুন।
4. নতুন field যোগ করলে DTO → mapping → XSD → DataTable → RPT—সব layer update করুন।
5. প্রথমে `/data` endpoint, তারপর `/pdf` endpoint debug করুন।
6. `ReportDocument` ও stream সবসময় dispose করুন।
7. `.rpt` binary হওয়ায় ছোট focused change ও generated PDF review করুন।
8. Build/deployment-এ report file Content হিসেবে copy হচ্ছে কি না নিশ্চিত করুন।
9. Application ও Crystal runtime architecture/version মিলিয়ে রাখুন।
10. Production report-এ sensitive saved sample data রাখবেন না।
