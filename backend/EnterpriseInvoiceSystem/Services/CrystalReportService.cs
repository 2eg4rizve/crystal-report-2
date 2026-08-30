using System;
using System.IO;
using System.Web.Hosting;
using CrystalDecisions.CrystalReports.Engine;
using CrystalDecisions.Shared;
using EnterpriseInvoiceSystem.DTOs;
using EnterpriseInvoiceSystem.Reports;
using System.Collections.Generic;
using System.Linq;

namespace EnterpriseInvoiceSystem.Services
{
    // Binds beginner-friendly C# report rows and exports the Crystal Report as a PDF.
    public class CrystalReportService
    {
        public byte[] GenerateProductPdf(IList<ProductResponse> products)
        {
            var path = HostingEnvironment.MapPath("~/Reports/ProductReport.rpt");
            if (string.IsNullOrWhiteSpace(path) || !File.Exists(path)) throw new FileNotFoundException("ProductReport.rpt was not found.", path);
            using (var report = new ReportDocument())
            {
                var rows = products.Select(x => new InvoiceReportModel
                {
                    ProductId = x.Id,
                    ProductName = x.Name,
                    UnitPrice = x.UnitPrice,
                    Quantity = 1,
                    LineTotal = x.UnitPrice,
                    InvoiceNumber = "Product catalogue",
                    InvoiceDate = x.CreatedAtUtc,
                    Subtotal = products.Sum(p => p.UnitPrice),
                    TotalAmount = products.Sum(p => p.UnitPrice)
                }).ToList();
                report.Load(path); report.SetDataSource(rows);
                using (var stream = report.ExportToStream(ExportFormatType.PortableDocFormat))
                using (var buffer = new MemoryStream()) { stream.CopyTo(buffer); return buffer.ToArray(); }
            }
        }
        /// <summary>
        /// Loads the invoice report template, binds one invoice to it, and exports a PDF.
        /// </summary>
        /// <param name="invoice">
        /// The invoice header, customer details, totals, and line items displayed in the report.
        /// </param>
        /// <returns>The complete PDF document as a byte array suitable for an HTTP response.</returns>
        /// <exception cref="FileNotFoundException">
        /// Thrown when the deployed Crystal Report template cannot be located.
        /// </exception>
        public byte[] GenerateInvoicePdf(InvoiceReportDto invoice)
        {
            // Convert the application-relative report location into a physical server path.
            var reportPath = HostingEnvironment.MapPath("~/Reports/InvoiceReport.rpt");

            // Fail with a specific error when the app is not hosted or the template was not deployed.
            if (string.IsNullOrWhiteSpace(reportPath) || !File.Exists(reportPath))
                throw new FileNotFoundException("InvoiceReport.rpt was not found.", reportPath);

            // Convert the nested invoice into one simple report model per product row.
            var reportRows = InvoiceReportModel.FromInvoice(invoice);

            // ReportDocument owns unmanaged Crystal Reports resources, so dispose it after export.
            using (var reportDocument = new ReportDocument())
            {
                // Load the .rpt layout that defines the invoice's formatting and field placement.
                reportDocument.Load(reportPath);

                // Bind the C# model list directly; no XSD or DataTable is required at runtime.
                reportDocument.SetDataSource(reportRows);

                // ExportToStream creates the PDF stream; MemoryStream collects it as returnable bytes.
                using (
                    var pdfExportStream = reportDocument.ExportToStream(
                        ExportFormatType.PortableDocFormat
                    )
                )
                using (var pdfBuffer = new MemoryStream())
                {
                    // Copy before disposal because the Crystal Reports stream is only valid in this scope.
                    pdfExportStream.CopyTo(pdfBuffer);

                    // Materialize an independent byte array for the API response.
                    return pdfBuffer.ToArray();
                }
            }
        }
    }
}
