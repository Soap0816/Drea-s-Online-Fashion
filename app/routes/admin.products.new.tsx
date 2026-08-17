import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { requireAdmin } from "~/lib/auth.server";
import { createProduct, addProductImage, isSlugTaken, type ProductInput } from "~/lib/admin-db.server";
import { slugify } from "~/lib/slug";
import { ProductFormFields } from "~/components/ProductFormFields";

export const meta: MetaFunction = () => [{ title: "Add Product — Drea Admin" }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);
  return null;
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB per image

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);

  const form = await request.formData();
  const name = String(form.get("name") || "").trim();
  const priceDollars = Number(form.get("price"));
  const category = String(form.get("category") || "");
  const description = String(form.get("description") || "").trim();
  const sizes = form.getAll("sizes").map(String);
  const colours = String(form.get("colours") || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const availability = String(form.get("availability") || "available") as ProductInput["availability"];
  const featured = form.get("featured") === "on";
  const newArrival = form.get("newArrival") === "on";
  const hidden = form.get("hidden") === "on";

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Product name is required.";
  if (!category) errors.category = "Please select a category.";
  if (!priceDollars || priceDollars <= 0) errors.price = "Please enter a valid price.";
  if (sizes.length === 0) errors.sizes = "Select at least one size.";

  let slug = slugify(name);
  if (name && (await isSlugTaken(env, slug))) {
    slug = `${slug}-${Date.now().toString().slice(-5)}`;
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400 });
  }

  const productId = await createProduct(env, {
    name,
    slug,
    description,
    priceCents: Math.round(priceDollars * 100),
    category,
    sizes,
    colours,
    featured,
    newArrival,
    availability,
    hidden,
  });

  // Upload any images attached on creation.
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  let sortOrder = 0;
  for (const file of files) {
    if (file.size > MAX_IMAGE_BYTES) continue; // skip oversized files rather than failing the whole submission
    const ext = file.name.split(".").pop() || "jpg";
    const key = `products/${slug}/${Date.now()}-${sortOrder}.${ext}`;
    await env.PRODUCT_IMAGES.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "image/jpeg" },
    });
    await addProductImage(env, productId, key, name, sortOrder);
    sortOrder += 1;
  }

  return redirect(`/admin/products/${productId}`);
}

export default function AdminNewProduct() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const errors = actionData?.errors ?? {};

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/products" className="text-sm text-taupe hover:text-forest">&larr; Products</Link>
      </div>
      <h1 className="text-2xl sm:text-3xl mb-6">Add Product</h1>

      <Form method="post" encType="multipart/form-data">
        <ProductFormFields />

        <div className="max-w-2xl mt-6">
          <label className="block text-sm mb-1.5" htmlFor="images">Product Images</label>
          <input
            id="images"
            name="images"
            type="file"
            accept="image/*"
            multiple
            className="w-full border border-line px-3 py-2.5 text-sm bg-surface"
          />
          <p className="text-xs text-taupe mt-1.5">
            Recommended: square or 3:4 portrait photos, at least 1000px on the shorter side. You can add or reorder more after saving.
          </p>
        </div>

        {Object.values(errors).length > 0 && (
          <div className="max-w-2xl mt-6 text-sm text-error space-y-1">
            {Object.values(errors).map((err, i) => <p key={i}>{err}</p>)}
          </div>
        )}

        <div className="max-w-2xl mt-8 flex gap-3">
          <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">
            {isSubmitting ? "Saving..." : "Publish Product"}
          </button>
          <Link to="/admin/products" className="btn-secondary">Cancel</Link>
        </div>
      </Form>
    </div>
  );
}
