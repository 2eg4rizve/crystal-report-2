using System.Data.Entity.Migrations;
namespace EnterpriseInvoiceSystem.Data.Migrations { public sealed class Configuration:DbMigrationsConfiguration<EnterpriseDbContext> { public Configuration(){AutomaticMigrationsEnabled=false;MigrationsDirectory="Data\\Migrations";} protected override void Seed(EnterpriseDbContext context){SeedData.Seed(context);} } }
