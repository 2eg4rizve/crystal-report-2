# Test Results — 2026-08-24

Only executed checks are marked passed.

| Test | Result | Evidence |
|---|---|---|
| NuGet restore | PASS | MSBuild restore installed all 10 `packages.config` dependencies; 0 errors. |
| Debug x64 build | PASS | VS 2022 amd64 MSBuild; 0 errors. |
| Release x64 build | PASS | VS 2022 amd64 MSBuild; 0 warnings, 0 errors before the later runtime-reference correction; Debug rebuild confirms that correction. |
| Single solution/project/config | PASS | Counts under `backend`: 1 `.sln`, 1 `.csproj`, 1 `Web.config`. |
| .NET target/platform | PASS | `TargetFrameworkVersion=v4.8`; Debug and Release `PlatformTarget=x64`; 64-bit IIS Express enabled; Prefer 32-bit false. |
| Crystal references | PASS | Build resolved official installed SAP assemblies from `win64_x64`; assembly version `13.0.4000.0`. |
| XSD parses | PASS | XML parser loaded `InvoiceReportData.xsd`; root is `schema`; table contract is `InvoiceRows`. |
| EF6 InitialCreate migration | PASS | EF6 generated `202608240628323_InitialCreate` with code, designer metadata, and model resource. |
| Database creation and migration | PASS via application | First IIS request initialized `EnterpriseInvoiceDb`; all seeded API queries succeeded. Direct CLI `database update` initially failed with `The target principal name is incorrect. Cannot generate SSPI context.` under that process identity. |
| Idempotent seed customers | PASS | `GET /api/customers` returned exactly the two required customers. |
| Idempotent seed products | PASS | `GET /api/products` returned exactly the three required products/prices. |
| Seed invoice/calculation | PASS | Invoice 1 returned subtotal 90500, discount 1000, total 89500 and all three correct lines. |
| IIS Express application startup | PASS | 64-bit IIS Express on port 51234. |
| `GET /api/health` | PASS | HTTP 200 with required Healthy JSON. |
| Swagger | PASS | `/swagger` returned HTTP 200 (6598-byte HTML response). |
| `GET /api/customers` | PASS | HTTP 200; two seed rows. |
| `GET /api/products` | PASS | HTTP 200; three seed rows. |
| `GET /api/invoices` | PASS | HTTP 200; seeded invoice. |
| `GET /api/invoices/1` | PASS | HTTP 200; correct header, lines, and totals. |
| `GET /api/reports/invoices/1/data` | PASS | HTTP 200; exact report DTO data and totals. |
| `GET /api/reports/invoices/1/pdf` | BLOCKED | HTTP 500 with the designed missing-report response because no genuine `Reports/InvoiceReport.rpt` exists. No fake file was created. |
| PDF size/signature/opening | NOT RUN | Requires creating the genuine binary `.rpt` with SAP Crystal Reports designer using the included XSD. |
| Full POST/PUT/DELETE error matrix | NOT RUN | Initial backend push focuses on working foundation and live read/report-data smoke tests. |

## Remaining manual Crystal designer gate

Follow the exact steps in `README.md` to create `Reports/InvoiceReport.rpt`. Then rebuild and repeat the PDF request. A PDF test may be marked passed only after HTTP 200, `application/pdf`, nonzero length, and the first five bytes `%PDF-` are all verified.
