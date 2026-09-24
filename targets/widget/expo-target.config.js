/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "widget",
  displayName: "Takvim",
  colors: {
    $accent: "#2D26F0",
    $widgetBackground: "#FFFFFF",
  },
  // Ana uygulamayla ayni App Group'u paylasir; deger app.json'daki
  // ios.entitlements'tan gelir (bkz. lib/widgetData.ts APP_GROUP sabiti ile
  // ayni string olmali).
  entitlements: {
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
