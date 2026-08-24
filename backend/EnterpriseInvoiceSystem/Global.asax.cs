using System.Data.Entity;
using System.Web;
using System.Web.Http;
using EnterpriseInvoiceSystem.App_Start;
using EnterpriseInvoiceSystem.Data;

namespace EnterpriseInvoiceSystem
{
    public class WebApiApplication : HttpApplication
    {
        protected void Application_Start()
        {
            Database.SetInitializer(new EnterpriseDbInitializer());
            GlobalConfiguration.Configure(WebApiConfig.Register);
        }

        protected void Application_BeginRequest()
        {
            if (Request.AppRelativeCurrentExecutionFilePath == "~/")
            {
                Response.Redirect("~/Frontend/index.html", false);
                Context.ApplicationInstance.CompleteRequest();
            }
        }
    }
}
