const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u0zdv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


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

    const db = client.db('dine-db')
    const foodsCollection = db.collection('foods');
    const ordersCollection = db.collection('orders')

    //add a single food item

    app.post('/add-food', async (req, res) => {
      const foodData = req.body;
      const result = await foodsCollection.insertOne(foodData)

      res.send(result)
    })

    //add a single order to orders
    app.post('/add-order', async (req, res) => {
      const orderedData = req.body;

      const result = await ordersCollection.insertOne(orderedData)
      res.send(orderedData)
    })


    //get all foods data
    app.get('/foods', async (req, res) => {
      const result = await foodsCollection.find().toArray();
      res.send(result);
    })

    //get a specific food details
    app.get('/foods/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }

      const result = await foodsCollection.findOne(query)
      res.send(result);
    })

    //get a specific food details for purchase
    app.get('/foods/purchase/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }

      const result = await foodsCollection.findOne(query)
      res.send(result);
    })

    // get all foods posted by a specific user
    app.get('/food/:email', async (req, res) => {
      const email = req.params.email;
      console.log(email);

      const query = { 'addBy.email': email }
      const result = await foodsCollection.find(query).toArray();
      // console.log(result);
      res.send(result)
    })

      // get all order for a user by email from db
      app.get('/my-orders/:email', async (req, res) => {
        const email = req.params.email
        const query = { email }
        const result = await ordersCollection.find(query).toArray()
        res.send(result)
      })
  


    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Your food is preparing....')
})

app.listen(port, () => {
  console.log(`Food is preparing at: ${port}`);
})