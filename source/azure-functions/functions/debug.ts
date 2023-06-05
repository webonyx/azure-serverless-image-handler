import { app } from "@azure/functions";

// app.http("imagehandler", {
//   methods: ["GET"],
//   route: "{code}/{filename}.{extension}",
//   handler: imageHandler,
// });

app.http("debug", {
  methods: ["GET"],
  route: "debug/env",
  handler: () => {
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      AWS_ACCESS_KEY_ID,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      AWS_SECRET_ACCESS_KEY,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      APPSETTING_AWS_ACCESS_KEY_ID,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      APPSETTING_AWS_SECRET_ACCESS_KEY,
      ...env
    } = process.env;

    return { body: JSON.stringify(env) };
  },
});
