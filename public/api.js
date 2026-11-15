export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.error?.message || `Request failed with status ${status}.`);
    this.name = "ApiError";
    this.status = status;
    this.fields = payload?.error?.fields || {};
  }
}

export async function request(url, options = {}) {
  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Unable to reach the API. Check that the server is running.");
  }

  if (response.status === 204) {
    if (!response.ok) {
      throw new ApiError(response.status);
    }
    return null;
  }

  const responseText = await response.text();
  let payload = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        throw new Error("The API returned an invalid JSON response.");
      }
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, payload);
  }

  return payload;
}
