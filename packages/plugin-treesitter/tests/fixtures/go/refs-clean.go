package server

import (
	"fmt"
	"net/http"
	"os"
)

type Options struct {
	Mode string
}

func Start() {
	port := os.Getenv("PORT")
	_, debug := os.LookupEnv("APP_DEBUG")
	opts := Options{Mode: "strict"}
	if port == "" {
		panic(&ConfigError{Field: "PORT"})
	}
	fmt.Printf("listening on %s %v %v\n", port, debug, opts)
	http.ListenAndServe(":"+port, nil)
}
