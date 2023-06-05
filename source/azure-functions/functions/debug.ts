import { app } from "@azure/functions";

// app.http("imagehandler", {
//   methods: ["GET"],
//   route: "{code}/{filename}.{extension}",
//   handler: imageHandler,
// });

app.http("debug", {
  methods: ["GET"],
  route: "debug/env",
  handler: () => ({ body: JSON.stringify(process.env) }),
});
