import { defineMcp } from "@lovable.dev/mcp-js";
import listRestaurantsTool from "./tools/list-restaurants";
import getRestaurantMenuTool from "./tools/get-restaurant-menu";
import listServiceProvidersTool from "./tools/list-service-providers";

export default defineMcp({
  name: "use-livre-mcp",
  title: "Use Livre MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Use Livre marketplace. Use `list_restaurants` to discover food vendors, `get_restaurant_menu` to fetch a vendor's menu by slug, and `list_service_providers` to browse service providers (prestadores).",
  tools: [listRestaurantsTool, getRestaurantMenuTool, listServiceProvidersTool],
});
