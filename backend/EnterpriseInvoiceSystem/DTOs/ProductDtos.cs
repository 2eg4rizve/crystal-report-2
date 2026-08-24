using System;
using System.ComponentModel.DataAnnotations;

namespace EnterpriseInvoiceSystem.DTOs
{
    public class CreateProductRequest
    {
        [Required(ErrorMessage = "Name is required."), StringLength(100)]
        public string Name { get; set; }

        [Range(
            typeof(decimal),
            "0.01",
            "9999999999999999",
            ErrorMessage = "Unit price must be greater than zero."
        )]
        public decimal UnitPrice { get; set; }
    }

    public class UpdateProductRequest : CreateProductRequest { }

    public class ProductResponse
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public decimal UnitPrice { get; set; }
        public DateTime CreatedAtUtc { get; set; }
    }
}
