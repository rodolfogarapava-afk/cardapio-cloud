import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { mockRestaurants } from "../../../data/restaurants";

export default defineTool({
  name: "list_restaurants",
  title: "List restaurants",
  description: "List restaurants available on Use Livre, optionally filtered by category.",
  inputSchema: {
    category: z.string().optional().describe("Optional category filter, case-insensitive substring match."),
    openOnly: z.boolean().optional().describe("If true, return only restaurants currently open."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ category, openOnly }) => {
    let items = mockRestaurants;
    if (category) {
      const q = category.toLowerCase();
      items = items.filter((r) => r.category.toLowerCase().includes(q));
    }
    if (openOnly) items = items.filter((r) => r.isOpen);
    const rows = items.map((r) => ({
      slug: r.slug,
      name: r.name,
      category: r.category,
      rating: r.rating,
      deliveryTime: r.deliveryTime,
      deliveryFee: r.deliveryFee,
      isOpen: r.isOpen,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { restaurants: rows },
    };
  },
});
