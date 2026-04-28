export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
export const IMAGE_TOO_LARGE_MESSAGE = "L’image dépasse la taille autorisée.";
export const TOAST_EVENT_NAME = "arrasli:toast";

export const showToast = (type, message) => {
  const payload = typeof type === "object" ? type : { type, message };
  const nextMessage = payload.message || payload.text || "";

  if (!nextMessage) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT_NAME, {
      detail: {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type: payload.type === "success" ? "success" : "error",
        message: nextMessage,
      },
    })
  );
};

export const isImageTooLarge = (file) => Boolean(file && file.size > MAX_IMAGE_SIZE_BYTES);

export const validateImageFileSize = (files) => {
  const fileList =
    files?.name && typeof files.size === "number" ? [files] : Array.from(files || []);
  return !fileList.some(isImageTooLarge);
};
