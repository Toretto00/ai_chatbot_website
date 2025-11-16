export const sendRequest = async ({
  url,
  method,
  body,
}: {
  url: string;
  method: string;
  body: any;
}) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    method,
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    // NestJS returns errors in this format: { statusCode: number, message: string | string[] }
    const errorMessage =
      Array.isArray(data.message) || data.message instanceof Object
        ? data.message.join(", ") ||
          data.message.message ||
          data.message.error ||
          data.message.message[0]
        : data.message || "An error occurred";

    return {
      status: data.statusCode,
      code: data.code,
      message: errorMessage,
    };
  } else {
    return data;
  }
};
