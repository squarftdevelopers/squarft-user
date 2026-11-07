
require("dotenv").config();

const androidGoogleMapsApiKey =
  process.env.GOOGLE_MAPS_ANDROID_API_KEY || "";

const iosGoogleMapsApiKey =
  process.env.GOOGLE_MAPS_IOS_API_KEY || "";

module.exports = ({ config }) => ({
  ...config,

  extra: {
    ...config.extra,
    GOOGLE_MAPS_ANDROID_API_KEY: androidGoogleMapsApiKey,
    GOOGLE_MAPS_IOS_API_KEY: iosGoogleMapsApiKey,
  },

  android: {
    ...config.android,

    config: {
      ...config.android?.config,

      googleMaps: {
        ...config.android?.config?.googleMaps,
        apiKey: androidGoogleMapsApiKey,
      },
    },
  },

  ios: {
    ...config.ios,

    config: {
      ...config.ios?.config,
      googleMapsApiKey: iosGoogleMapsApiKey,
    },
  },
});
