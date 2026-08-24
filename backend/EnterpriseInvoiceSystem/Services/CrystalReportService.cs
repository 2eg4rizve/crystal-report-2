using System;
using System.Data;
using System.IO;
using System.Web.Hosting;
using CrystalDecisions.CrystalReports.Engine;
using CrystalDecisions.Shared;
using EnterpriseInvoiceSystem.DTOs;

namespace EnterpriseInvoiceSystem.Services
{
    public class CrystalReportService
    {
        public byte[] GenerateInvoicePdf(InvoiceReportDto invoice)
        {
            var path = HostingEnvironment.MapPath("~/Reports/InvoiceReport.rpt");
            if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
                throw new FileNotFoundException("InvoiceReport.rpt was not found.", path);
            var table = CreateInvoiceDataTable(invoice);
            using (var report = new ReportDocument())
            {
                report.Load(path);
                report.SetDataSource(table);
                using (var stream = report.ExportToStream(ExportFormatType.PortableDocFormat))
                using (var output = new MemoryStream())
                {
                    stream.CopyTo(output);
                    return output.ToArray();
                }
            }
        }

        public DataTable CreateInvoiceDataTable(InvoiceReportDto invoice)
        {
            var t = new DataTable("InvoiceRows");
            t.Columns.Add("InvoiceId", typeof(int));
            t.Columns.Add("InvoiceNumber", typeof(string));
            t.Columns.Add("InvoiceDate", typeof(DateTime));
            t.Columns.Add("CustomerName", typeof(string));
            t.Columns.Add("CustomerPhone", typeof(string));
            t.Columns.Add("CustomerAddress", typeof(string));
            t.Columns.Add("ProductId", typeof(int));
            t.Columns.Add("ProductName", typeof(string));
            t.Columns.Add("Quantity", typeof(int));
            t.Columns.Add("UnitPrice", typeof(decimal));
            t.Columns.Add("LineTotal", typeof(decimal));
            t.Columns.Add("Subtotal", typeof(decimal));
            t.Columns.Add("DiscountAmount", typeof(decimal));
            t.Columns.Add("TotalAmount", typeof(decimal));
            foreach (var i in invoice.Items)
                t.Rows.Add(
                    invoice.InvoiceId,
                    invoice.InvoiceNumber,
                    invoice.InvoiceDate,
                    invoice.CustomerName,
                    invoice.CustomerPhone,
                    invoice.CustomerAddress ?? "",
                    i.ProductId,
                    i.ProductName,
                    i.Quantity,
                    i.UnitPrice,
                    i.LineTotal,
                    invoice.Subtotal,
                    invoice.DiscountAmount,
                    invoice.TotalAmount
                );
            return t;
        }
    }
}
