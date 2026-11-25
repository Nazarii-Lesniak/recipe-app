import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "@/shared/api/uploadthing";

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
