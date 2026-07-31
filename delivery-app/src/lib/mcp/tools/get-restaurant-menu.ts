import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getRestaurantBySlug, getCategoriesBySlug, getProductsBySlug } from "../../../data/restaurants";

export default defineTool({
  name: "get_restaurant_menu",
  title: "Get restaurant menu",
  description: "Return the menu (categories and products) for a restaurant by slug.",
  inputSchema: {
    slug: z.string().min(1).describe("Restaurant slug, e.g. 'acai-tropical'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ slug }) => {
    const restaurant = getRestaurantBySlug(slug);
    if (!restaurant) {
      return { content: [{ type: "text", text: `Restaurant not found: ${slug}` }], isError: true };
    }
    const categories = getCategoriesBySlug(slug).map((c) => ({ id: c.id, name: c.name, order: c.order }));
    const products = getProductsBySlug(slug).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      categoryId: p.categoryId,
      available: p.available,
    }));
    const payload = { restaurant: { slug: restaurant.slug, name: restaurant.name }, categories, products };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
