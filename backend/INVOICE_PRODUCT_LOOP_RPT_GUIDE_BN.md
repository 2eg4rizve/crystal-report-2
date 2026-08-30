# InvoiceReport.rpt-এ ৩টি Product Row কীভাবে Loop হয়ে দেখায়

এই guide-এ sample invoice-এর তিনটি product কীভাবে database থেকে Crystal Report PDF-তে row হিসেবে আসে, value কোথায় set হয়, loop কোথায় হয় এবং `Details` section কীভাবে কাজ করে—সব ধাপে ব্যাখ্যা করা হয়েছে।

> Project-এর actual sample invoice number হলো `INV-2026-0001`। `INV-2026-000` লিখলে সেটি আলাদা invoice number হিসেবে ধরা হবে।

## ১. Final report-এ কী দেখাতে চাই?

```text
Invoice No: INV-2026-0001

Product              Qty    Unit Price    Line Total
Business Laptop       1      85,000.00     85,000.00
Wireless Mouse        2       1,500.00      3,000.00
Office Keyboard       1       2,500.00      2,500.00

Subtotal:                                  90,500.00
Discount:                                   1,000.00
Total:                                     89,500.00
```

এখানে:

```text
Laptop:   1 × 85,000 = 85,000
Mouse:    2 ×  1,500 =  3,000
Keyboard: 1 ×  2,500 =  2,500
                              ---------
Subtotal                     = 90,500
Discount                     =  1,000
Total                        = 89,500
```

## ২. পুরো data flow

```text
Products table
  Product name + current unit price
             ↓
Invoices table
  Invoice number + customer + discount + total
             ↓
InvoiceItems table
  ProductId + Quantity + saved UnitPrice + LineTotal
             ↓
InvoiceService.GetReportAsync(id)
             ↓
InvoiceReportDto.Items (৩টি item)
             ↓
InvoiceReportModel.FromInvoice(...)
  Select loop দিয়ে ৩টি flat report object
             ↓
reportDocument.SetDataSource(reportRows)
             ↓
InvoiceReport.rpt Details section
  প্রতি object-এর জন্য একবার print
             ↓
PDF-তে ৩টি product row
```

## ৩. Product name ও price প্রথমে কোথায় set হয়?

Sample data file:

```text
EnterpriseInvoiceSystem/Data/EnterpriseDbInitializer.cs
```

Product master data set করা হয়েছে:

```csharp
EnsureProduct(db, "Business Laptop", 85000m, now);
EnsureProduct(db, "Wireless Mouse", 1500m, now);
EnsureProduct(db, "Office Keyboard", 2500m, now);
```

এখানে:

- প্রথম value product name
- দ্বিতীয় value product unit price
- `m` suffix বোঝায় এটি C# `decimal` value

যেমন:

```csharp
85000m
```

Database-এ numeric value `85000` থাকে। Crystal formatting-এর কারণে PDF-তে `85,000.00` দেখা যায়। Comma এবং দুই decimal database value-এর অংশ নয়।

## ৪. Sample invoice-এর item values কোথায় set হয়?

একই seed file-এ sample invoice তৈরি করার সময় `invoice.Items.Add(...)` দিয়ে তিনটি item add করা হয়েছে।

### Business Laptop

```csharp
invoice.Items.Add(
    new InvoiceItem
    {
        ProductId = laptop.Id,
        Quantity = 1,
        UnitPrice = 85000m,
        LineTotal = 85000m,
    }
);
```

Calculation:

```text
1 × 85,000 = 85,000
```

### Wireless Mouse

```csharp
invoice.Items.Add(
    new InvoiceItem
    {
        ProductId = mouse.Id,
        Quantity = 2,
        UnitPrice = 1500m,
        LineTotal = 3000m,
    }
);
```

Calculation:

```text
2 × 1,500 = 3,000
```

### Office Keyboard

```csharp
invoice.Items.Add(
    new InvoiceItem
    {
        ProductId = keyboard.Id,
        Quantity = 1,
        UnitPrice = 2500m,
        LineTotal = 2500m,
    }
);
```

Calculation:

```text
1 × 2,500 = 2,500
```

এই তিনটি `InvoiceItem` database-এর `InvoiceItems` table-এ save হয়।

## ৫. InvoiceItem model কী রাখে?

File:

```text
EnterpriseInvoiceSystem/Models/InvoiceItem.cs
```

```csharp
public class InvoiceItem
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public virtual Product Product { get; set; }
}
```

Field-এর কাজ:

| Field | কাজ |
|---|---|
| `InvoiceId` | item কোন invoice-এর তা বোঝায় |
| `ProductId` | কোন product তা বোঝায় |
| `Quantity` | কয়টি product কেনা হয়েছে |
| `UnitPrice` | invoice তৈরির সময়কার প্রতি unit price |
| `LineTotal` | `Quantity × UnitPrice` |
| `Product` | product name পড়ার navigation property |

`UnitPrice` invoice item-এ আলাদাভাবে save করা গুরুত্বপূর্ণ। ভবিষ্যতে product master price বদলালেও পুরোনো invoice-এর historical price ঠিক থাকে।

## ৬. নতুন invoice API দিয়ে তৈরি হলে value কীভাবে calculate হয়?

Client শুধু product ID এবং quantity পাঠায়:

```json
{
  "invoiceNumber": "INV-2026-0002",
  "invoiceDate": "2026-08-25",
  "customerId": 1,
  "discountAmount": 1000,
  "items": [
    { "productId": 1, "quantity": 1 },
    { "productId": 2, "quantity": 2 },
    { "productId": 3, "quantity": 1 }
  ]
}
```

Client `UnitPrice` বা `LineTotal` পাঠায় না। Server product table থেকে trusted price নেয়।

সব selected product load হয়:

```csharp
var products = await db.Products
    .Where(product => productIds.Contains(product.Id))
    .ToDictionaryAsync(product => product.Id);
```

Subtotal calculate হয়:

```csharp
var subtotal = request.Items.Sum(item =>
    products[item.ProductId].UnitPrice * item.Quantity
);
```

তারপর item তৈরির explicit loop:

```csharp
foreach (var item in request.Items)
{
    var price = products[item.ProductId].UnitPrice;

    invoice.Items.Add(
        new InvoiceItem
        {
            ProductId = item.ProductId,
            Quantity = item.Quantity,
            UnitPrice = price,
            LineTotal = price * item.Quantity,
        }
    );
}
```

Project-এর actual variable নাম `r`, কিন্তু বোঝার সুবিধার জন্য example-এ `request` লেখা হয়েছে।

### এই loop কী করে?

তিনটি request item থাকলে `foreach` তিনবার চলে:

```text
Loop 1 -> Product 1 -> Laptop item তৈরি
Loop 2 -> Product 2 -> Mouse item তৈরি
Loop 3 -> Product 3 -> Keyboard item তৈরি
```

প্রতিবার server:

1. Product ID দিয়ে trusted price খুঁজে নেয়।
2. Quantity request থেকে নেয়।
3. `LineTotal = price × quantity` করে।
4. নতুন `InvoiceItem` invoice-এর Items collection-এ add করে।

## ৭. Total values কীভাবে set হয়?

Invoice তৈরির সময়:

```csharp
DiscountAmount = request.DiscountAmount,
TotalAmount = subtotal - request.DiscountAmount,
```

Sample invoice:

```text
Subtotal      = 85,000 + 3,000 + 2,500
              = 90,500

Discount      = 1,000

TotalAmount   = 90,500 - 1,000
              = 89,500
```

`Subtotal` database-এর Invoice table-এ আলাদা column হিসেবে রাখা হয়নি। Report data তৈরির সময় item line totals যোগ করে calculate করা হয়।

## ৮. Database থেকে report DTO-তে item list কীভাবে আসে?

File:

```text
EnterpriseInvoiceSystem/Services/InvoiceService.cs
```

`GetReportAsync(id)` invoice, customer, items এবং products load করে। এরপর:

```csharp
Items = invoiceEntity.Items
    .OrderBy(item => item.Id)
    .Select(item => new InvoiceReportItemDto
    {
        ProductId = item.ProductId,
        ProductName = item.Product.Name,
        Quantity = item.Quantity,
        UnitPrice = item.UnitPrice,
        LineTotal = item.LineTotal,
    })
    .ToList()
```

Project-এর actual variable নাম `x` ও `i`; example-এ descriptive নাম ব্যবহার করা হয়েছে।

### এখানে loop কোথায়?

এই LINQ অংশটিই একটি loop:

```csharp
.Select(item => new InvoiceReportItemDto { ... })
```

`invoiceEntity.Items`-এ তিনটি item থাকলে `Select` তিনবার চলে এবং তিনটি DTO বানায়। `.ToList()` result-কে list বানায়।

Result:

```text
InvoiceReportDto
  Items[0] = Business Laptop
  Items[1] = Wireless Mouse
  Items[2] = Office Keyboard
```

Subtotal-ও item loop করে বের করা হয়:

```csharp
Subtotal = invoiceEntity.Items.Sum(item => item.LineTotal)
```

`Sum` তিনটি `LineTotal` যোগ করে `90,500` দেয়।

## ৯. Report model list তৈরির loop কোথায়?

File:

```text
EnterpriseInvoiceSystem/Reports/InvoiceReportModel.cs
```

মূল code:

```csharp
return invoiceItems
    .Select(invoiceItem => new InvoiceReportModel
    {
        InvoiceNumber = invoice.InvoiceNumber,
        ProductName = invoiceItem.ProductName,
        Quantity = invoiceItem.Quantity,
        UnitPrice = invoiceItem.UnitPrice,
        LineTotal = invoiceItem.LineTotal,
        Subtotal = invoice.Subtotal,
        DiscountAmount = invoice.DiscountAmount,
        TotalAmount = invoice.TotalAmount,
    })
    .ToList();
```

এই `.Select(...)` হলো report row তৈরির loop।

তিনটি item-এর জন্য output:

```text
reportRows.Count = 3

reportRows[0]
  ProductName = Business Laptop
  Quantity = 1
  UnitPrice = 85000
  LineTotal = 85000

reportRows[1]
  ProductName = Wireless Mouse
  Quantity = 2
  UnitPrice = 1500
  LineTotal = 3000

reportRows[2]
  ProductName = Office Keyboard
  Quantity = 1
  UnitPrice = 2500
  LineTotal = 2500
```

প্রতিটি row-তে invoice header এবং total-ও repeat থাকে:

```text
InvoiceNumber = INV-2026-0001
Subtotal = 90500
DiscountAmount = 1000
TotalAmount = 89500
```

## ১০. CrystalReportService-এ loop আছে কি?

Service-এ manual `foreach` নেই। এটি পুরো list একবারে bind করে:

```csharp
var reportRows = InvoiceReportModel.FromInvoice(invoice);
reportDocument.SetDataSource(reportRows);
```

`reportRows`-এ তিনটি object আছে। Crystal Reports list-টি data source হিসেবে গ্রহণ করে।

## ১১. Crystal Report নিজে কীভাবে তিনটি row দেখায়?

Crystal Designer-এর `Details` section একটি automatic loop section। Data source-এর প্রতিটি record-এর জন্য section একবার print হয়।

```text
Data source record 1 -> Details print 1 -> Laptop
Data source record 2 -> Details print 2 -> Mouse
Data source record 3 -> Details print 3 -> Keyboard
```

অর্থাৎ `.rpt`-এর ভিতরে আলাদা `for` বা `foreach` লিখতে হয় না। `Details` section-ই loop করে।

## ১২. Designer-এ product table কীভাবে বসাবেন?

### Page Header-এ static column title

চারটি Text Object type করুন:

```text
Product | Qty | Unit Price | Line Total
```

এগুলো label; database value নয়।

### Details section-এ dynamic field

Field Explorer থেকে drag করুন:

```text
InvoiceReportModel.ProductName
InvoiceReportModel.Quantity
InvoiceReportModel.UnitPrice
InvoiceReportModel.LineTotal
```

Layout:

```text
Page Header: [Product]     [Qty] [Unit Price] [Line Total]
Details:     [ProductName] [Quantity] [UnitPrice] [LineTotal]
```

সব চারটি dynamic field একই `Details` section-এর একই horizontal line-এ রাখুন।

## ১৩. Values কি manually type করতে হবে?

না। Dynamic values manually লিখবেন না।

ভুল:

```text
Text Object-এ Business Laptop লেখা
Text Object-এ 85000 লেখা
```

এতে report সব invoice-তেই একই hard-coded value দেখাবে।

সঠিক:

```text
Field Explorer থেকে ProductName drag
Field Explorer থেকে Quantity drag
Field Explorer থেকে UnitPrice drag
Field Explorer থেকে LineTotal drag
```

Runtime-এ `SetDataSource(reportRows)` current invoice-এর actual values বসাবে।

## ১৪. 85,000.00 format কীভাবে আসে?

C# value:

```text
85000m
```

Crystal formatting:

1. `.rpt`-এ `UnitPrice` field right-click করুন।
2. **Format Field** নির্বাচন করুন।
3. **Number** tab খুলুন।
4. Decimal places `2` দিন।
5. Thousands separator enable করুন।
6. একই format `LineTotal`, `Subtotal`, `DiscountAmount`, `TotalAmount`-এ দিন।

তারপর:

```text
85000  -> 85,000.00
1500   -> 1,500.00
3000   -> 3,000.00
```

Formatting value পরিবর্তন করে না; শুধু display পরিবর্তন করে।

## ১৫. Totals কোন section-এ রাখবেন?

`Subtotal`, `DiscountAmount`, `TotalAmount` প্রতিটি report row object-এ repeat থাকে। এগুলো `Details`-এ রাখলে তিনবার দেখাবে।

একবার দেখাতে `Report Footer`-এ রাখুন:

```text
Report Footer
  Subtotal: [Subtotal]
  Discount: [DiscountAmount]
  Total:    [TotalAmount]
```

Product fields `Details`-এ এবং totals `Report Footer`-এ—এটাই গুরুত্বপূর্ণ layout rule।

## ১৬. তিন ধরনের loop একসঙ্গে বুঝুন

### Loop 1: Invoice create loop

```csharp
foreach (var item in request.Items)
```

কাজ: প্রতিটি request item-এর price/quantity/line total database-এ save করা।

### Loop 2: DTO/report model conversion loop

```csharp
.Select(item => new InvoiceReportItemDto { ... })
.Select(item => new InvoiceReportModel { ... })
```

কাজ: database entities থেকে DTO এবং flat report object বানানো।

### Loop 3: Crystal Details rendering loop

```text
Details section × data source record count
```

কাজ: প্রতিটি report object-এর জন্য PDF-তে একটি visual row print করা।

## ১৭. Product row না দেখালে কী check করবেন?

### প্রথমে data endpoint

```text
GET /api/reports/invoices/1/data
```

Expected `Items` count:

```text
3
```

### তারপর report model

Breakpoint দিন:

```csharp
var reportRows = InvoiceReportModel.FromInvoice(invoice);
```

Check করুন:

```text
reportRows.Count == 3
```

### তারপর `.rpt`

- চারটি product field `Details` section-এ আছে কিনা
- field model property-এর সঙ্গে match করে কিনা
- Details section suppress করা আছে কিনা
- Database -> Verify Database দেওয়া হয়েছে কিনা

## ১৮. Common সমস্যা

| সমস্যা | কারণ | সমাধান |
|---|---|---|
| শুধু এক product আসে | DTO/model list-এ এক item | `/data` response এবং `reportRows.Count` দেখুন |
| তিন product একই value | hard-coded Text Object বা ভুল field | Database Field drag করুন |
| Invoice number তিনবার আসে | InvoiceNumber Details-এ | Report Header-এ নিন |
| Total তিনবার আসে | Total Details-এ | Report Footer-এ নিন |
| Unit price ভুল | Product master price বা saved item price | `InvoiceItems.UnitPrice` পরীক্ষা করুন |
| Line total ভুল | Quantity × UnitPrice mapping ভুল | Create loop/calculation দেখুন |
| 85000 দেখায়, 85,000.00 নয় | Number formatting হয়নি | Format Field-এ separator ও 2 decimals দিন |
| Product row blank | Details fields bind হয়নি | Verify Database/Set Datasource Location দিন |

## ১৯. গুরুত্বপূর্ণ প্রশ্ন ও উত্তর

### আসল product loop কোথায়?

Code-এ `.Select(...)` report object বানায়; Crystal-এর `Details` section প্রতিটি object render করে।

### `.rpt`-এ কি `foreach` লিখতে হয়?

না। Details section automatic record loop।

### ProductName কোথা থেকে আসে?

`item.Product.Name` থেকে DTO-তে, তারপর report model-এ আসে।

### Quantity কোথা থেকে আসে?

Invoice create request/seed থেকে `InvoiceItem.Quantity`-তে save হয়।

### UnitPrice কোথা থেকে আসে?

নতুন invoice তৈরির সময় Products table-এর trusted `UnitPrice` নিয়ে `InvoiceItem.UnitPrice`-এ snapshot হিসেবে save হয়।

### LineTotal কোথায় calculate হয়?

```csharp
LineTotal = price * item.Quantity
```

### Subtotal কোথায় calculate হয়?

Create-এর সময় request item sum করা হয়; report read-এর সময় saved line total sum করে DTO-তে দেওয়া হয়:

```csharp
Subtotal = invoice.Items.Sum(item => item.LineTotal)
```

### কেন header/total প্রতিটি model object-এ repeat হয়?

Flat list-এর প্রতিটি record self-contained রাখার জন্য। Crystal section ব্যবহার করে repeated value একবার বা বহুবার কোথায় দেখাবে তা নিয়ন্ত্রণ করা হয়।

## ২০. এক নজরে sample invoice

```text
InvoiceReportDto.Items.Count = 3
              ↓ FromInvoice Select loop
List<InvoiceReportModel>.Count = 3
              ↓ SetDataSource
Crystal Details section runs 3 times
              ↓
PDF contains 3 product rows
```

মনে রাখার নিয়ম:

```text
List-এ যত object, Details section ততবার print।
```
