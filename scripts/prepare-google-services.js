const fs = require("node:fs");
const path = require("node:path");

if (process.env.EAS_BUILD_PLATFORM === "android") {
  const projectRoot = path.resolve(__dirname, "..");
  const sourcePath = process.env.GOOGLE_SERVICES_JSON
    ? path.resolve(process.env.GOOGLE_SERVICES_JSON)
    : path.join(projectRoot, "google-services.json");
  const destinationPath = path.join(projectRoot, "android", "app", "google-services.json");

  if (!fs.existsSync(sourcePath)) {
    throw new Error("GOOGLE_SERVICES_JSON is required for Android EAS builds.");
  }

  const config = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const clients = Array.isArray(config.client) ? config.client : [];
  const hasShrimplyAndroidApp = clients.some(
    (client) => client?.client_info?.android_client_info?.package_name === "com.shrimply.tech.investashrimp",
  );
  if (config?.project_info?.project_id !== "investashrimp-5d9e5" || !hasShrimplyAndroidApp) {
    throw new Error("GOOGLE_SERVICES_JSON does not belong to the Shrimply Android Firebase app.");
  }

  fs.copyFileSync(sourcePath, destinationPath);
  console.log("Prepared the Shrimply Firebase configuration for the Android build.");
}
