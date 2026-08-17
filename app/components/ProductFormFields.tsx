const CATEGORIES = [
  { value: "dresses", label: "Dresses" },
  { value: "jumpsuits", label: "Jumpsuits" },
  { value: "sets", label: "Matching Sets" },
  { value: "tops", label: "Tops" },
  { value: "bottoms", label: "Bottoms" },
];

const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export interface ProductFormDefaults {
  name?: string;
  slug?: string;
  description?: string;
  price?: string; // dollars, as a string for the input
  category?: string;
  sizes?: string[];
  colours?: string[];
  featured?: boolean;
  newArrival?: boolean;
  availability?: string;
  hidden?: boolean;
}

export function ProductFormFields({ defaults = {} }: { defaults?: ProductFormDefaults }) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1.5" htmlFor="name">Product Name *</label>
          <input
            id="name"
            name="name"
            required
            defaultValue={defaults.name}
            className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5" htmlFor="price">Price ({"TT$"}) *</label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaults.price}
            className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1.5" htmlFor="category">Category *</label>
          <select
            id="category"
            name="category"
            required
            defaultValue={defaults.category}
            className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest bg-surface"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1.5" htmlFor="availability">Availability *</label>
          <select
            id="availability"
            name="availability"
            required
            defaultValue={defaults.availability ?? "available"}
            className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest bg-surface"
          >
            <option value="available">Available to Order</option>
            <option value="temporarily_unavailable">Temporarily Unavailable</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1.5" htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaults.description}
          className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
        />
      </div>

      <div>
        <p className="block text-sm mb-2">Available Sizes *</p>
        <div className="flex flex-wrap gap-3">
          {ALL_SIZES.map((size) => (
            <label key={size} className="flex items-center gap-1.5 text-sm border border-line px-3 py-1.5 cursor-pointer has-[:checked]:border-forest has-[:checked]:bg-forest has-[:checked]:text-ivory">
              <input
                type="checkbox"
                name="sizes"
                value={size}
                defaultChecked={defaults.sizes?.includes(size)}
                className="sr-only"
              />
              {size}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1.5" htmlFor="colours">Colours (optional)</label>
        <input
          id="colours"
          name="colours"
          defaultValue={defaults.colours?.join(", ")}
          placeholder="e.g. Red, Green, Royal Blue"
          className="w-full border border-line px-3 py-2.5 text-sm focus:border-forest"
        />
        <p className="text-xs text-taupe mt-1.5">
          Comma-separated. Leave blank if this item doesn't come in different colours.
          After saving, set stock per size/colour in the "Stock & Pre-Order" section below.
        </p>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" name="featured" defaultChecked={defaults.featured} />
          Featured Product
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" name="newArrival" defaultChecked={defaults.newArrival} />
          New Arrival
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" name="hidden" defaultChecked={defaults.hidden} />
          Hide from store
        </label>
      </div>
    </div>
  );
}
