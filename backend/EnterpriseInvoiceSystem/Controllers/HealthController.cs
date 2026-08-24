using System; using System.Web.Http;
namespace EnterpriseInvoiceSystem.Controllers { [RoutePrefix("api/health")] public class HealthController:ApiController { [HttpGet,Route("")] public IHttpActionResult Get(){return Ok(new{status="Healthy",application="Enterprise Invoice System",utcTime=DateTime.UtcNow});} } }
