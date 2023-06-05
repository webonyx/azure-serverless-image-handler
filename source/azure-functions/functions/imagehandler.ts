import { app } from "@azure/functions";
import { imageHandler } from "../handlers";

app.http("imagehandler", {
  methods: ["GET"],
  route: "{code}/{filename}.{extension}",
  handler: imageHandler,
});
