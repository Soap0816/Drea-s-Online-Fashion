import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import type { Env } from "~/lib/env.server";
import { requireAdmin } from "~/lib/auth.server";
import {
  getProductForAdmin,
  updateProduct,
  isSlugTaken,
  addProductImage,
  deleteProductImage,
  moveProductImage,
  setProductVariants,
  type ProductInput,
} from "~/lib/admin-db.server";
import { slugify } from "~/lib/slug";
import { imageUrl } from "~/lib/db.server";
import { ProductFormFields } from "~/components/ProductFormFields";
import { VariantStockGrid } from "~/components/VariantStockGrid";

export const meta: MetaFunction = () => [{ title: "Edit Product — Drea Admin" }];

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);
  const product = await getProductForAdmin(env, Number(params.id));
  if (!product) throw new Response("Product not found", { status: 404 });
  return json({ product });
}

export async function action({ params, request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env as Env;
  await requireAdmin(request, env);
  const productId = Number(params.id);
  const product = await getProductForAdmin(env, productId);
  if (!product) throw new Response("Product not found", { status: 404 });

  const form = await request.formData();
  const intent = String(form.get("intent") || "update-details");

  if (intent === "delete-image") {
    const imageId = Number(form.get("imageId"));
    const key = await deleteProductImage(env, imageId);
    if (key) {
      await env.PRODUCT_IMAGES.delete(key).catch(() => {});
    }
    return redirect(`/admin/products/${productId}`);
  }

  if (intent === "move-image") {
    const imageId = Number(form.get("imageId"));
    const direction = String(form.get("direction")) as "up" | "down";
    await moveProductImage(env, productId, imageId, direction);
    return redirect(`/admin/products/${productId}`);
  }

  if (intent === "upload-images") {
    const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    let sortOrder = product.images.length;
    for (const file of files) {
      if (file.size > MAX_IMAGE_BYTES) continue;
      const ext = file.name.split(".").pop() || "jpg";
      const key = `products/${product.slug}/${Date.now()}-${sortOrder}.${ext}`;
      await env.PRODUCT_IMAGES.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type || "image/jpeg" },
      });
      await addProductImage(env, productId, key, product.name, sortOrder);
      sortOrder += 1;
    }
    return redirect(`/admin/products/${productId}`);
  }

  if (intent === "update-variants") {
    const variants: { size: string; colour: string; stockStatus: "in_stock" | "preorder" | "out_of_stock" }[] = [];
    const colourList = product.colours.length > 0 ? product.colours : [""];
    for (const size of product.sizes) {
      for (const colour of colourList) {
        const value = form.get(`variant__${size}__${colour}`);
        if (value) {
          variants.push({ size, colour, stockStatus: value as "in_stock" | "preorder" | "out_of_stock" });
        }
      }
    }
    await setProductVariants(env, productId, variants);
    return json({ success: true });
  }

  // intent === "update-details"
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

  let slug = product.slug;
  if (name && slugify(name) !== product.slug) {
    const candidate = slugify(name);
    slug = (await isSlugTaken(env, candidate, productId)) ? `${candidate}-${Date.now().toString().slice(-5)}` : candidate;
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400 });
  }

  await updateProduct(env, productId, {
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

  return json({ success: true });
}

export default function AdminEditProduct() {
  const { product } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const errors = (actionData && "errors" in actionData ? actionData.errors : {}) ?? {};

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/products" className="text-sm text-taupe hover:text-forest">&larr; Products</Link>
      </div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl sm:text-3xl">Edit Product</h1>
        <Link to={`/shop/${product.slug}`} target="_blank" className="text-sm text-forest hover:underline">
          View on storefront &rarr;
        </Link>
      </div>

      {actionData && "success" in actionData && (
        <p className="mb-6 text-sm bg-forest/10 text-forest-dark px-4 py-2.5 max-w-2xl">Product updated.</p>
      )}

      {/* Images */}
      <div className="max-w-2xl mb-10">
        <p className="eyebrow mb-3">Product Images</p>
        {product.images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
            {product.images.map((img, i) => (
              <div key={img.id} className="relative border border-line">
                <img src={imageUrl(img.image_key)} alt="" className="aspect-[3/4] w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-charcoal/80 flex items-center justify-between px-1.5 py-1">
                  <Form method="post" className="flex gap-1">
                    <input type="hidden" name="intent" value="move-image" />
                    <input type="hidden" name="imageId" value={img.id} />
                    <button type="submit" name="direction" value="up" disabled={i === 0} className="text-ivory text-xs disabled:opacity-30 px-1">
                      &uarr;
                    </button>
                    <button type="submit" name="direction" value="down" disabled={i === product.images.length - 1} className="text-ivory text-xs disabled:opacity-30 px-1">
                      &darr;
                    </button>
                  </Form>
                  <Form method="post" onSubmit={(e) => { if (!confirm("Delete this image?")) e.preventDefault(); }}>
                    <input type="hidden" name="intent" value="delete-image" />
                    <input type="hidden" name="imageId" value={img.id} />
                    <button type="submit" className="text-ivory text-xs hover:text-error px-1">Delete</button>
                  </Form>
                </div>
              </div>
            ))}
          </div>
        )}

        <Form method="post" encType="multipart/form-data" className="flex flex-col sm:flex-row gap-2">
          <input type="hidden" name="intent" value="upload-images" />
          <input
            type="file"
            name="images"
            accept="image/*"
            multiple
            className="flex-1 border border-line px-3 py-2.5 text-sm bg-surface"
          />
          <button type="submit" className="btn-secondary whitespace-nowrap">Upload Images</button>
        </Form>
      </div>

      {/* Stock & Pre-Order */}
      <div className="max-w-2xl mb-10">
        <p className="eyebrow mb-3">Stock & Pre-Order</p>
        <p className="text-xs text-taupe mb-3">
          Set each size (and colour, if this item has colour options) to In Stock, Pre-Order, or Out of Stock.
          Pre-Order items can still be added to cart and checked out — customers are told it's a pre-order.
        </p>
        <VariantStockGrid sizes={product.sizes} colours={product.colours} variants={product.variants} isSubmitting={isSubmitting} />
      </div>

      {/* Details */}
      <Form method="post">
        <input type="hidden" name="intent" value="update-details" />
        <ProductFormFields
          defaults={{
            name: product.name,
            price: (product.price_cents / 100).toFixed(2),
            category: product.category,
            description: product.description ?? "",
            sizes: product.sizes,
            colours: product.colours,
            featured: product.featured,
            newArrival: product.new_arrival,
            availability: product.availability,
            hidden: product.hidden,
          }}
        />

        {Object.values(errors).length > 0 && (
          <div className="max-w-2xl mt-6 text-sm text-error space-y-1">
            {Object.values(errors).map((err, i) => <p key={i}>{err as string}</p>)}
          </div>
        )}

        <div className="max-w-2xl mt-8">
          <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </Form>
    </div>
  );
}
