const express = require('express');
const dotenv = require('dotenv');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

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


    // artwork collection
    app.get("/api/artworks/:email", async (req, res) => {
    
    try {
    const { email } = req.params;
    const result = await artworksCollection.find({ artistEmail: email }).toArray();
    res.json(result); 
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
    }
    });

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

    app.patch("/api/artworks/:id", async (req, res) => {
    try {
    const { id } = req.params;
    const { title, image, description, category, price } = req.body;

    const updatedArtwork = {};
    if (title) updatedArtwork.title = title;
    if (image) updatedArtwork.image = image;
    if (description) updatedArtwork.description = description;
    if (category) updatedArtwork.category = category;
    if (price) updatedArtwork.price = Number(price);
    
    updatedArtwork.updatedAt = new Date();

    const result = await artworksCollection.updateOne(
      { _id: new ObjectId(id) }, 
      { $set: updatedArtwork } 
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Artwork not found" });
    }

    res.json({ success: true, message: "Artwork updated successfully", result });
    } catch (error) {
    console.error("Error updating artwork:", error);
    res.status(500).json({ error: "Internal server error" });
    }
    });

    

    // 1.ALL ARTWORKS (With Search, Filter, Sort)
    app.get("/api/artworks", async (req, res) => {
    try {
    const { search, category, sort } = req.query;
    let query = {};

    // Global Search (Title or Artist Name accordingly)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { artistName: { $regex: search, $options: "i" } }
      ];
    }

    // Category Filter
    if (category && category !== "all") {
      query.category = category;
    }

    // Sorting Setup
    let sortOptions = { createdAt: -1 }; // default newest
    if (sort === "price-asc") sortOptions = { price: 1 };
    if (sort === "price-desc") sortOptions = { price: -1 };

    const result = await artworksCollection.find(query).sort(sortOptions).toArray();
    res.json(result);
    } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ error: "Failed to fetch artworks" });
    }
    });

    // 2. SINGLE ARTWORK BY ID
    app.get("/api/artworks/single/:id", async (req, res) => {
    try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid artwork ID format" });
    }
    const result = await artworksCollection.findOne({ _id: new ObjectId(id) });
    if (!result) {
      return res.status(404).json({ error: "Artwork not found" });
    }
    res.json(result);
    } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    }
    });

    //DELETE EACH ARTWORK BY ID
    app.delete("/api/artworks/:id", async (req, res) => {
    try {
    const { id } = req.params;
    const result = await artworksCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Artwork not found" });
    }
    res.json({ success: true, message: "Artwork deleted successfully" });
    } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    }
    });

    // purchase collection
    app.post("/api/purchases", async (req, res) => {
    try {
    const purchase = req.body;

    purchase.purchasedAt = new Date();

    const result = await purchasesCollection.insertOne(purchase);

    res.status(201).json(result);
    } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Purchase failed",
    });
    }
    });

    // PURCHASE HISTORY OF A USER

    app.get("/api/purchases/:email", async (req, res) => {
    try {
    const { email } = req.params;

    const result = await purchasesCollection.find({buyerEmail: email}).sort({purchasedAt: -1,}).toArray();

    res.json(result);

    } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch purchases",
    });
    }
    });

    // subscription
    app.get("/api/purchases/count/:email", async (req, res) => {
    try {
    const { email } = req.params;

    const count = await purchasesCollection.countDocuments({
      buyerEmail: email,
    });

    res.json({
      count,
    });
    } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed",
    });
    }
    });

    app.get("/api/purchases/gallery/:email", async (req, res) => {
    try {
    const { email } = req.params;

    const purchases = await purchasesCollection
      .find({ buyerEmail: email })
      .sort({ purchasedAt: -1 })
      .toArray();

    res.send(purchases);
    } catch (error) {
    res.status(500).send({
      message: "Failed to fetch purchased artworks",
    });
    }
    });

    app.get("/api/sales/:email", async (req, res) => {
    try {
    const { email } = req.params;

    const sales = await purchasesCollection.find({artistEmail: email}).sort({purchasedAt: -1}).toArray();

    res.send(sales);
     } catch (err) {
    res.status(500).send({
      message: "Failed to fetch sales",
    });
    }
    });

    app.get("/api/sales/stats/:email", async (req, res) => {
    try {
    const { email } = req.params;

    const sales = await purchasesCollection.find({artistEmail: email}).toArray();

    const totalSales = sales.length;

    const totalRevenue = sales.reduce((sum, item) => sum + item.price,0);

    const uniqueBuyers = new Set(sales.map((sale) => sale.userEmail)).size;

    res.send({totalSales, totalRevenue, uniqueBuyers,});

    } catch (err) {
    res.status(500).send({
      message: "Failed",
    });
    }
    });
    
    // Users collection
    app.get("/api/users/:email", async (req, res) => {
     try {
    const { email } = req.params;

    const user = await usersCollection.findOne({email});

    res.send(user);
    } catch (err) {
    res.status(500).send({
      message: "Failed to fetch user",
    });
    }
    });

    app.patch("/api/users/:email", async (req, res) => {
    try {
    const { email } = req.params;

    const {
      name,
      image,
      phone,
      address,
    } = req.body;

    const result =
      await usersCollection.updateOne({ email },
        {
          $set: {
            name,
            image,
            phone,
            address,
            updatedAt: new Date(),
          },
        }
      );

    res.send(result);
    } catch (err) {
    res.status(500).send({
      message: "Update failed",
    });
    }
    });

    // admin requirement api
    app.get("/api/admin/analytics", async (req, res) => {
    const totalUsers = await usersCollection.countDocuments();

    const totalArtists = await usersCollection.countDocuments({role: "artist",
    });

    const purchases = await purchasesCollection.find().toArray();

    const totalSold = purchases.length;

    const totalRevenue = purchases.reduce((sum, purchase) => sum + purchase.price,0);

    const artworks = await artworksCollection.find().toArray();

    const categoryMap = {};

    artworks.forEach((artwork) => {
    categoryMap[artwork.category] =(categoryMap[artwork.category] || 0) + 1;});

    const categoryData = Object.entries(categoryMap).map(
    ([category, value]) => ({
      category,
      value,
    })
    );

    res.send({
    totalUsers,
    totalArtists,
    totalSold,
    totalRevenue,
    categoryData,
    });
    });

    app.get("/api/admin/artworks", async (req, res) => {
    const artworks = await artworksCollection.find().sort({ createdAt: -1 }).toArray();

    res.send(artworks);
    });

    app.delete("/api/admin/artworks/:id", async (req, res) => {
    const result = await artworksCollection.deleteOne({_id: new ObjectId(req.params.id),
    });

    res.send(result);
    });

    app.get("/api/admin/transactions", async (req, res) => {
    try {
    const purchases = await purchasesCollection.find().toArray();

    const subscriptions = await subscriptionCollection.find().toArray();

    const purchaseTransactions = purchases.map((purchase) => ({
      _id: purchase._id,
      type: "Purchase",

      userEmail: purchase.buyerEmail,
      artistEmail: purchase.artistEmail,

      amount: purchase.price,

      date: purchase.purchasedAt,
    }));

    const subscriptionTransactions = subscriptions.map((subscription) => ({
      _id: subscription._id,
      type: "Subscription",

      userEmail: subscription.userEmail,
      artistEmail: "-",

      amount: subscription.price,

      date: subscription.subscribedAt,
    }));

    const transactions = [
      ...purchaseTransactions,
      ...subscriptionTransactions,
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.send(transactions);
    } catch (err) {
    res.status(500).send({
      message: "Failed to fetch transactions",
    });
    }
    });

    // Get All Users

    app.get("/api/admin/users", async (req, res) => {
    try {
    const users = await usersCollection.find({}).sort({ createdAt: -1 }).toArray();
    res.send(users);
    } catch (err) {
    res.status(500).send({message: "Failed to fetch users"});
    }
    });

    // Update User Role

    app.patch("/api/admin/users/:id", async (req, res) => {
    try {
    const { id } = req.params;
    const { role } = req.body;

    const result = await usersCollection.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          role,
        },
      }
    );

    res.send(result);
    } catch (err) {
    res.status(500).send({message: "Failed to update role"});
    }
    });

    // Delete User

    app.delete("/api/admin/users/:id", async (req, res) => {
    try {
    const result = await usersCollection.deleteOne({_id: new ObjectId(req.params.id),
    });

    res.send(result);
    } catch (err) {
    res.status(500).send({message: "Delete failed"});
    }
    });

    // subscriptions collection
    app.post("/api/subscriptions", async (req, res) => {
    try {
    const {
      userEmail,
      userName,
      plan,
      price,
      maxPurchases,
    } = req.body;

    await subscriptionCollection.deleteMany({userEmail});

    const subscription = {
      userEmail,
      userName,
      plan,
      price,
      maxPurchases,
      subscribedAt: new Date(),
    };

    const result =
      await subscriptionCollection.insertOne(subscription);

    res.send(result);

    } catch (err) {
    res.status(500).send({
      message: "Failed to subscribe",
    });
    }
    });

    app.get("/api/subscriptions/:email", async (req, res) => {
    try {
    const result =
      await subscriptionCollection.findOne({
        userEmail: req.params.email,
      });

    res.send(result);
    } catch {
    res.status(500).send({
      message: "Failed",
    });
    }
    });

    // comments collection
    app.post("/api/comments", async (req, res) => {
    try {
    const comment = {
      ...req.body,
      createdAt: new Date(),
    };

    const result = await commentsCollection.insertOne(comment);

    res.send(result);
    } catch (err) {
    res.status(500).send({
      message: "Failed to add comment",
    });
    }
    });

    app.get("/api/comments/:artworkId", async (req, res) => {
    try {
    const { artworkId } = req.params;

    const comments = await commentsCollection
      .find({
        artworkId,
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    res.send(comments);
     } catch (err) {
    res.status(500).send({
      message: "Failed",
    });
    }
    });

    app.post("/api/comments", async (req, res) => {
    try {
    const comment = {
      artworkId: req.body.artworkId,
      artworkTitle: req.body.artworkTitle,

      userEmail: req.body.userEmail,
      userName: req.body.userName,

      comment: req.body.comment,

      createdAt: new Date(),
    };

    const result = await commentsCollection.insertOne(comment);

    res.send(result);
    } catch (err) {
    res.status(500).send({ message: "Failed to add comment" });
    }
    });

    app.get("/api/comments/:artworkId", async (req, res) => {
    try {
    const comments = await commentsCollection.find({artworkId: req.params.artworkId,}).sort({ createdAt: -1 }).toArray();

    res.send(comments);
    } catch (err) {
    res.status(500).send({ message: "Failed to fetch comments" });
    }
    });

    app.delete("/api/comments/:id", async (req, res) => {
    try {
    const result = await commentsCollection.deleteOne({_id: new ObjectId(req.params.id)});

    res.send(result);
    } catch (err) {
    res.status(500).send({ message: "Delete failed" });
    }
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