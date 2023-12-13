const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(
  "sk_test_51OKPAHSGFlTuqfowMVBbpYPNcE2ChxI16JrkudkFmunytfrgJRmRXUrBylWUIim29VpVSILbGrwOE3iv3OkGEon700bkKfhMqw"
);



// API

// - App config
const app = express();

// - Middlewares
app.use(cors({ origin: true }));
app.use(express.json());

// - API routes
app.get("/", (request, response) => response.status(200).send("hello world"));

app.post("/payments/create", async (request, response) => {
  const total = request.query.total;
  const paymentDescription = "Description of your payment here"; // Add your payment description

  console.log("Payment Request Received for this amount >>> ", total);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total, // subunits of the currency
      currency: "inr",
      metadata: {
        description: paymentDescription,
      },
    });

    // OK - Created
    response.status(201).send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating PaymentIntent:", error);
    response.status(500).send({
      error: {
        message: "Error creating PaymentIntent. Please try again.",
      },
    });
  }
});

// - Listen command
exports.api = functions.https.onRequest(app);
