<?php

namespace App\Services\Parsing;

use App\Models\Agency;
use App\Models\Product;
use App\Models\ProductAlias;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Finds which product an agency means by the name it writes in its messages (« crème verte » → Produit 1).
 */
class ProductMatcher
{
    /** @var Collection<int, Product>|null */
    private ?Collection $products = null;

    /** @var array<string, int>|null */
    private ?array $aliases = null;

    public function __construct(private readonly Agency $agency) {}

    public static function normalize(string $label): string
    {
        return trim((string) preg_replace('/[^a-z0-9]+/', ' ', Str::lower(Str::ascii($label))));
    }

    public function match(string $label, ?int $suggestedProductId = null): ?int
    {
        $normalized = self::normalize($label);
        $aliases = $this->aliases();

        if ($normalized !== '' && isset($aliases[$normalized])) {
            return $aliases[$normalized];
        }

        if ($suggestedProductId !== null && $this->products()->has($suggestedProductId)) {
            return $suggestedProductId;
        }

        if ($normalized === '') {
            return null;
        }

        // From the strictest to the loosest test; a test only counts when it points to a single product.
        $tests = [
            fn (string $name) => $name === $normalized,
            fn (string $name) => Str::contains($name, $normalized) || Str::contains($normalized, $name),
            fn (string $name) => $this->sharesAWord($name, $normalized),
        ];

        foreach ($tests as $test) {
            $candidates = $this->products()->filter(fn (Product $product) => $test(self::normalize($product->name)));

            if ($candidates->count() === 1) {
                return $candidates->first()->id;
            }

            if ($candidates->count() > 1) {
                return null;
            }
        }

        return null;
    }

    /**
     * Remember the name the agency used, so the next message is matched directly.
     */
    public function remember(string $label, int $productId): void
    {
        $normalized = self::normalize($label);

        if ($normalized === '' || ! $this->products()->has($productId)) {
            return;
        }

        $product = $this->products()->get($productId);

        if (self::normalize($product->name) === $normalized) {
            return;
        }

        ProductAlias::updateOrCreate(
            ['agency_id' => $this->agency->id, 'label' => $normalized],
            ['product_id' => $productId],
        );

        $this->aliases = null;
    }

    /**
     * @return Collection<int, Product>
     */
    public function products(): Collection
    {
        return $this->products ??= Product::query()
            ->where('merchant_id', $this->agency->country->merchant_id)
            ->orderBy('name')
            ->get()
            ->keyBy('id');
    }

    /**
     * @return array<string, int>
     */
    public function aliases(): array
    {
        return $this->aliases ??= ProductAlias::query()
            ->where('agency_id', $this->agency->id)
            ->pluck('product_id', 'label')
            ->mapWithKeys(fn (int $productId, string $label) => [self::normalize($label) => $productId])
            ->all();
    }

    private function sharesAWord(string $a, string $b): bool
    {
        $words = fn (string $text) => array_filter(explode(' ', $text), fn (string $word) => strlen($word) >= 4);

        return array_intersect($words($a), $words($b)) !== [];
    }
}
