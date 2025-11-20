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

  return data;
};
