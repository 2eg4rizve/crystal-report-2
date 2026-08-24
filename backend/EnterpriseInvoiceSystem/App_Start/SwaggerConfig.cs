using System.Web.Http;
using EnterpriseInvoiceSystem;
using Swashbuckle.Application;
using WebActivatorEx;

[assembly: PreApplicationStartMethod(typeof(SwaggerConfig), "Register")]

namespace EnterpriseInvoiceSystem
{
    public class SwaggerConfig
    {
        public static void Register()
        {
            GlobalConfiguration
                .Configuration.EnableSwagger(c =>
                {
                    c.SingleApiVersion("v1", "Enterprise Invoice System");
                    c.DescribeAllEnumsAsStrings();
                })
                .EnableSwaggerUi();
        }
    }
}
