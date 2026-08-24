using System.Data.Entity;
using EnterpriseInvoiceSystem.Models;

namespace EnterpriseInvoiceSystem.Data
{
    public class EnterpriseDbContext : DbContext
    {
        public EnterpriseDbContext()
            : base("name=EnterpriseDbConnection")
        {
            Configuration.LazyLoadingEnabled = false;
            Configuration.ProxyCreationEnabled = false;
        }

        public DbSet<Customer> Customers { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Invoice> Invoices { get; set; }
        public DbSet<InvoiceItem> InvoiceItems { get; set; }

        protected override void OnModelCreating(DbModelBuilder b)
        {
            b.Entity<Product>().Property(x => x.UnitPrice).HasPrecision(18, 2);
            b.Entity<Invoice>().Property(x => x.DiscountAmount).HasPrecision(18, 2);
            b.Entity<Invoice>().Property(x => x.TotalAmount).HasPrecision(18, 2);
            b.Entity<InvoiceItem>().Property(x => x.UnitPrice).HasPrecision(18, 2);
            b.Entity<InvoiceItem>().Property(x => x.LineTotal).HasPrecision(18, 2);
            b.Entity<Customer>()
                .HasMany(x => x.Invoices)
                .WithRequired(x => x.Customer)
                .HasForeignKey(x => x.CustomerId)
                .WillCascadeOnDelete(false);
            b.Entity<Invoice>()
                .HasMany(x => x.Items)
                .WithRequired(x => x.Invoice)
                .HasForeignKey(x => x.InvoiceId)
                .WillCascadeOnDelete(true);
            b.Entity<Product>()
                .HasMany(x => x.InvoiceItems)
                .WithRequired(x => x.Product)
                .HasForeignKey(x => x.ProductId)
                .WillCascadeOnDelete(false);
            base.OnModelCreating(b);
        }
    }
}
