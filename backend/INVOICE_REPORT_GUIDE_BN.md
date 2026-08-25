# InvoiceReport.rpt ও C# Model Binding — Beginner Guide

## ১. এখন কোন সহজ পদ্ধতি ব্যবহার হচ্ছে?

এই project-এ `InvoiceReportData.xsd` বা `DataTable` ব্যবহার হচ্ছে না। একটি সাধারণ C# class-এর object list সরাসরি Crystal Report-এ bind হচ্ছে।

```text
Database
  -> InvoiceReportDto
  -> InvoiceReportModel.FromInvoice(...)
  -> List<InvoiceReportModel>
  -> report.SetDataSource(reportRows)
  -> InvoiceReport.rpt
  -> PDF
```

মূল file দুটি:

- `Reports/InvoiceReportModel.cs` — report-এর data field contract
- `Reports/InvoiceReport.rpt` — report-এর visual design/template

`Services/CrystalReportService.cs` এই দুটিকে যুক্ত করে PDF বানায়।

## ২. InvoiceReportModel কী?

`InvoiceReportModel` একটি plain C# class। এর প্রতিটি property Crystal Report-এর একটি field হিসেবে ব্যবহার করা যায়। এতে ১৪টি property আছে:

| Header/customer | Product row | Total |
|---|---|---|
| InvoiceId | ProductId | Subtotal |
| InvoiceNumber | ProductName | DiscountAmount |
| InvoiceDate | Quantity | TotalAmount |
| CustomerName | UnitPrice | |
| CustomerPhone | LineTotal | |
| CustomerAddress | | |

একটি invoice-এ তিনটি item থাকলে `FromInvoice` তিনটি `InvoiceReportModel` object বানায়। প্রতিটি object-এ invoice/customer/total একই থাকে, কিন্তু product-এর তথ্য আলাদা থাকে। তাই Crystal Report-এর `Details` section তিনবার print হয়।

উদাহরণ:

```text
Row 1: INV-001 | Laptop | Qty 1 | 80000
Row 2: INV-001 | Mouse  | Qty 2 | 1500
Row 3: INV-001 | Cable | Qty 3 | 2500
```

## ৩. Runtime binding কোথায় হয়?

`CrystalReportService.GenerateInvoicePdf`-এ:

```csharp
var reportRows = InvoiceReportModel.FromInvoice(invoice);

using (var reportDocument = new ReportDocument())
{
    reportDocument.Load(reportPath);
    reportDocument.SetDataSource(reportRows);
    // তারপর PDF export
}
```

- `FromInvoice` DTO-কে flat row list-এ map করে।
- `Load` `.rpt` design load করে।
- `SetDataSource` C# object list report-এ bind করে।
- `ExportToStream` final PDF তৈরি করে।

## ৪. নতুন InvoiceReport.rpt কীভাবে বানাবেন?

প্রথমে Visual Studio 2022-তে SAP Crystal Reports extension এবং x64 runtime install থাকতে হবে। Project configuration `Debug | x64` রাখুন।

1. Solution build করুন। Build না করলে Designer compiled C# class খুঁজে নাও পেতে পারে।
2. Solution Explorer-এ `Reports` folder right-click করুন।
3. **Add -> New Item -> Crystal Report** নির্বাচন করুন।
4. নাম দিন `InvoiceReport.rpt` এবং Blank Report নির্বাচন করুন।
5. Report-এর মধ্যে right-click করে **Database -> Database Expert** খুলুন।
6. **Project Data -> .NET Objects** expand করুন।
7. `EnterpriseInvoiceSystem.Reports.InvoiceReportModel` খুঁজুন।
8. Class-টি **Selected Tables**-এ add করে **OK** দিন।
9. **Field Explorer -> Database Fields** expand করুন।
10. প্রয়োজনীয় field drag করে report section-এ বসান।
11. Save করে project আবার build করুন।
12. `/api/reports/invoices/1/pdf?inline=true` URL দিয়ে test করুন।

Class দেখা না গেলে project clean/build করুন, report বন্ধ করে আবার খুলুন এবং configuration x64 কিনা দেখুন।

## ৫. কোন field কোন section-এ রাখবেন?

### Report Header

- INVOICE title
- InvoiceNumber
- InvoiceDate
- CustomerName
- CustomerPhone
- CustomerAddress

এই অংশ report-এ একবার দেখানো ভালো।

### Page Header

- Product
- Quantity
- Unit Price
- Line Total

এখানে শুধু column label দিন।

### Details

- ProductName
- Quantity
- UnitPrice
- LineTotal

Object list-এর প্রতিটি item-এর জন্য `Details` একবার render হয়।

### Report Footer

- Subtotal
- DiscountAmount
- TotalAmount

এগুলো একবার দেখাতে footer ব্যবহার করুন। প্রয়োজন হলে field-এর **Suppress If Duplicated** option ব্যবহার করতে পারেন।

## ৬. Mapping ঠিক কোথায় হয়?

Mapping `InvoiceReportModel.FromInvoice` method-এ হয়। যেমন:

```csharp
ProductName = item.ProductName,
Quantity = item.Quantity,
UnitPrice = item.UnitPrice,
LineTotal = item.LineTotal,
TotalAmount = invoice.TotalAmount
```

বাম পাশের নাম `InvoiceReportModel` property। ডান পাশের value DTO থেকে আসে। `.rpt`-এর saved database field নাম model property-এর সঙ্গে মিলতে হবে।

## ৭. নতুন field কীভাবে যোগ করবেন?

ধরুন `CustomerEmail` যোগ করবেন:

1. নিশ্চিত করুন `InvoiceReportDto`-তে value আছে এবং `InvoiceService` সেটি map করছে।
2. `InvoiceReportModel`-এ `public string CustomerEmail { get; set; }` যোগ করুন।
3. `FromInvoice`-এ `CustomerEmail = invoice.CustomerEmail` যোগ করুন।
4. Project build করুন।
5. `.rpt` খুলে **Database -> Verify Database** দিন।
6. Field না এলে **Set Datasource Location** থেকে আবার `.NET Objects -> InvoiceReportModel` select করুন।
7. Field Explorer থেকে নতুন field report-এ drag করুন।
8. JSON endpoint এবং PDF endpoint দুটো test করুন।

Property rename করলে পুরোনো report field ভেঙে যেতে পারে। Beginner হিসেবে rename না করে নতুন property add, report update, তারপর পুরোনোটি remove করা নিরাপদ।

## ৮. Design modify করার নিয়ম

- Field সরাতে select করে Delete দিন; এতে C# property delete হয় না।
- Text label edit করতে object double-click করুন।
- Money field right-click -> **Format Field -> Number -> 2 decimal places** দিন।
- Date field right-click -> **Format Field -> Date and Time** থেকে format নির্বাচন করুন।
- Field overlap এড়াতে **Snap to Grid** ব্যবহার করুন।
- Product row সবসময় `Details` section-এ রাখুন।
- Total fields `Details`-এ রাখলে প্রতি item-এ repeat হবে; `Report Footer` ব্যবহার করুন।

## ৯. Common error ও solution

| সমস্যা | কারণ | সমাধান |
|---|---|---|
| Model class পাওয়া যায় না | Project build হয়নি | x64 build করে Designer reopen করুন |
| `ReportModels` namespace error | পুরোনো namespace reference | `EnterpriseInvoiceSystem.Reports` ব্যবহার করুন |
| Field binding error | `.rpt` field ও model property mismatch | Verify Database/Set Datasource Location দিন |
| Report blank | List empty বা field wrong section-এ | `/data` endpoint ও `FromInvoice` output দেখুন |
| Total বারবার আসে | Total `Details` section-এ | `Report Footer`-এ নিন |
| `.rpt was not found` | Report file/path ভুল | `Reports/InvoiceReport.rpt` আছে কিনা দেখুন |
| `BadImageFormatException` | x86/x64 mismatch | Project এবং IIS Express x64 করুন |
| JSON ঠিক, PDF ভুল | Designer binding/layout/runtime সমস্যা | Model binding, `.rpt`, Crystal runtime পরীক্ষা করুন |

## ১০. গুরুত্বপূর্ণ প্রশ্ন ও উত্তর

### XSD কি এখন দরকার?

না। এই implementation-এ XSD file delete করা হয়েছে এবং C# model list সরাসরি bind হয়।

### DataTable কি দরকার?

না। `List<InvoiceReportModel>`-ই `SetDataSource`-এ দেওয়া হচ্ছে।

### `InvoiceRows` কী?

এটি পুরোনো XSD/DataTable source-এর table name ছিল। নতুন code-এর মূল contract হলো `InvoiceReportModel`; পুরোনো নাম বুঝতে বা maintain করতে হবে না। Binary `.rpt`-এর internal metadata-তে পুরোনো নাম দেখা গেলেও runtime data model list থেকেই আসে।

### Model আর DTO আলাদা কেন?

DTO API-র nested response বোঝায়; report model একটি flat printable row বোঝায়। এতে Details section সহজে repeat হয় এবং API response বদলাতে হয় না।

### এক invoice থেকে অনেক model object কেন?

কারণ প্রতিটি product report-এর একটি detail row। Invoice header ও total value প্রতিটি object-এ repeat থাকায় Crystal সব field access করতে পারে।

### `.rpt` কি C# code file?

না। এটি Crystal Designer-এর binary template; layout, field position, font, formula ও section configuration রাখে।

### `.rpt` কি text editor দিয়ে edit করা যাবে?

না। Visual Studio-এর SAP Crystal Reports Designer ব্যবহার করুন।

### Report কি সরাসরি database query করে?

না। `InvoiceService` database থেকে DTO বানায়; Crystal শুধু prepared C# list পায়।

### `SetDataSource` কী করে?

Loaded report template-এর database fields-এর সঙ্গে runtime C# object properties match করে values সরবরাহ করে।

### Property name কি exact হতে হবে?

হ্যাঁ। `.rpt`-এর field contract এবং model property name/type মিললে binding সবচেয়ে নির্ভরযোগ্য হয়।

### PDF browser-এ open করব কীভাবে?

`/api/reports/invoices/{id}/pdf?inline=true` ব্যবহার করুন। `inline=true` browser preview-তে সাহায্য করে।

### আগে data ঠিক আছে কিনা কীভাবে বুঝব?

`/api/reports/invoices/{id}/data` খুলুন। JSON ভুল হলে service/mapping দেখুন; JSON ঠিক কিন্তু PDF ভুল হলে report binding/design দেখুন।

## ১১. Beginner checklist

- Solution `Debug | x64`-এ build হয়
- `InvoiceReportModel.cs` project-এ included
- `FromInvoice` প্রতিটি item-এর জন্য object বানায়
- `.rpt`-এর data source `.NET Objects -> InvoiceReportModel`
- Product fields `Details` section-এ
- Total fields `Report Footer`-এ
- Model property ও report field name/type মিলে
- `/data` HTTP 200 দেয়
- `/pdf?inline=true` valid PDF দেয়

এই flow-তে মনে রাখার সবচেয়ে ছোট formula:

```text
DTO -> C# report row list -> SetDataSource -> RPT design -> PDF
```
