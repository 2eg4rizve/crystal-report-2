CREATE OR ALTER PROCEDURE dbo.usp_Product_Filter
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
END;
