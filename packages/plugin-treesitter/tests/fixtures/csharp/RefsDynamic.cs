using System;

namespace App
{
    class Plugins
    {
        void Load()
        {
#if DEBUG
            Console.WriteLine("debug");
#endif
            var type = Type.GetType("App.Plugin");
            Activator.CreateInstance(type);
        }
    }
}
