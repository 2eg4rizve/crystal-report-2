# InvoiceReport.rpt-এ InvoiceNumber কীভাবে আসে ও দেখায়

এই guide-এ শুধু `Invoice No : InvoiceNumber` example ধরে Crystal Report-এর পুরো data flow সহজভাবে ব্যাখ্যা করা হয়েছে। একই নিয়মে `CustomerName`, `InvoiceDate`, `ProductName`, `TotalAmount`-সহ অন্য field-ও বসানো যায়।

## ১. সবচেয়ে সহজ উত্তর

Crystal Report-এ দুইটি আলাদা object থাকে:

```text
Invoice No :     <- এটি একটি Text Object; আপনি নিজে type করবেন
InvoiceNumber    <- এটি Database Field; Field Explorer থেকে drag করবেন
```

`Invoice No :` শুধু label। এটি database থেকে আসে না।

`InvoiceNumber` হলো dynamic value। যেমন `INV-2026-0001`। এটি database থেকে C# mapping হয়ে `.rpt`-এ আসে।

Final PDF-তে দেখাবে:

```text
Invoice No : INV-2026-0001
```

## ২. InvoiceNumber কোথা থেকে আসে?

এই project-এ flow হলো:

```text
Invoices table-এর InvoiceNumber column
        ↓
Models/Invoice.cs
        ↓
InvoiceService.GetReportAsync(id)
        ↓
InvoiceReportDto.InvoiceNumber
        ↓
InvoiceReportModel.FromInvoice(...)
        ↓
InvoiceReportModel.InvoiceNumber
        ↓
reportDocument.SetDataSource(reportRows)
        ↓
InvoiceReport.rpt-এর InvoiceNumber field
        ↓
PDF: INV-2026-0001
```

## ৩. Database model-এ InvoiceNumber

File:

```text
EnterpriseInvoiceSystem/Models/Invoice.cs
```

Code:

```csharp
[Required, MaxLength(50), Index("IX_InvoiceNumber", IsUnique = true)]
public string InvoiceNumber { get; set; }
```

এর অর্থ:

- `string`: invoice number text হিসেবে রাখা হয়।
- `Required`: value খালি রাখা যাবে না।
- `MaxLength(50)`: সর্বোচ্চ ৫০ character।
- `IsUnique = true`: একই invoice number দুইবার রাখা যাবে না।

Sample database value seed file-এ set করা হয়েছে:

```csharp
InvoiceNumber = "INV-2026-0001"
```

নতুন invoice API দিয়ে create করলে request-এর invoice number database-এ save হয়। Report নতুন করে কোনো invoice number বানায় না; saved value-টাই দেখায়।

## ৪. Database entity থেকে DTO mapping

File:

```text
EnterpriseInvoiceSystem/Services/InvoiceService.cs
```

`GetReportAsync(id)` requested invoice database থেকে load করে:

```csharp
var invoiceEntity = await Query(db)
    .SingleOrDefaultAsync(invoice => invoice.Id == id);
```

তারপর entity value DTO-তে map হয়:

```csharp
return new InvoiceReportDto
{
    InvoiceId = invoiceEntity.Id,
    InvoiceNumber = invoiceEntity.InvoiceNumber,
    InvoiceDate = invoiceEntity.InvoiceDate,
    // অন্য field...
};
```

Project code-এ local variable বর্তমানে `x`; বুঝতে সুবিধার জন্য example-এ `invoiceEntity` লেখা হয়েছে। গুরুত্বপূর্ণ mapping line:

```csharp
InvoiceNumber = x.InvoiceNumber
```

বাম পাশ: `InvoiceReportDto.InvoiceNumber`

ডান পাশ: database থেকে load হওয়া `Invoice.InvoiceNumber`

## ৫. DTO-তে InvoiceNumber type

File:

```text
EnterpriseInvoiceSystem/DTOs/InvoiceReportDto.cs
```

```csharp
public string InvoiceNumber { get; set; }
```

DTO API এবং report service-এর মাঝখানে data বহন করে। এই endpoint খুললে DTO value JSON হিসেবে দেখা যায়:

```text
GET /api/reports/invoices/1/data
```

Expected অংশ:

```json
{
  "InvoiceId": 1,
  "InvoiceNumber": "INV-2026-0001"
}
```

এখানে value ভুল হলে Crystal Designer-এর সমস্যা নয়; database অথবা `InvoiceService` mapping পরীক্ষা করতে হবে।

## ৬. DTO থেকে report model mapping

File:

```text
EnterpriseInvoiceSystem/Reports/InvoiceReportModel.cs
```

Report model property:

```csharp
public string InvoiceNumber { get; set; }
```

Mapping:

```csharp
InvoiceNumber = invoice.InvoiceNumber,
```

এখানে:

- বাম পাশ `InvoiceReportModel.InvoiceNumber`
- ডান পাশ `InvoiceReportDto.InvoiceNumber`

একটি invoice-এ একাধিক product থাকলে `FromInvoice` প্রতিটি product-এর জন্য একটি report model object বানায়। প্রতিটি object-এ একই invoice number repeat হয়:

```text
Object 1: INV-2026-0001 | Business Laptop
Object 2: INV-2026-0001 | Wireless Mouse
Object 3: INV-2026-0001 | Office Keyboard
```

এই কারণে `InvoiceNumber` field `Details` section-এ রাখলে প্রতিটি product row-তে repeat হবে। একবার দেখাতে `Report Header` section-এ রাখুন।

## ৭. Report model কীভাবে `.rpt`-এ bind হয়?

File:

```text
EnterpriseInvoiceSystem/Services/CrystalReportService.cs
```

প্রথমে flat model list তৈরি হয়:

```csharp
var reportRows = InvoiceReportModel.FromInvoice(invoice);
```

তারপর `.rpt` load হয়:

```csharp
reportDocument.Load(reportPath);
```

শেষে model list bind হয়:

```csharp
reportDocument.SetDataSource(reportRows);
```

Crystal Reports property name ও type দেখে mapping করে। `.rpt`-এ saved field যদি `InvoiceNumber` হয় এবং C# model-এও `string InvoiceNumber` থাকে, runtime value field-এ বসে।

এই implementation-এ XSD বা `DataTable` দরকার নেই।

## ৮. Crystal Designer-এ Invoice No label কীভাবে type করবেন?

1. Visual Studio-তে `Reports/InvoiceReport.rpt` double-click করুন।
2. **Report Header** section খুঁজুন।
3. Toolbox থেকে **Text Object** নিন।
4. Report Header-এ click/drag করে object বসান।
5. Text Object-এর মধ্যে লিখুন:

```text
Invoice No :
```

6. বাইরে click করে typing শেষ করুন।
7. প্রয়োজন হলে right-click -> **Format Object** থেকে font, size, bold ও alignment set করুন।

এটি static text। C# code-এর সঙ্গে এর কোনো mapping নেই। চাইলে label `Invoice Number:` বা বাংলায় `ইনভয়েস নং:` লিখতে পারেন।

## ৯. Dynamic InvoiceNumber field কীভাবে বসাবেন?

### প্রথমবার model data source add করা

1. আগে solution `Debug | x64` configuration-এ build করুন।
2. `.rpt` খুলুন।
3. Report-এর মধ্যে right-click -> **Database -> Database Expert** দিন।
4. **Project Data** expand করুন।
5. **.NET Objects** expand করুন।
6. `EnterpriseInvoiceSystem.Reports.InvoiceReportModel` খুঁজুন।
7. Model-টি **Selected Tables** panel-এ add করুন।
8. **OK** দিন।

### Field বসানো

1. **View -> Other Windows -> Document Outline** নয়; Crystal-এর **Field Explorer** খুলুন। সাধারণত report-এর পাশে দেখা যায়।
2. **Database Fields** expand করুন।
3. `InvoiceReportModel` expand করুন।
4. `InvoiceNumber` field খুঁজুন।
5. Field-টি mouse দিয়ে drag করে `Invoice No :` label-এর ডান পাশে **Report Header** section-এ drop করুন।
6. Field-এর width বাড়ান, যাতে পুরো number দেখা যায়।
7. Save করুন।

Designer-এ field সাধারণত এমন reference হিসেবে দেখা যেতে পারে:

```text
{InvoiceReportModel.InvoiceNumber}
```

এটি manually সাধারণ text হিসেবে type করবেন না। Field Explorer থেকে drag করবেন। শুধু `InvoiceNumber` লিখে Text Object বানালে dynamic value আসবে না।

## ১০. Label এবং field পাশাপাশি বসানো

Recommended layout:

```text
Report Header

[Text Object: Invoice No :] [Database Field: InvoiceNumber]
```

দুইটি আলাদা object রাখলে label edit ও field formatting সহজ হয়। চাইলে formula দিয়ে একসঙ্গে করা যায়, কিন্তু beginner-এর জন্য আলাদা object সহজ।

## ১১. InvoiceNumber-এর type কী হবে?

সব C# layer-এ `string` রাখুন:

```csharp
// Entity
public string InvoiceNumber { get; set; }

// DTO
public string InvoiceNumber { get; set; }

// Report model
public string InvoiceNumber { get; set; }
```

কারণ invoice number-এ letter, dash ও leading zero থাকতে পারে:

```text
INV-2026-0001
```

এটি `int` করলে `INV-` রাখা যাবে না এবং leading zero হারাতে পারে। তাই `string` সঠিক type।

Crystal Designer-এ এটি String Field হিসেবে detect হওয়া উচিত।

## ১২. একইভাবে অন্য type কীভাবে map করবেন?

| Value | C# type | Crystal field type | Example |
|---|---|---|---|
| InvoiceNumber | `string` | String | INV-2026-0001 |
| InvoiceDate | `DateTime` | Date/DateTime | 24-08-2026 |
| Quantity | `int` | Number | 2 |
| UnitPrice | `decimal` | Currency/Number | 1,500.00 |
| TotalAmount | `decimal` | Currency/Number | 89,500.00 |

Model property type বদলালে `.rpt`-এ **Database -> Verify Database** দিতে হতে পারে।

## ১৩. InvoiceNumber পরিবর্তন করতে চাইলে কোথায় করবেন?

### শুধু report label পরিবর্তন

`Invoice No :` Text Object edit করুন। Code/database বদলাতে হবে না।

### Report-এ অন্য saved invoice number দেখানো

Database invoice record update অথবা invoice creation request-এর `InvoiceNumber` value পরিবর্তন করতে হবে। `.rpt` শুধু received value display করে।

### Property-এর নাম পরিবর্তন

উদাহরণ: `InvoiceNumber` থেকে `BillNumber` করলে একসঙ্গে update করতে হবে:

1. DTO property/mapping
2. `InvoiceReportModel` property
3. `FromInvoice` mapping
4. Project build
5. `.rpt` -> Verify Database/Set Datasource Location
6. পুরোনো field remove করে নতুন field drag

Beginner হিসেবে property rename না করাই সহজ। Display label বদলাতে শুধু Text Object বদলান।

## ১৪. Verify Database কখন দেবেন?

নিচের পরিবর্তনের পরে দিন:

- report model-এ নতুন property add
- property delete বা rename
- property type change
- report field missing দেখায়
- `The field name is not known` error আসে

Steps:

1. Project build করুন।
2. `.rpt` খুলুন।
3. **Database -> Verify Database** দিন।
4. Update confirmation এলে accept করুন।
5. কাজ না হলে **Database -> Set Datasource Location** খুলুন।
6. Current source-এর বদলে `.NET Objects -> InvoiceReportModel` select করুন।

## ১৫. Test করার সহজ নিয়ম

### Step 1: Raw data check

Browser/Postman:

```text
http://localhost:51234/api/reports/invoices/1/data
```

JSON-এ `InvoiceNumber` ঠিক আছে কিনা দেখুন।

### Step 2: PDF check

```text
http://localhost:51234/api/reports/invoices/1/pdf?inline=true
```

Expected:

```text
Invoice No : INV-2026-0001
```

### সমস্যা কোন layer-এ বুঝবেন

| `/data` JSON | PDF | সম্ভাব্য সমস্যা |
|---|---|---|
| InvoiceNumber ভুল | ভুল | Database বা `InvoiceService` mapping |
| InvoiceNumber ঠিক | field blank | Report model/RPT binding |
| InvoiceNumber ঠিক | field repeat | Field `Details` section-এ আছে |
| InvoiceNumber ঠিক | কাটা যায় | Field object-এর width ছোট |

## ১৬. Common ভুল

### শুধু `InvoiceNumber` type করে দেওয়া

Text Object-এ `InvoiceNumber` লিখলে PDF-তে literal `InvoiceNumber`-ই দেখাবে। Dynamic value পেতে Database Field drag করতে হবে।

### InvoiceNumber Details section-এ রাখা

প্রতি product-এর সঙ্গে invoice number repeat হবে। এটি Report Header-এ রাখুন।

### C# name ও report field name না মেলা

`InvoiceNo` এবং `InvoiceNumber` এক নয়। Exact property field ব্যবহার করুন।

### Project build না করে .NET Object খোঁজা

Designer পুরোনো compiled assembly পড়তে পারে। আগে build, তারপর report reopen করুন।

### String-এর বদলে number ব্যবহার

`INV-2026-0001` numeric value নয়। `string` ব্যবহার করুন।

## ১৭. গুরুত্বপূর্ণ প্রশ্ন ও উত্তর

### `Invoice No :` কোথা থেকে আসে?

এটি developer Crystal Designer-এর Text Object-এ type করে। Database থেকে আসে না।

### `INV-2026-0001` কোথা থেকে আসে?

`Invoices` table-এর `InvoiceNumber` column থেকে আসে।

### কে database থেকে value আনে?

`InvoiceService.GetReportAsync(id)`।

### DTO কেন দরকার?

Database entity থেকে report-ready header, customer, items ও total data এক object-এ বহন করে।

### Report model কেন দরকার?

Nested invoice item-গুলোকে Crystal-এর জন্য সহজ flat row list-এ রূপান্তর করে।

### Actual mapping line কোনটি?

```csharp
InvoiceNumber = invoice.InvoiceNumber,
```

### Actual binding line কোনটি?

```csharp
reportDocument.SetDataSource(reportRows);
```

### `.rpt` কি invoice number generate করে?

না। এটি শুধু mapped value display ও format করে।

### XSD লাগবে?

না। বর্তমান implementation সরাসরি `List<InvoiceReportModel>` bind করে।

## ১৮. এক লাইনের মনে রাখার নিয়ম

```text
Label নিজে type করুন; value Field Explorer থেকে drag করুন।
```

এবং data flow:

```text
Database value -> DTO -> Report Model -> SetDataSource -> RPT Field -> PDF
```
