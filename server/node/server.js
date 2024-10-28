const express = require("express");
const app = express();
const cors = require("cors");
const mercadopago = require("mercadopago");

// REPLACE WITH YOUR ACCESS TOKEN AVAILABLE IN: https://developers.mercadopago.com/panel
mercadopago.configure({
	access_token: "TEST-1493670481607435-042615-a61cccd0a0c147a54b90e67a2737df79-51815425",
});


app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static("../../client/html-js"));
app.use(cors());
app.get("/", function (req, res) {
	res.status(200).sendFile("index.html");
});

app.post("/create_preference", (req, res) => {
    console.log("Received request on /create_preference");

    const { items } = req.body;
    console.log("Request body:", req.body);
    console.log("theses is the items", items);

    if (!items || !Array.isArray(items)) {
        console.log("Invalid items array");
        return res.status(400).json({ error: "Invalid items array" });
    }

    let preference = {
        items: items.map(item => ({
			id: item.id,
            title: item.title,
            unit_price: Number(item.unit_price), // Ensure unit_price is a number
            quantity: Number(item.quantity), // Ensure quantity is a number
            description: item.description
        })),
		payer: {
			name: items.first_name,
			surname: items.last_name,
		     email: items.email,
			identification: { number: items.number, type: '' },
		 },
        back_urls: {
            "success": "http://localhost:5173/orderreturn",
            "failure": "http://localhost:5173/feedback",
            "pending": "http://localhost:5173/feedback"
        },
        auto_return: "approved",
        notification_url: "https://946f-2804-296c-2103-fd41-148e-cabf-515d-9b62.ngrok-free.app/webhook",
        external_reference: `${req.body.payer.identification.number}`
        
		
    };

    mercadopago.preferences.create(preference)
        .then(function (response) {
            console.log("Preference created:", response.body);
            res.json({
                id: response.body.id
            });
        }).catch(function (error) {
            console.error("Error creating preference:", error);
            res.status(500).json({ error: error.message });
        });
});


app.post("/webhook", async function(req, res) {
    console.log("Received POST request on /webhook");

    // Extrair dados do corpo da requisição
    const paymentId = req.body.data?.id;
    const eventType = req.body.type;
    console.log("Request body:", req.body);

    if (!paymentId) {
        console.error("No paymentId in request body");
        return res.status(400).json({ error: "No paymentId in request body" });
    }
    console.log("Payment ID:", paymentId);
    console.log("Event type:", eventType);

    const access_token = "TEST-1493670481607435-042615-a61cccd0a0c147a54b90e67a2737df79-51815425";

    // Determinar a URL da API com base no tipo de evento
    let apiUrl;
    if (eventType === 'payment') {
        apiUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`;
    } else if (eventType === 'merchant_order') {
        apiUrl = `https://api.mercadopago.com/merchant_orders/${paymentId}`;
    } else {
        console.error("Unknown event type:", eventType);
        return res.status(400).json({ error: "Unknown event type" });
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Event data:", data);
        } else {
            console.error("Failed to fetch event data. Status:", response.status);
        }
        res.sendStatus(200);

    } catch (error) {
        console.error("Error fetching event data:", error);
        res.sendStatus(500);
    }
});

app.get('/feedback', function (req, res) {
	res.json({
		Payment: req.query.payment_id,
		Status: req.query.status,
		MerchantOrder: req.query.merchant_order_id
	});
});

app.listen(8080, () => {
	console.log("The server is now running on Port 8080");
});
