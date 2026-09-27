resource "api.edge" "worker.eu" {
  nested "child.route" {}
}
resource "api" "edge.worker.eu" {}
