using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace EnterpriseInvoiceSystem.Models
{
    public class Product
    {
        public Product()
        {
            InvoiceItems = new HashSet<InvoiceItem>();
        }

        public int Id { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; }
        public decimal UnitPrice { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public virtual ICollection<InvoiceItem> InvoiceItems { get; set; }
    }
}
