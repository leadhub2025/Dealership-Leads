
export const openNativeEmailClient = (to: string, subject: string, body: string) => {
  const params = new URLSearchParams({
    subject: subject,
    body: body
  });

  // We use window.open to trigger the mailto link
  // This opens the default mail app (Outlook, Apple Mail) or Gmail web if configured
  window.location.href = `mailto:${to}?${params.toString()}`;
};

export const constructEmailSubject = (brand: string, model: string) => {
  return `Inquiry regarding availability: ${brand} ${model}`;
};
