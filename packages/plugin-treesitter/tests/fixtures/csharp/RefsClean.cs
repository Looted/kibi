using System;
using System.Net.Http;

namespace App
{
    class Server
    {
        void Start()
        {
            var port = Environment.GetEnvironmentVariable("PORT");
            var options = new Options { Mode = "strict" };
            if (port == null)
                throw new InvalidOperationException("PORT is not set");
            try
            {
                Console.WriteLine(port);
            }
            catch (Exception)
            {
                throw;
            }
        }
    }
}
