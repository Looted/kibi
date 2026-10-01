package fixture

type Box struct{}
type Reader interface { Read() }
type Count int

func same() {}
func (b *Box) same() {}
