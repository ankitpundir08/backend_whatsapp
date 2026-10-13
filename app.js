// Import Express.js
const express = require("express");

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.static("public"));

// Set port and verify_token
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;

// Route for GET requests
app.get("/", (req, res) => {
  const {
    "hub.mode": mode,
    "hub.challenge": challenge,
    "hub.verify_token": token,
  } = req.query;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("WEBHOOK VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Route for POST requests
app.post("/", (req, res) => {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));
  res.status(200).end();
});

///////////////////// meta defaults above this line ///////////////////////

app.post("/test-booking-message", async (req, res) => {
  try {
    const { phone, imageurl } = req.body;
    console.log('Received request body:', req.body);

    if (!phone || !imageurl) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    if (!imageurl.startsWith("https://")) {
      return res.status(400).json({
        success: false,
        message: "image url must start with https://",
      });
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.PHONE_NUMBER_ID;
    const apiVersion = process.env.GRAPH_API_VERSION;

    console.log({
      tokenExists: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
      phoneNumberIdExists: Boolean(process.env.PHONE_NUMBER_ID),
      apiVersionExists: Boolean(process.env.GRAPH_API_VERSION)
    });

    if (!token || !phoneNumberId || !apiVersion) {
      return res
        .status(500)
        .json({ success: false, message: "Missing environment variables" });
    }

    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          messaging_product: "whatsapp",
          receipient_type: "individual",
          to: phone,
          type: "template",
          template: {
            name: "jaspers_market_image_cta_v1",
            language: {
              code: "en_US",
            },
            components: [
              {
                type: "header",
                parameters: [
                  {
                    type: "image",
                    image: {
                      link: imageurl,
                    },
                  },
                ],
              },
            ],
          },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("META API ERROR: ", data);

      return res.status(response.status).json({
        success: false,
        error: data,
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Meta accepted the request and is processing it. Check the WhatsApp number for the message.",
      metaResponse: data,
    });
  } catch (error) {
    console.error("Server error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`\nListening on port ${port}\n`);
});
