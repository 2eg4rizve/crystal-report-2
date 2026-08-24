using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using EnterpriseInvoiceSystem.Data;
using EnterpriseInvoiceSystem.DTOs;
using EnterpriseInvoiceSystem.Models;

namespace EnterpriseInvoiceSystem.Services
{
    public class ProductService
    {
        public async Task<List<ProductResponse>> GetAllAsync()
        {
            using (var db = new EnterpriseDbContext())
                return await db
                    .Products.OrderBy(x => x.Id)
                    .Select(x => new ProductResponse
                    {
                        Id = x.Id,
                        Name = x.Name,
                        UnitPrice = x.UnitPrice,
                        CreatedAtUtc = x.CreatedAtUtc,
                    })
                    .ToListAsync();
        }

        public async Task<ProductResponse> GetAsync(int id)
        {
            using (var db = new EnterpriseDbContext())
            {
                var x = await db.Products.FindAsync(id);
                return Map(x);
            }
        }

        public async Task<ProductResponse> CreateAsync(CreateProductRequest r)
        {
            using (var db = new EnterpriseDbContext())
            {
                var x = new Product
                {
                    Name = r.Name.Trim(),
                    UnitPrice = r.UnitPrice,
                    CreatedAtUtc = DateTime.UtcNow,
                };
                db.Products.Add(x);
                await db.SaveChangesAsync();
                return Map(x);
            }
        }

        public async Task<bool> UpdateAsync(int id, UpdateProductRequest r)
        {
            using (var db = new EnterpriseDbContext())
            {
                var x = await db.Products.FindAsync(id);
                if (x == null)
                    return false;
                x.Name = r.Name.Trim();
                x.UnitPrice = r.UnitPrice;
                await db.SaveChangesAsync();
                return true;
            }
        }

        public async Task<int> DeleteAsync(int id)
        {
            using (var db = new EnterpriseDbContext())
            {
                var x = await db.Products.FindAsync(id);
                if (x == null)
                    return 0;
                if (await db.InvoiceItems.AnyAsync(i => i.ProductId == id))
                    return -1;
                db.Products.Remove(x);
                await db.SaveChangesAsync();
                return 1;
            }
        }

        static ProductResponse Map(Product x)
        {
            return x == null
                ? null
                : new ProductResponse
                {
                    Id = x.Id,
                    Name = x.Name,
                    UnitPrice = x.UnitPrice,
                    CreatedAtUtc = x.CreatedAtUtc,
                };
        }
    }
}
