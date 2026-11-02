package app;

class Plugins {
  Object load(String name) throws Exception {
    String home = System.getenv(name);
    return Class.forName(name).getDeclaredConstructor().newInstance();
  }
}
