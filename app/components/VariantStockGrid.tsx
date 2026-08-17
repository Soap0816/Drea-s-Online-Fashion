import { Form } from "@remix-run/react";
import type { ProductVariant } from "~/lib/types";

/**
 * Builds every size × colour combination (or just sizes, if the product
 * has no colour options) and lets the owner set a stock status for each.
 * Combos with no saved variant row default to "In Stock" — matching the
 * product's overall availability until the owner narrows it down.
 */
export function VariantStockGrid({
  sizes,
  colours,
  variants,
  isSubmitting,
}: {
  sizes: string[];
  colours: string[];
  variants: ProductVariant[];
  isSubmitting: boolean;
}) {
  const colourList = colours.length > 0 ? colours : [""];

  function statusFor(size: string, colour: string) {
    return variants.find((v) => v.size === size && v.colour === colour)?.stock_status ?? "in_stock";
  }

  if (sizes.length === 0) {
    return <p className="text-sm text-taupe">Add and save at least one size above to manage stock.</p>;
  }

  return (
    <Form method="post">
      <input type="hidden" name="intent" value="update-variants" />
      <div className="overflow-x-auto border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-line/40">
              <th className="text-left px-3 py-2 font-medium">Size</th>
              {colourList.map((colour) => (
                <th key={colour || "_"} className="text-left px-3 py-2 font-medium">
                  {colour || "Stock Status"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sizes.map((size) => (
              <tr key={size}>
                <td className="px-3 py-2 font-medium">{size}</td>
                {colourList.map((colour) => (
                  <td key={colour || "_"} className="px-3 py-2">
                    <select
                      name={`variant__${size}__${colour}`}
                      defaultValue={statusFor(size, colour)}
                      className="border border-line px-2 py-1.5 text-xs bg-surface"
                    >
                      <option value="in_stock">In Stock</option>
                      <option value="preorder">Pre-Order</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="submit" disabled={isSubmitting} className="btn-secondary mt-4 disabled:opacity-60">
        Save Stock Status
      </button>
    </Form>
  );
}
