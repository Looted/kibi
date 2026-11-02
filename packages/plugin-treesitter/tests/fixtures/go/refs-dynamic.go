package server

import (
	"os"
	"reflect"
)

func Lookup(name string) string {
	return os.Getenv(name)
}

func Call(target any) {
	reflect.ValueOf(target).MethodByName("Run").Call(nil)
}
