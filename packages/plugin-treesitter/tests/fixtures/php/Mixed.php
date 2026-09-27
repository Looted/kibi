<?php
namespace Catalog;
?>
<div>HTML between PHP sections</div>
<?php
class Product
{
    public function id(int $value): int { return $value; }
    public function __call(string $name, array $arguments) { return null; }
}
function helper(): void {}
?>
<footer>HTML after declarations</footer>
