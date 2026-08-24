using System;
using System.Collections.Generic;
using System.Linq;
using EnterpriseInvoiceSystem.DTOs;

namespace EnterpriseInvoiceSystem.ReportModels
{
    /// <summary>
    /// Represents one flat InvoiceRows record consumed by InvoiceReport.rpt.
    /// </summary>
    public class InvoiceReportDataModel
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
        /// Flattens a nested invoice DTO into one Crystal Reports record per item.
        /// </summary>
        public static List<InvoiceReportDataModel> FromInvoice(InvoiceReportDto invoice)
        {
            if (invoice == null)
                throw new ArgumentNullException(nameof(invoice));

            var items = invoice.Items ?? new List<InvoiceReportItemDto>();

            return items
                .Select(item => new InvoiceReportDataModel
                {
                    InvoiceId = invoice.InvoiceId,
                    InvoiceNumber = invoice.InvoiceNumber,
                    InvoiceDate = invoice.InvoiceDate,
                    CustomerName = invoice.CustomerName,
                    CustomerPhone = invoice.CustomerPhone,
                    CustomerAddress = invoice.CustomerAddress ?? "",
                    ProductId = item.ProductId,
                    ProductName = item.ProductName,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    LineTotal = item.LineTotal,
                    Subtotal = invoice.Subtotal,
                    DiscountAmount = invoice.DiscountAmount,
                    TotalAmount = invoice.TotalAmount,
                })
                .ToList();
        }
    }
}
