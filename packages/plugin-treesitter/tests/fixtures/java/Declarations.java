package demo.catalog;

public class Outer {
    public void same(int value) {}
    public void same(String value) {}

    class Inner {
        public void same(int value) {}
    }

    public interface Nested {
        void execute();
    }

    public enum Mode { FAST; }
    public record Point(int x, int y) {}
    public Outer() {}
}

interface Runner {
    void run();
}
