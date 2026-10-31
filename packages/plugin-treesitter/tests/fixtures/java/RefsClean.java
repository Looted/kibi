package app;

import java.util.List;
import java.util.concurrent.*;

class Server {
  void start() {
    String port = System.getenv("PORT");
    if (port == null) {
      throw new IllegalStateException("PORT is not set");
    }
    try {
      List.of(port).forEach(System.out::println);
      log("started");
    } catch (RuntimeException error) {
      throw error;
    }
  }

  void log(String message) {
    System.out.println(message);
  }
}
