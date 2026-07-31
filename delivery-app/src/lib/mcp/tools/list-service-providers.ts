import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { mockProviders } from "../../../data/serviceProviders";

export default defineTool({
  name: "list_service_providers",
  title: "List service providers",
  description: "List service providers (prestadores) on Use Livre, optionally filtered by category slug.",
  inputSchema: {
    categorySlug: z.string().optional().describe("Optional category slug filter."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ categorySlug }) => {
    let items = mockProviders;
    if (categorySlug) {
      items = items.filter((p) => p.categories.includes(categorySlug));
    }
    const rows = items.map((p) => ({
      slug: p.slug,
      name: p.name,
      type: p.type,
      categories: p.categories,
      rating: p.rating,
      reviewCount: p.reviewCount,
      city: p.serviceArea?.city,
      verified: p.verified ?? false,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { providers: rows },
    };
  },
});
