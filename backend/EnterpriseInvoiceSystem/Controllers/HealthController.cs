using System;
using System.Net;
using System.Web.Http;
using EnterpriseInvoiceSystem.Data;

namespace EnterpriseInvoiceSystem.Controllers
{
    [RoutePrefix("api/health")]
    public class HealthController : ApiController
    {
        [HttpGet, Route("")]
        public IHttpActionResult Get()
        {
            try
            {
                using (var db = new EnterpriseDbContext())
                {
                    if (!db.Database.Exists())
                        return Content(HttpStatusCode.ServiceUnavailable, new { status = "Database unavailable", application = "Enterprise Invoice System", utcTime = DateTime.UtcNow });
                }
                return Ok(new { status = "Healthy", application = "Enterprise Invoice System", utcTime = DateTime.UtcNow });
            }
            catch (Exception)
            {
                return Content(HttpStatusCode.ServiceUnavailable, new { status = "Database unavailable", application = "Enterprise Invoice System", utcTime = DateTime.UtcNow });
            }
        }
    }
}
