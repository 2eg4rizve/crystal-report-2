using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Web.Hosting;
using CrystalDecisions.CrystalReports.Engine;
using CrystalDecisions.Shared;
using EnterpriseInvoiceSystem.DTOs;
using EnterpriseInvoiceSystem.ReportModels;

namespace EnterpriseInvoiceSystem.Services
{
    // Builds the tabular data expected by Crystal Reports and exports the report as a PDF.
    public class CrystalReportService
    {
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

            // Keep the API DTO nested, then flatten it into the dedicated Crystal binding model.
            var reportRows = InvoiceReportDataModel.FromInvoice(invoice);

            // Crystal Reports consumes a DataTable whose schema matches the fields in the template.
            var invoiceDataTable = CreateInvoiceDataTable(reportRows);

            // ReportDocument owns unmanaged Crystal Reports resources, so dispose it after export.
            using (var reportDocument = new ReportDocument())
            {
                // Load the .rpt layout that defines the invoice's formatting and field placement.
                reportDocument.Load(reportPath);

                // Bind the in-memory invoice rows instead of letting the template query a database.
                reportDocument.SetDataSource(invoiceDataTable);

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

        /// <summary>
        /// Builds the schema and rows used by InvoiceReport.rpt.
        /// </summary>
        /// <param name="reportRows">Flat report-binding records created from an invoice.</param>
        /// <returns>
        /// A table containing one row per invoice item, with header and total values repeated on each row.
        /// </returns>
        public DataTable CreateInvoiceDataTable(IEnumerable<InvoiceReportDataModel> reportRows)
        {
            if (reportRows == null)
                throw new ArgumentNullException(nameof(reportRows));

            // The table name and every column name/type must match the Crystal Report data schema.
            var invoiceRows = new DataTable("InvoiceRows");

            // Invoice-level columns identify the document and when it was issued.
            invoiceRows.Columns.Add("InvoiceId", typeof(int));
            invoiceRows.Columns.Add("InvoiceNumber", typeof(string));
            invoiceRows.Columns.Add("InvoiceDate", typeof(DateTime));

            // Customer-level columns provide the recipient details printed in the invoice header.
            invoiceRows.Columns.Add("CustomerName", typeof(string));
            invoiceRows.Columns.Add("CustomerPhone", typeof(string));
            invoiceRows.Columns.Add("CustomerAddress", typeof(string));

            // Item-level columns describe each product row in the invoice body.
            invoiceRows.Columns.Add("ProductId", typeof(int));
            invoiceRows.Columns.Add("ProductName", typeof(string));
            invoiceRows.Columns.Add("Quantity", typeof(int));
            invoiceRows.Columns.Add("UnitPrice", typeof(decimal));
            invoiceRows.Columns.Add("LineTotal", typeof(decimal));

            // Summary columns provide the amounts displayed in the invoice totals section.
            invoiceRows.Columns.Add("Subtotal", typeof(decimal));
            invoiceRows.Columns.Add("DiscountAmount", typeof(decimal));
            invoiceRows.Columns.Add("TotalAmount", typeof(decimal));

            // Each binding model already represents one flat Crystal Reports detail row.
            foreach (var reportRow in reportRows)
            {
                // Repeat invoice/customer/totals data so every item row is self-contained.
                invoiceRows.Rows.Add(
                    reportRow.InvoiceId,
                    reportRow.InvoiceNumber,
                    reportRow.InvoiceDate,
                    reportRow.CustomerName,
                    reportRow.CustomerPhone,
                    reportRow.CustomerAddress,
                    reportRow.ProductId,
                    reportRow.ProductName,
                    reportRow.Quantity,
                    reportRow.UnitPrice,
                    reportRow.LineTotal,
                    reportRow.Subtotal,
                    reportRow.DiscountAmount,
                    reportRow.TotalAmount
                );
            }

            // Return the fully populated data source for binding to ReportDocument.
            return invoiceRows;
        }
    }
}
