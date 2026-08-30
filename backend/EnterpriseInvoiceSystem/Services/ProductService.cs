using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Data.SqlClient;
using System.Linq;
using System.Threading.Tasks;
using EnterpriseInvoiceSystem.Data;
using EnterpriseInvoiceSystem.DTOs;
using EnterpriseInvoiceSystem.Models;

namespace EnterpriseInvoiceSystem.Services
{
    public class ProductService
    {
        public async Task<List<ProductResponse>> FilterAsync(ProductFilterRequest r)
        {
            using (var db = new EnterpriseDbContext())
            {
                await db.Database.ExecuteSqlCommandAsync(
                    @"CREATE OR ALTER PROCEDURE dbo.usp_Product_Filter
                        @Id int = NULL,
                        @Name nvarchar(100) = NULL,
                        @MinUnitPrice decimal(18,2) = NULL,
                        @MaxUnitPrice decimal(18,2) = NULL
                      AS
                      BEGIN
                        SET NOCOUNT ON;
                        SELECT Id, Name, UnitPrice, CreatedAtUtc
                        FROM dbo.Products
                        WHERE (@Id IS NULL OR Id = @Id)
                          AND (@Name IS NULL OR Name LIKE N'%' + @Name + N'%')
                          AND (@MinUnitPrice IS NULL OR UnitPrice >= @MinUnitPrice)
                          AND (@MaxUnitPrice IS NULL OR UnitPrice <= @MaxUnitPrice)
                        ORDER BY Id;
                      END"
                );
                return await db.Database.SqlQuery<ProductResponse>(
                    "EXEC dbo.usp_Product_Filter @Id, @Name, @MinUnitPrice, @MaxUnitPrice",
                    new SqlParameter("@Id", System.Data.SqlDbType.Int) { Value = (object)r.Id ?? DBNull.Value },
                    new SqlParameter("@Name", System.Data.SqlDbType.NVarChar, 100) { Value = (object)(string.IsNullOrWhiteSpace(r.Name) ? null : r.Name.Trim()) ?? DBNull.Value },
                    new SqlParameter("@MinUnitPrice", System.Data.SqlDbType.Decimal) { Precision = 18, Scale = 2, Value = (object)r.MinUnitPrice ?? DBNull.Value },
                    new SqlParameter("@MaxUnitPrice", System.Data.SqlDbType.Decimal) { Precision = 18, Scale = 2, Value = (object)r.MaxUnitPrice ?? DBNull.Value }
                ).ToListAsync();
            }
        }
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
