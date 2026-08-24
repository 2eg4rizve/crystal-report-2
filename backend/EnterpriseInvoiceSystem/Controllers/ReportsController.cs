using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Web.Http;
using EnterpriseInvoiceSystem.Services;

namespace EnterpriseInvoiceSystem.Controllers
{
    [RoutePrefix("api/reports/invoices")]
    public class ReportsController : ApiController
    {
        readonly InvoiceService invoices = new InvoiceService();
        readonly CrystalReportService reports = new CrystalReportService();

        [HttpGet, Route("{id:int}/data")]
        public async Task<IHttpActionResult> Data(int id)
        {
            var x = await invoices.GetReportAsync(id);
            return x == null ? (IHttpActionResult)NotFound() : Ok(x);
        }

        [HttpGet, Route("{id:int}/pdf")]
        public async Task<IHttpActionResult> Pdf(int id)
        {
            var x = await invoices.GetReportAsync(id);
            if (x == null)
                return NotFound();
            try
            {
                var bytes = reports.GenerateInvoicePdf(x);
                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new ByteArrayContent(bytes),
                };
                response.Content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
                response.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue(
                    "attachment"
                )
                {
                    FileName = "Invoice_" + Safe(x.InvoiceNumber) + ".pdf",
                };
                return ResponseMessage(response);
            }
            catch (FileNotFoundException ex)
            {
                return Content(
                    HttpStatusCode.InternalServerError,
                    new { message = "Invoice PDF generation failed.", detail = ex.Message }
                );
            }
            catch (Exception)
            {
                return Content(
                    HttpStatusCode.InternalServerError,
                    new
                    {
                        message = "Invoice PDF generation failed.",
                        detail = "Crystal Reports could not load, bind, or export the report.",
                    }
                );
            }
        }

        static string Safe(string value)
        {
            var invalid = Path.GetInvalidFileNameChars();
            return new string(value.Select(c => invalid.Contains(c) ? '_' : c).ToArray());
        }
    }
}
