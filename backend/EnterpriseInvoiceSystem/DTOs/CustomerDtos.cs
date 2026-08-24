using System;
using System.ComponentModel.DataAnnotations;

namespace EnterpriseInvoiceSystem.DTOs
{
    public class CreateCustomerRequest
    {
        [Required(ErrorMessage = "Name is required."), StringLength(100)]
        public string Name { get; set; }

        [Required(ErrorMessage = "Phone is required."), StringLength(30)]
        public string Phone { get; set; }

        [StringLength(250)]
        public string Address { get; set; }
    }

    public class UpdateCustomerRequest : CreateCustomerRequest { }

    public class CustomerResponse
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
        public DateTime CreatedAtUtc { get; set; }
    }
}
