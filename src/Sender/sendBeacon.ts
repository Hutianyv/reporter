export const sendBeacon = <T extends Record<string, unknown>>(
  url: string,
  data: T extends Record<string, any> ? T : never,
  headers: Record<string, string> = {},
  json: boolean = true,
  fallback: boolean = true
): boolean => {
  if (json && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (!("sendBeacon" in navigator)) {
    return fallback ? fallbackToXHR(url, data, json) : false;
  }
  if (!isValidURL(url)) {
    throw new Error("Invalid URL format");
  }

  try {
    let payload: BodyInit;

    if (json) {
      const serialized = safeStringify(data);
      payload = new Blob([serialized], { type: headers["Content-Type"] });
    } else {
      const formData = new FormData();
      for (const [key, value] of Object.entries(data)) {
        if (value instanceof Blob) {
          formData.append(key, value);
        } else {
          formData.append(key, String(value));
        }
      }
      payload = formData;
      //删除 Content-Type 让浏览器自动生成 boundary
      delete headers["Content-Type"];
    }
    return navigator.sendBeacon(url, payload);
  } catch (error) {
    console.error("[Beacon] Error:", error);
    return fallback ? fallbackToXHR(url, data, json) : false;
  }
};

//降级
const fallbackToXHR = (
  url: string,
  data: Record<string, any>,
  isJson: boolean
): boolean => {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, false);

    if (isJson) {
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify(data));
    } else {
      const formData = new FormData();
      (Object.entries(data) as Array<[string, string | Blob]>).forEach(
        ([k, v]) => {
          if (v instanceof Blob) {
            formData.append(k, v);
          } else {
            formData.append(k, String(v));
          }
        }
      );
      xhr.send(formData);
    }

    return xhr.status < 400;
  } catch (error) {
    console.error("[Fallback] Failed:", error);
    return false;
  }
};

const safeStringify = (data: unknown): string => {
  const seen = new WeakSet();
  return JSON.stringify(data, (_, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }
    return value;
  });
};
const isValidURL = (url: string) =>
  typeof url === "string" &&
  (url.startsWith("http://") || url.startsWith("https://")) &&
  url.length < 2048;
