namespace Demo.Tools
{
    public class Engine
    {
        public void Run(int value) {}
        public void Run(string value) {}
        public Engine() {}
        public int Count { get; set; }

        public class Nested
        {
            public void Run() {}
        }
    }

    public interface IWorker
    {
        void Run();
    }

    public struct Coordinate
    {
        public int X { get; set; }
    }

    public record Envelope(string Name);
}
