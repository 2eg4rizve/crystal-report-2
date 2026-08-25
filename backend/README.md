# Enterprise Invoice System

A beginner-friendly, single-project invoice management Web API built with .NET Framework 4.8, ASP.NET Web API 2, EF6 Code First, SQL Server Express, Swagger, Newtonsoft.Json, and SAP Crystal Reports.

## Architecture

There is exactly one solution, one web project, one `.csproj`, one `Web.config`, one database, and one application process. Controllers, DTOs, EF models, services, migrations, and Crystal report code are separated into folders only; they are not separate projects.

```text
HTTP request -> Web API controller -> service -> EF6/SQL Server
                                              -> InvoiceReportDto
                                              -> InvoiceReportModel rows
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

### First-time Visual Studio steps

1. Clone or update the repository:

   ```powershell
   git clone https://github.com/2eg4rizve/crystal-report-2.git
   cd crystal-report-2\backend
   ```

   If it is already cloned, run `git pull origin main` instead.

2. Start Visual Studio 2022 and choose **Open a project or solution**.
3. Open only `backend/EnterpriseInvoiceSystem.sln`—do not use **Open Folder** and do not create another solution.
4. In Solution Explorer, right-click the solution and choose **Restore NuGet Packages**.
5. Select **Debug** and **x64** in the toolbar.
6. Right-click `EnterpriseInvoiceSystem` and choose **Set as Startup Project**.
7. Verify `EnterpriseInvoiceSystem/Web.config` points to your reachable SQL Server instance. The supplied value is `RIZVE\SQLEXPRESS` with Windows Authentication.
8. Press **F5** (debug) or **Ctrl+F5** (run without debugger).

The configured local frontend URL is:

```text
http://localhost:51234/
```

Swagger remains available at `http://localhost:51234/swagger`.

The first database-backed request applies the EF6 migration and idempotently inserts the sample data. You can also run `Update-Database -Verbose` from Package Manager Console before F5.

### If Visual Studio says the project was not loaded

1. Close Visual Studio completely.
2. Delete the repository's generated `.vs` directory.
3. Open Visual Studio Installer and confirm **ASP.NET and web development**, **.NET Framework 4.8 targeting pack**, and **.NET Framework project and item templates** are installed.
4. Reopen the `.sln` through **Open a project or solution**.
5. If the project is unavailable, right-click it and select **Reload Project**, then inspect **View → Output → Solution** for the exact load error.

Do not use `dotnet run`; this is a classic .NET Framework ASP.NET application hosted by IIS Express, not an ASP.NET Core application.

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

`InvoiceService.GetReportAsync` loads Customer, Items, and Products with EF `Include` and maps them to `InvoiceReportDto`. `InvoiceReportModel.FromInvoice` converts that nested DTO into one flat C# object per item. Invoice header and total fields repeat on every object. `CrystalReportService` passes the list directly to `ReportDocument.SetDataSource`, then exports the `.rpt` as PDF. No XSD or `DataTable` is used.

### Edit or recreate InvoiceReport.rpt

The project includes a genuine `InvoiceReport.rpt` that has generated a verified Crystal PDF. To edit or recreate it with the C# model:

1. Open the project in Visual Studio with SAP Crystal Reports for Visual Studio installed.
2. Right-click `Reports` -> **Add** -> **New Item** -> **Crystal Report**.
3. Name it `InvoiceReport.rpt` and choose a blank report.
4. Build the project once so Crystal Designer can discover the compiled class.
5. Open **Database Expert** -> **Project Data** -> **.NET Objects**.
6. Select `EnterpriseInvoiceSystem.Reports.InvoiceReportModel` and add it.
7. In Report Header place the INVOICE title, invoice number/date, and customer fields.
8. In Page Header add Product, Quantity, Unit Price, and Line Total labels.
9. In Details add `ProductName`, `Quantity`, `UnitPrice`, and `LineTotal`.
10. In Report Footer add `Subtotal`, `DiscountAmount`, and `TotalAmount`.
11. Format money fields to two decimal places, save, rebuild x64, and call the PDF endpoint.

Save the response and verify its first five bytes are `%PDF-`:

```powershell
$bytes = [IO.File]::ReadAllBytes('.\test-output\Invoice_INV-2026-0001.pdf')
[Text.Encoding]::ASCII.GetString($bytes[0..4])
```

## Common errors

- **BadImageFormatException:** IIS Express or the project is running x86. Select x64 and disable Prefer 32-bit.
- **Could not load CrystalDecisions...:** install/repair SAP Crystal Reports for Visual Studio and SP40 x64 runtime; confirm assembly versions match.
- **InvoiceReport.rpt was not found:** create the genuine report above and ensure Content/Copy if newer properties are set.
- **Field/table binding error:** use **Database -> Verify Database** or **Set Datasource Location**, choose the compiled `InvoiceReportModel`, and ensure its property names/types match the fields saved in the `.rpt`.
- **SQL connection error:** verify `RIZVE\SQLEXPRESS`, Windows permissions, SQL Server service state, and the connection string.
- **IIS Express access error:** stop stale IIS Express instances, delete the solution's `.vs` folder if safe, and reopen Visual Studio normally.

The report JSON endpoint is the best debugging tool: if its data is correct but PDF fails, investigate `InvoiceReportModel`, the `.rpt`, or the Crystal runtime rather than EF calculations.
