using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace EnterpriseInvoiceSystem.DTOs
{
    public class CreateInvoiceItemRequest
    {
        [Range(1, int.MaxValue, ErrorMessage = "ProductId must be positive.")]
        public int ProductId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Quantity must be greater than zero.")]
        public int Quantity { get; set; }
    }

    public class CreateInvoiceRequest
    {
        [Required(ErrorMessage = "Invoice number is required."), StringLength(50)]
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }

        [Range(1, int.MaxValue)]
        public int CustomerId { get; set; }

        [Range(
            typeof(decimal),
            "0",
            "9999999999999999",
            ErrorMessage = "Discount cannot be negative."
        )]
        public decimal DiscountAmount { get; set; }

        [Required(ErrorMessage = "At least one invoice item is required.")]
        public List<CreateInvoiceItemRequest> Items { get; set; }
    }

    public class InvoiceSummaryResponse
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal TotalAmount { get; set; }
    }

    public class InvoiceItemResponse
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal LineTotal { get; set; }
    }

    public class InvoiceResponse : InvoiceSummaryResponse
    {
        public decimal Subtotal { get; set; }
        public List<InvoiceItemResponse> Items { get; set; }
    }
}
