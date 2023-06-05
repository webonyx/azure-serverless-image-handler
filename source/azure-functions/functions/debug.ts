import { app } from "@azure/functions";

app.http("debug", {
  methods: ["GET"],
  route: "debug/env",
  handler: () => {
    const env = process.env;

    for (const name in env) {
      if (name.includes("KEY") || name.endsWith("CONNECTION_STRING") || env[name].includes("Key=")) {
        env[name] = "[REDACTED]";
      }
    }

    return { body: JSON.stringify(env) };
  },
});
