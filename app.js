// Import Express.js
const express = require('express');

// Create an Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Set port and verify_token
const port = process.env.PORT || 3000;
const verifyToken = process.env.VERIFY_TOKEN;

// Route for GET requests
app.get('/', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.status(403).end();
  }
});

// Route for POST requests
app.post('/', (req, res) => {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(JSON.stringify(req.body, null, 2));
  res.status(200).end();
});


///////////////////// meta defaults above this line ///////////////////////




app.post("/test-booking-message", async (req, res) => {
  try {
    const {
      name,
      phone,
      appointmentDate,
      appointmentTime,
      therapy,
    } = req.body;

    if (
      !name ||
      !phone ||
      !appointmentDate ||
      !appointmentTime ||
      !therapy
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all booking details.",
      });
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.PHONE_NUMBER_ID;
    const apiVersion = process.env.GRAPH_API_VERSION;

    if (!token || !phoneNumberId || !apiVersion) {
      return res.status(500).json({
        success: false,
        message: "WhatsApp API environment variables are missing.",
      });
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
          recipient_type: "individual",
          to: phone,
          type: "text",
          text: {
            body: `Hi ${name}, your ${therapy} appointment is scheduled for ${appointmentDate} at ${appointmentTime}.`,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Meta API error:", data);

      return res.status(response.status).json({
        success: false,
        error: data,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Meta accepted the WhatsApp message request.",
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