# Enterprise Invoice System

A beginner-friendly, single-project invoice management Web API built with .NET Framework 4.8, ASP.NET Web API 2, EF6 Code First, SQL Server Express, Swagger, Newtonsoft.Json, and SAP Crystal Reports.

## Architecture

There is exactly one solution, one web project, one `.csproj`, one `Web.config`, one database, and one application process. Controllers, DTOs, EF models, services, migrations, and Crystal report code are separated into folders only; they are not separate projects.

```text
HTTP request -> Web API controller -> service -> EF6/SQL Server
                                              -> InvoiceReportDto
                                              -> InvoiceRows DataTable
                                              -> InvoiceReport.rpt
                                              -> Crystal PDF bytes
```

Crystal Reports runs directly in IIS Express. There is no report service, report-generator executable, `HttpClient` bridge, or port 5090.

## Requirements

- Visual Studio 2022 with **ASP.NET and web development** workload.
- .NET Framework 4.8 Developer Pack.
- SQL Server Express reachable as `RIZVE\SQLEXPRESS` with Windows Authentication.
- SAP Crystal Reports for Visual Studio and SAP Crystal Reports SP40 64-bit runtime.
- IIS Express configured for 64-bit execution.

## Restore and build

Open `EnterpriseInvoiceSystem.sln` in Visual Studio, select `Debug | x64`, right-click the solution and choose **Restore NuGet Packages**, then **Build Solution**.

Command-line equivalent from a Developer PowerShell:

```powershell
msbuild EnterpriseInvoiceSystem.sln /t:Restore /p:RestorePackagesConfig=true
msbuild EnterpriseInvoiceSystem.sln /t:Build /p:Configuration=Debug /p:Platform=x64
```

## Database and migrations

The named connection string `EnterpriseDbConnection` is in `EnterpriseInvoiceSystem/Web.config`. Change only that value when your SQL instance differs.

In Visual Studio Package Manager Console, with `EnterpriseInvoiceSystem` selected as the default project:

```powershell
Enable-Migrations -MigrationsDirectory Data\Migrations
Update-Database -Verbose
```

This repository already contains the `InitialCreate` migration. `Update-Database` creates `EnterpriseInvoiceDb`, four business tables, constraints, indexes, and `__MigrationHistory`. Its seed routine safely looks up stable customer/product names and invoice number before inserting, so application restarts do not duplicate the sample rows.

## Run and test

Press F5. The configured start page is Swagger:

```text
http://localhost:51234/swagger
```

Recommended order:

1. `GET /api/health`
2. `GET /api/customers`
3. `GET /api/products`
4. `GET /api/invoices`
5. `GET /api/invoices/1`
6. `GET /api/reports/invoices/1/data`
7. `GET /api/reports/invoices/1/pdf`

Invoice prices always come from `Products`; client prices are ignored. `InvoiceService` validates products and quantities, calculates each line, subtotal, discount, and total, and commits the invoice plus items in one transaction.

## Learning Crystal Reports with this project

`InvoiceService.GetReportAsync` loads Customer, Items, and Products with EF `Include` and maps them to `InvoiceReportDto`. `CrystalReportService.CreateInvoiceDataTable` converts that object into the flat `InvoiceRows` table. Every item becomes one row; invoice header and total fields repeat on each row. Crystal binds this predictable table to the `.rpt`, then exports it as PDF in the same web request.

### Create the real InvoiceReport.rpt

The `.rpt` is a proprietary binary designer file and must not be faked. If it is not present:

1. Open the project in Visual Studio with SAP Crystal Reports for Visual Studio installed.
2. Right-click `Reports` -> **Add** -> **New Item** -> **Crystal Report**.
3. Name it `InvoiceReport.rpt` and choose a blank report.
4. Open **Database Expert** -> **Create New Connection** -> **ADO.NET (XML)**.
5. Select `Reports/InvoiceReportData.xsd`, then add `InvoiceRows`.
6. In Report Header place the INVOICE title, invoice number/date, and customer fields.
7. In Page Header add Product, Quantity, Unit Price, and Line Total labels.
8. In Details add `ProductName`, `Quantity`, `UnitPrice`, and `LineTotal`.
9. In Report Footer add `Subtotal`, `DiscountAmount`, and `TotalAmount`.
10. Format money fields to two decimal places.
11. Set the file's **Build Action** to Content and **Copy to Output Directory** to Copy if newer.
12. Save, rebuild x64, and call the PDF endpoint.

Save the response and verify its first five bytes are `%PDF-`:

```powershell
$bytes = [IO.File]::ReadAllBytes('.\test-output\Invoice_INV-2026-0001.pdf')
[Text.Encoding]::ASCII.GetString($bytes[0..4])
```

## Common errors

- **BadImageFormatException:** IIS Express or the project is running x86. Select x64 and disable Prefer 32-bit.
- **Could not load CrystalDecisions...:** install/repair SAP Crystal Reports for Visual Studio and SP40 x64 runtime; confirm assembly versions match.
- **InvoiceReport.rpt was not found:** create the genuine report above and ensure Content/Copy if newer properties are set.
- **Field/table binding error:** refresh the report database from `InvoiceReportData.xsd`; names and types must exactly match `InvoiceRows` in `CrystalReportService`.
- **SQL connection error:** verify `RIZVE\SQLEXPRESS`, Windows permissions, SQL Server service state, and the connection string.
- **IIS Express access error:** stop stale IIS Express instances, delete the solution's `.vs` folder if safe, and reopen Visual Studio normally.

The report JSON endpoint is the best debugging tool: if its data is correct but PDF fails, investigate the XSD, `.rpt`, or Crystal runtime rather than EF calculations.
