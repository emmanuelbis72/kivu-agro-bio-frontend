export function getFilenameFromDisposition(disposition, fallbackFilename) {
  const headerValue = String(disposition || "");
  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const standardMatch = headerValue.match(/filename="?([^"]+)"?/i);

  if (standardMatch?.[1]) {
    return standardMatch[1];
  }

  return fallbackFilename;
}

export function triggerBlobDownload(blob, filename) {
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(downloadUrl);
}

export function saveBlobResponse(response, fallbackFilename) {
  const filename = getFilenameFromDisposition(
    response?.headers?.["content-disposition"],
    fallbackFilename
  );
  const blob = response?.data instanceof Blob ? response.data : new Blob([response?.data]);
  triggerBlobDownload(blob, filename);
}
