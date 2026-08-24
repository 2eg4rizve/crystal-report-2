# Enterprise Invoice System — Implementation and Verification Plan

## 1. Goal and non-negotiable constraints

Build a production-quality invoice management backend named `EnterpriseInvoiceSystem` using classic ASP.NET Web API 2 on .NET Framework 4.8.

The implementation must always retain these constraints:

- Exactly one solution: `EnterpriseInvoiceSystem.sln`.
- Exactly one application project and one `.csproj`: `EnterpriseInvoiceSystem/EnterpriseInvoiceSystem.csproj`.
- Exactly one `Web.config`, one SQL Server database, and one application process.
- Crystal Reports executes directly inside the Web API process.
- No secondary service, executable, test project, report-generator project, or HTTP bridge.
- No ASP.NET Core, EF Core, unofficial Crystal NuGet package, `HttpClient` report call, or port `5090` dependency.
- Target .NET Framework 4.8 and x64 in Debug and Release, with Prefer 32-bit disabled.

## 2. Environment and feasibility audit

Before generating the application, record the results of these checks:

1. Confirm Visual Studio 2022 or MSBuild for Visual Studio is installed with the ASP.NET/web workload.
2. Confirm the .NET Framework 4.8 targeting pack and reference assemblies are installed.
3. Confirm NuGet CLI/MSBuild package restore capability.
4. Confirm IIS Express is installed and determine its executable path.
5. Confirm `RIZVE\SQLEXPRESS` is reachable with Windows Authentication.
6. Confirm SQL tooling is available (`sqlcmd`, PowerShell SQL tooling, or EF migration tooling).
7. Locate the installed SAP Crystal Reports for Visual Studio assemblies and record their exact versions and paths:
   - `CrystalDecisions.CrystalReports.Engine.dll`
   - `CrystalDecisions.Shared.dll`
   - `CrystalDecisions.ReportSource.dll`
   - `CrystalDecisions.Web.dll`
8. Confirm SAP Crystal Reports SP40 x64 runtime/designer compatibility.
9. Determine whether the Crystal Reports designer or another legitimate SAP-supported mechanism can create a real binary `.rpt` file.

If an environmental prerequisite is absent, continue all independent work and document the exact failed command, error, prerequisite, and affected tests. Never create a text file disguised as `InvoiceReport.rpt` or claim PDF generation passed without a real Crystal-generated PDF.

## 3. Create the single classic project

1. Create `EnterpriseInvoiceSystem.sln` at the repository root.
2. Create one old-style ASP.NET Web Application project at `EnterpriseInvoiceSystem/EnterpriseInvoiceSystem.csproj`.
3. Target `.NETFramework,Version=v4.8` using classic MSBuild project syntax.
4. Add Debug/Release x64 solution and project configurations.
5. Set the project output to a web application library, target x64, and disable Prefer 32-bit.
6. Add IIS Express project settings with `/swagger` as the start page.
7. Create only the requested application folders and files inside that project.
8. Immediately verify with a recursive file count that exactly one `.sln` and one `.csproj` exist.

## 4. Restore supported dependencies

Add .NET Framework 4.8-compatible packages through `packages.config`, including:

- Entity Framework 6
- ASP.NET Web API 2 Core, Client, and WebHost
- Newtonsoft.Json
- Swashbuckle.Core for Web API 2

Restore packages and confirm the resolved assemblies exist. Reference Crystal assemblies directly from their actual SAP installation paths—never through unofficial NuGet packages. Configure reference metadata and deployment behavior to match the installed SAP runtime.

## 5. Application bootstrap and configuration

1. Add `Global.asax` and `Global.asax.cs` to initialize EF and Web API.
2. Add `App_Start/WebApiConfig.cs`:
   - Enable attribute routing.
   - Configure a conventional fallback route if useful.
   - Make JSON the default API format.
   - Apply camel-case property naming.
   - Ignore null properties and reference loops.
3. Add `App_Start/SwaggerConfig.cs` and expose all routes under `/swagger`.
4. Configure `Web.config` with:
   - Named `EnterpriseDbConnection` connection string.
   - `Server=RIZVE\SQLEXPRESS;Database=EnterpriseInvoiceDb;Trusted_Connection=True;Encrypt=False;TrustServerCertificate=True;`.
   - EF6 SQL Server provider registration.
   - ASP.NET compilation and HTTP runtime targeting 4.8.
   - Safe custom error behavior appropriate for local development versus production.
   - Required classic ASP.NET handlers/modules and binding redirects.
5. Confirm there is no service URL, port `5090`, or second-process configuration.

## 6. Entity Framework 6 data model

Implement these entities in `Models/` with DataAnnotations and/or Fluent API:

- `Customer`
- `Product`
- `Invoice`
- `InvoiceItem`

Implement `Data/EnterpriseDbContext.cs` using `name=EnterpriseDbConnection`. Disable proxy creation and lazy loading to avoid serialization surprises.

Use Fluent API to enforce:

- Required fields and maximum lengths.
- Decimal precision `(18,2)` on every monetary field.
- Unique index on `Invoice.InvoiceNumber`.
- Customer → Invoices without cascade delete.
- Invoice → InvoiceItems with cascade delete.
- Product → InvoiceItems without cascade delete.
- Required foreign keys and appropriate indexes.

## 7. Migration and idempotent seed data

1. Enable EF6 Code First migrations inside `Data/Migrations/`.
2. Create a real `InitialCreate` migration containing tables, keys, relationships, precision, and the unique invoice-number index.
3. Add an idempotent initializer/seed routine using stable business keys:
   - Customer names/phones as appropriate.
   - Product names.
   - Invoice number `INV-2026-0001`.
4. Seed the two required customers, three required products, and sample invoice with stored historical prices and totals.
5. Apply migrations to `RIZVE\SQLEXPRESS` and create `EnterpriseInvoiceDb`.
6. Query the database to verify all four tables, `__MigrationHistory`, constraints, sample rows, and totals.
7. Run initialization again and prove no duplicate seed records are created.

## 8. DTOs and validation

Create request/response models only in the same project:

- `DTOs/CustomerDtos.cs`
- `DTOs/ProductDtos.cs`
- `DTOs/InvoiceDtos.cs`
- `DTOs/InvoiceReportDto.cs`

Apply DataAnnotations with readable messages for required values, lengths, positive prices/quantities, non-negative discounts, and required item collections. Controllers must return DTOs and never serialize EF entities.

## 9. Services and business rules

### CustomerService and ProductService

- Implement async list/get/create/update/delete operations using EF6 async APIs.
- Map entities to response DTOs.
- Reject deletion with `409 Conflict` when historical references prevent it.
- Return clear not-found and validation outcomes.

### InvoiceService

Implement invoice creation and report-data loading in one authoritative service:

1. Trim and validate the invoice number.
2. Check invoice-number uniqueness, with database unique-index violations handled as conflicts.
3. Validate the customer and every product.
4. Require at least one item, positive quantities, and unique product IDs.
5. Ignore any client pricing and copy product prices from the database.
6. Calculate each `LineTotal`, `Subtotal`, and `TotalAmount` using `decimal`.
7. Reject negative discounts and discounts above subtotal.
8. Save invoice and items atomically in an EF transaction.
9. Preserve copied price data for invoice history.
10. Load related Customer, Items, and Product explicitly using `Include` for response/report mappings.

Centralize calculation logic here so controllers and reporting do not recalculate totals.

## 10. Controllers and HTTP behavior

Implement thin attribute-routed controllers using `IHttpActionResult`:

- `GET /api/health`
- Customer CRUD routes
- Product CRUD routes
- Invoice list/get/create routes
- `GET /api/reports/invoices/{id}/data`
- `GET /api/reports/invoices/{id}/pdf`

Return `200`, `201`, `204`, `400`, `404`, and `409` as appropriate. Translate expected business errors into stable JSON objects such as `{ "message": "...", "detail": "..." }`. Reserve `500` for unexpected database/runtime/report failures and do not expose full stack traces.

## 11. Crystal Reports data contract

1. Create `Reports/InvoiceReportData.xsd` with DataTable `InvoiceRows`.
2. Define exact matching columns and CLR/XML types:
   - `InvoiceId` (`int`)
   - `InvoiceNumber` (`string`)
   - `InvoiceDate` (`DateTime`)
   - `CustomerName`, `CustomerPhone`, `CustomerAddress` (`string`)
   - `ProductId` (`int`)
   - `ProductName` (`string`)
   - `Quantity` (`int`)
   - `UnitPrice`, `LineTotal`, `Subtotal`, `DiscountAmount`, `TotalAmount` (`decimal`)
3. Validate the XSD by loading it as a DataSet and confirming the table/column schema programmatically.
4. Implement `Services/CrystalReportService.cs`:
   - Resolve `~/Reports/InvoiceReport.rpt` with `HostingEnvironment.MapPath`.
   - Throw a readable `FileNotFoundException` if absent.
   - Create a fresh `InvoiceRows` DataTable per request.
   - Add one row per item and repeat invoice header/totals.
   - Create a fresh `ReportDocument` per request.
   - Load, bind, and export using `ExportFormatType.PortableDocFormat`.
   - Dispose the report, Crystal stream, and memory stream correctly.
5. Ensure no static report state exists, making concurrent requests independent.

## 12. Real Crystal report design

If the SAP designer is available, create the genuine binary `Reports/InvoiceReport.rpt` using `InvoiceReportData.xsd` → `InvoiceRows` as its data source.

Design it with:

- Report header: INVOICE, invoice number/date, customer name/phone/address.
- Page header: Product, Quantity, Unit Price, Line Total.
- Details: bound item fields.
- Report footer: Subtotal, Discount, Grand Total.
- Two-decimal formatting for all monetary values.

Set `.rpt` project metadata to `Content` and `Copy if newer`. Validate the file through Crystal ReportDocument loading—not merely by checking that it exists.

If automated creation is impossible, do not create the `.rpt`; complete and validate the XSD/runtime code, then record the exact Visual Studio designer steps as the one remaining manual gate. PDF tests remain explicitly not passed until that gate is completed.

## 13. ReportsController PDF response

1. Obtain `InvoiceReportDto` directly from `InvoiceService`/EF6.
2. Return `404` for a missing invoice.
3. Call `CrystalReportService` inside the same application process.
4. Sanitize invalid filename characters from the invoice number.
5. Return a byte-array response with:
   - `200 OK`
   - `Content-Type: application/pdf`
   - `Content-Disposition: attachment`
   - `Invoice_{safeInvoiceNumber}.pdf`
6. Convert missing report/runtime/binding/export failures to readable, non-stack-trace server errors.

## 14. Build and static acceptance checks

1. Restore NuGet packages.
2. Build Debug x64 and Release x64 using Visual Studio MSBuild.
3. Confirm zero compilation errors and resolved Crystal references.
4. Confirm exactly one `.sln`, one `.csproj`, and one `Web.config`.
5. Inspect project XML to confirm .NET Framework 4.8 and x64 settings.
6. Search the repository to prove absence of:
   - Extra projects/executables/services.
   - `5090`.
   - `HttpClient` report forwarding.
   - ASP.NET Core or EF Core packages.
   - Unofficial Crystal NuGet packages.
7. Confirm report content is copied to the web application's output/deployment layout.

## 15. Run and full API verification

Start the single Web API application with IIS Express in x64-compatible mode. Capture the actual local base URL and test Swagger plus every endpoint with real HTTP requests.

Recommended order:

1. `/swagger` loads and lists every endpoint, including PDF.
2. `GET /api/health` returns the required healthy payload.
3. List/get/create/update/delete customers, including validation, missing ID, and referenced-customer conflict cases.
4. List/get/create/update/delete products, including validation, missing ID, and referenced-product conflict cases.
5. List/get invoices and verify seeded invoice `1` (or query the actual seeded ID).
6. Create a valid invoice and confirm authoritative product prices and calculations.
7. Exercise duplicate invoice number, missing customer/product, empty items, duplicate product, invalid quantity, negative discount, and excessive discount.
8. `GET /api/reports/invoices/{id}/data` returns the expected customer, item, subtotal, discount, and total values.
9. Missing resources return `404`; conflicts return `409`; validation returns `400`.
10. Restart the application and reconfirm seed counts are unchanged.

Use unique test business keys and clean up only test-created records when safe, without deleting required seed data.

## 16. Real PDF acceptance test

Call `GET /api/reports/invoices/{id}/pdf` and save the response beneath `test-output/`.

Verify and record:

- HTTP status is `200`.
- Content type is `application/pdf`.
- Content disposition contains the safe invoice filename.
- File length is greater than zero.
- First five bytes are exactly `%PDF-`.
- The PDF can be opened or parsed and visibly contains the invoice header, all three products, subtotal `90500`, discount `1000`, and total `89500` when inspection tooling permits.

Also test missing invoice and controlled missing-report behavior. Never report PDF success based on mocked bytes or a non-Crystal PDF library.

## 17. README and evidence

Create a beginner-friendly root `README.md` covering every requested setup, architecture, database, migration, runtime, API, Crystal binding, designer, PDF verification, and troubleshooting topic. Include:

- The one-project architecture and final tree.
- Required Visual Studio workload, .NET Framework 4.8 Developer Pack, SQL Server Express, and SAP SP40 x64 components.
- Restore/build/migration/run commands.
- Connection-string customization.
- Seed behavior and testing order.
- Swagger, report JSON, and PDF URLs.
- The complete EF → DTO → DataTable → `.rpt` → PDF flow.
- Exact Crystal designer/XSD steps.
- Troubleshooting for x86/x64, missing assemblies/runtime/report, database connectivity, schema mismatch, and IIS Express permissions.
- Honest status of any environment-dependent or manual step.

Create a verification record (for example `TEST_RESULTS.md`) containing each required test, its command/request, timestamp, result, and relevant evidence. Failed or blocked tests must include the exact error and required remediation.

## 18. Final acceptance audit and handoff

Before declaring completion:

1. Repeat solution/project/config counts.
2. Repeat clean x64 build.
3. Repeat database schema and seed verification.
4. Repeat live health, list, invoice, report-data, and PDF smoke tests.
5. Confirm the PDF begins `%PDF-`.
6. Confirm the application uses one process and Crystal executes in-process.
7. Confirm no forbidden project names, second service, port `5090`, or fake `.rpt` exists.
8. Check `git diff`/workspace changes and preserve unrelated files.

The final handoff must state:

- Implemented features.
- Final folder tree.
- The sole `.csproj` path.
- Migration/database result.
- Actual Swagger, report JSON, and PDF URLs.
- Actual generated-PDF evidence.
- Any remaining Crystal designer step, if applicable.
- Exact commands and Visual Studio F5 steps.

## 19. Planned deliverable tree

```text
EnterpriseInvoiceSystem.sln
IMPLEMENTATION_PLAN.md
README.md
TEST_RESULTS.md
test-output/
EnterpriseInvoiceSystem/
├── EnterpriseInvoiceSystem.csproj
├── App_Start/
│   ├── SwaggerConfig.cs
│   └── WebApiConfig.cs
├── Controllers/
│   ├── CustomersController.cs
│   ├── HealthController.cs
│   ├── InvoicesController.cs
│   ├── ProductsController.cs
│   └── ReportsController.cs
├── Data/
│   ├── EnterpriseDbContext.cs
│   ├── EnterpriseDbInitializer.cs
│   └── Migrations/
├── DTOs/
│   ├── CustomerDtos.cs
│   ├── InvoiceDtos.cs
│   ├── InvoiceReportDto.cs
│   └── ProductDtos.cs
├── Models/
│   ├── Customer.cs
│   ├── Invoice.cs
│   ├── InvoiceItem.cs
│   └── Product.cs
├── Properties/
│   └── AssemblyInfo.cs
├── Reports/
│   ├── InvoiceReport.rpt
│   └── InvoiceReportData.xsd
├── Services/
│   ├── CrystalReportService.cs
│   ├── CustomerService.cs
│   ├── InvoiceService.cs
│   └── ProductService.cs
├── Global.asax
├── Global.asax.cs
├── packages.config
└── Web.config
```

`InvoiceReport.rpt` appears in the target tree only when it is a genuine Crystal Reports binary created with the SAP designer/tooling.
