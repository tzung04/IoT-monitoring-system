import { initializeFaro, getWebInstrumentations, faro } from "@grafana/faro-web-sdk";
import { ReactIntegration } from "@grafana/faro-react";
import pkg from "../../package.json";

const FARO_URL = process.env.REACT_APP_FARO_URL || process.env.REACT_APP_FARO_ENDPOINT;
const ENVIRONMENT = process.env.REACT_APP_ENVIRONMENT || process.env.REACT_APP_ENV || process.env.NODE_ENV || "development";
const RELEASE = process.env.REACT_APP_VERSION || pkg.version;
const APP_NAME = process.env.REACT_APP_NAME || pkg.name || "iot-monitoring-frontend";
const SAMPLE_RATE = Math.min(
  1,
  Math.max(0, Number(process.env.REACT_APP_FARO_SAMPLE_RATE || "1"))
);

const scrubUrl = (url) => {
  if (!url || typeof url !== "string") return url;
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch (err) {
    const withoutQuery = url.split("?")[0];
    return withoutQuery;
  }
};

const maybeSample = (item) => {
  if (SAMPLE_RATE >= 1) return true;
  // Always keep errors/exceptions
  if (item?.type === "exception" || item?.type === "error") return true;
  return Math.random() <= SAMPLE_RATE;
};

const beforeSend = (item) => {
  if (!maybeSample(item)) return null;

  const cleanContextUrl = (obj) => {
    if (!obj) return;
    if (obj.url) obj.url = scrubUrl(obj.url);
    if (obj.referrer) obj.referrer = scrubUrl(obj.referrer);
    if (obj.page) cleanContextUrl(obj.page);
  };

  cleanContextUrl(item?.context);
  cleanContextUrl(item?.meta);
  cleanContextUrl(item?.body?.context);

  return item;
};

export const initFaro = () => {
  if (!FARO_URL) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.info("Faro is disabled because REACT_APP_FARO_URL is not set.");
    }
    return null;
  }

  // Prevent double init in strict mode dev
  if (faro?.api?.getSession?.()) {
    return faro;
  }

  return initializeFaro({
    url: FARO_URL,
    app: {
      name: APP_NAME,
      version: RELEASE,
      environment: ENVIRONMENT,
    },
    instrumentations: [
      ...getWebInstrumentations(),
      new ReactIntegration(),
    ],
    beforeSend,
    globalObjectKey: "faro",
  });
};

export const getFaro = () => faro;

export const trackEvent = (name, properties = {}) => {
  if (!name) return;
  const instance = getFaro();
  if (instance?.api?.pushEvent) {
    instance.api.pushEvent(name, properties);
  }
};

export const reportError = (error, context = {}) => {
  const instance = getFaro();
  if (instance?.api?.pushError) {
    instance.api.pushError(error, context);
  }
};

export const trackLog = (message, attributes = {}) => {
  const instance = getFaro();
  if (instance?.api?.pushLog) {
    instance.api.pushLog([message], attributes);
  }
};

initFaro();
