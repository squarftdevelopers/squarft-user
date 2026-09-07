require("dotenv").config();

const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  "";

module.exports = ({ config }) => ({
  ...config,

  extra: {
    ...config.extra,
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: googleMapsApiKey,
  },

  android: {
    ...config.android,

    config: {
      ...config.android?.config,

      googleMaps: {
        ...config.android?.config?.googleMaps,
        apiKey: googleMapsApiKey,
      },
    },
  },
});
