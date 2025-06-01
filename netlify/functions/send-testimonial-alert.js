const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" }),
    };
  }

  const payload = {
    sender: { name: "CBE Admin", email: "noreply@apexincomeoptions.com.ng" },
    to: [{ email: "noreply@apexincomeoptions.com.ng" }],
    templateId: 4,
    params: {}
  };

  const data = JSON.stringify(payload);

  const options = {
    hostname: 'api.brevo.com',
    path: '/v3/smtp/email',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'Content-Length': data.length
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let responseBody = "";
      res.on("data", chunk => responseBody += chunk);
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          body: responseBody
        });
      });
    });

    req.on("error", (error) => {
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to send email", details: error.message })
      });
    });

    req.write(data);
    req.end();
  });
};
