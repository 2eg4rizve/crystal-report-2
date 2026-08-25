using System;
using System.Collections.Generic;
using System.Linq;
using EnterpriseInvoiceSystem.DTOs;

namespace EnterpriseInvoiceSystem.Reports
{
    /// <summary>
    /// One object represents one product row shown in InvoiceReport.rpt.
    /// The property names match the database fields already saved inside the report.
    /// </summary>
    public class InvoiceReportModel
    {
        public int InvoiceId { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public string CustomerName { get; set; }
        public string CustomerPhone { get; set; }
        public string CustomerAddress { get; set; }
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal LineTotal { get; set; }
        public decimal Subtotal { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TotalAmount { get; set; }

        /// <summary>
        /// Converts one invoice with many items into a simple list for Crystal Reports.
        /// </summary>
        public static List<InvoiceReportModel> FromInvoice(InvoiceReportDto invoice)
        {
            if (invoice == null)
                throw new ArgumentNullException(nameof(invoice));

            var invoiceItems = invoice.Items ?? new List<InvoiceReportItemDto>();

            return invoiceItems
                .Select(invoiceItem => new InvoiceReportModel
                {
                    InvoiceId = invoice.InvoiceId,
                    InvoiceNumber = invoice.InvoiceNumber,
                    InvoiceDate = invoice.InvoiceDate,
                    CustomerName = invoice.CustomerName,
                    CustomerPhone = invoice.CustomerPhone,
                    CustomerAddress = invoice.CustomerAddress ?? "",
                    ProductId = invoiceItem.ProductId,
                    ProductName = invoiceItem.ProductName,
                    Quantity = invoiceItem.Quantity,
                    UnitPrice = invoiceItem.UnitPrice,
                    LineTotal = invoiceItem.LineTotal,
                    Subtotal = invoice.Subtotal,
                    DiscountAmount = invoice.DiscountAmount,
                    TotalAmount = invoice.TotalAmount,
                })
                .ToList();
        }
    }
}
