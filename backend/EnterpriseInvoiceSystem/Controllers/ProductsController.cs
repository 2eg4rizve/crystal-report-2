using System.Threading.Tasks;
using System.Web.Http;
using EnterpriseInvoiceSystem.DTOs;
using EnterpriseInvoiceSystem.Services;

namespace EnterpriseInvoiceSystem.Controllers
{
    [RoutePrefix("api/products")]
    public class ProductsController : ApiController
    {
        readonly ProductService service = new ProductService();

        [HttpGet, Route("filter")]
        public async Task<IHttpActionResult> Filter([FromUri] ProductFilterRequest request)
        {
            request = request ?? new ProductFilterRequest();
            if (request.Id.HasValue && request.Id.Value <= 0)
                return BadRequest("Id must be greater than zero.");
            if (request.MinUnitPrice < 0 || request.MaxUnitPrice < 0)
                return BadRequest("Unit price filters cannot be negative.");
            if (request.MinUnitPrice > request.MaxUnitPrice)
                return BadRequest("MinUnitPrice cannot be greater than MaxUnitPrice.");
            return Ok(await service.FilterAsync(request));
        }

        [HttpGet, Route("")]
        public async Task<IHttpActionResult> All()
        {
            return Ok(await service.GetAllAsync());
        }

        [HttpGet, Route("{id:int}", Name = "GetProductById")]
        public async Task<IHttpActionResult> Get(int id)
        {
            var x = await service.GetAsync(id);
            return x == null ? (IHttpActionResult)NotFound() : Ok(x);
        }

        [HttpPost, Route("")]
        public async Task<IHttpActionResult> Post(CreateProductRequest r)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            var x = await service.CreateAsync(r);
            return CreatedAtRoute("GetProductById", new { id = x.Id }, x);
        }

        [HttpPut, Route("{id:int}")]
        public async Task<IHttpActionResult> Put(int id, UpdateProductRequest r)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            return await service.UpdateAsync(id, r)
                ? StatusCode(System.Net.HttpStatusCode.NoContent)
                : (IHttpActionResult)NotFound();
        }

        [HttpDelete, Route("{id:int}")]
        public async Task<IHttpActionResult> Delete(int id)
        {
            var r = await service.DeleteAsync(id);
            return r == 0 ? (IHttpActionResult)NotFound()
                : r < 0
                    ? Content(
                        System.Net.HttpStatusCode.Conflict,
                        new
                        {
                            message = "Product cannot be deleted because invoice history references it.",
                        }
                    )
                : StatusCode(System.Net.HttpStatusCode.NoContent);
        }
    }
}
