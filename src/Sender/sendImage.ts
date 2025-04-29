/**
 * image策略的上报方式实现
 */

export const sendImage = (
  url: string,
  data: Record<string, unknown>,
  timeout: number = 2000
): void => {
  if (!isValidURL(url)) {
    throw new Error("Invalid URL format");
  }

  let image: HTMLImageElement | null = new Image();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    if (image) {
      image.onload = null;
      image.onerror = null;
      image = null;
    }
    if (timer) clearTimeout(timer);
  };

  try {
    const serializedData = JSON.stringify(data);
    if (serializedData.length > 2000) {
      throw new Error("Data exceeds maximum length (2000 chars)");
    }

    image.src = `${url}?data=${encodeURIComponent(serializedData)}`;
    timer = setTimeout(() => {
      console.warn("Image request timed out");
      cleanup();
    }, timeout);

    image.onload = image.onerror = cleanup;
  } catch (error) {
    console.error("Failed to send image:", error);
    cleanup();
  }
};

const isValidURL = (url: string) =>
  typeof url === "string" &&
  (url.startsWith("http://") || url.startsWith("https://")) &&
  url.length < 2048;
