const express = require('express');
const dotenv = require('dotenv');

const { MongoClient, ServerApiVersion } = require('mongodb');

dotenv.config()
const cors = require('cors');
const app = express();
const port = process.env.PORT || 8000;

app.use(cors())
app.use(express.json())

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const db = client.db("art_hub");
    const artworksCollection = db.collection("artworks");
    const usersCollection = db.collection("users");
    const purchasesCollection = db.collection("purchases")
    const subscriptionCollection = db.collection("subscriptions")
    const commentsCollection = db.collection("comments")


    app.get("/api/artworks/:email", async (req, res) => {
        const {email} = req.params;
        const result = await artworksCollection.findOne({artistEmail:email})
        res.send(result)
    })

    app.post("/api/artworks", async (req, res) => {
    const {title, image, description, category, price, artistName, artistEmail} = req.body;

    const artwork = {title, image, description, category, price: Number(price),
    artistName, artistEmail,
    createdAt: new Date(),
    updatedAt: new Date(),
    };

    const result = await artworksCollection.insertOne(artwork);

    res.send(result);
    });


    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});