const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser')
require('dotenv').config()
const jwt = require('jsonwebtoken')
const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'https://cheerful-eclair-b22c9e.netlify.app'
  ],
  credentials: true,
  optionalSuccessStatus: 200,
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser())

// verify jwt middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token
  if (!token) return res.status(401).send({ message: 'unauthorized access' })
  if (token) {
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
      if (err) {
        // console.log(err)
        return res.status(401).send({ message: 'unauthorized access' })
      }
      // console.log(decoded)

      req.user = decoded
      next()
    })
  }
}


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


    //generate jwt
    app.post('/jwt', async (req, res) => {
      const email = req.body;
      // console.log(email);

      const token = jwt.sign(email, process.env.SECRET_KEY, { expiresIn: '365d' })
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      })
        .send({ success: true })
    })


    // Clear token on logout
    app.get('/logout', (req, res) => {
      res
        .clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          maxAge: 0,
        })
        .send({ success: true })
    })


    //add a single food item

    app.post('/add-food',verifyToken,async (req, res) => {
      const foodData = req.body;
      const email = foodData.email;
      const decodedEmail = req?.user?.email

      if(email != decodedEmail){
        return res.status(401).send({message: 'unauthorized access'});
      }
      foodData.quantity = parseInt(foodData.quantity, 10);
      // console.log('email: ',email);
      delete foodData.email;
      const result = await foodsCollection.insertOne(foodData)

      res.send(result)
    })

    //add a single order to orders
    app.post('/add-order', async (req, res) => {
      const orderedData = req.body;
      const orderedQuantity = parseInt(orderedData?.orderedQuantity);
      // console.log(orderedQuantity);

      const result = await ordersCollection.insertOne(orderedData)

      const filter = { _id: new ObjectId(orderedData.foodId) }
      const update = {
        $inc: {
           order: 1 ,  
           quantity: -orderedQuantity
           },
      }
      const updatedOrderCount = await foodsCollection.updateOne(filter, update)

      res.send(orderedData)
    })


    //get foods data for home
    app.get('/foods', async (req, res) => {
      const result = await foodsCollection
        .find()
        .sort({ order: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    })

    //get all foods for all foods route
    app.get('/all-foods', async (req, res) => {
      const search = req.query.search
      let query = {
        name: { $regex: search, $options: 'i' },
      }
      const result = await foodsCollection.find(query).toArray();
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
    app.get('/foods/purchase/:id',verifyToken,async (req, res) => {

      const email = req.query.email;
      const decodedEmail = req?.user?.email

      if(email != decodedEmail){
        return res.status(401).send({message: 'unauthorized access'});
      }

      const id = req.params.id;
      const query = { _id: new ObjectId(id) }

      const result = await foodsCollection.findOne(query)
      res.send(result);
    })

    // get all foods posted by a specific user
    app.get('/food/:email',verifyToken, async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      const decodedEmail = req?.user?.email

      if(email != decodedEmail){
        return res.status(401).send({message: 'unauthorized access'});
      }

      const query = { 'addBy.email': email }
      const result = await foodsCollection.find(query).toArray();
      // console.log(result);
      res.send(result)
    })

    // get all orders for a user by email from db
    app.get('/my-orders/:email',verifyToken, async (req, res) => {
      const email = req.params.email
      const decodedEmail = req?.user?.email

      if(email != decodedEmail){
        return res.status(401).send({message: 'unauthorized access'});
      }
      
      const query = { email }
      const result = await ordersCollection.find(query).toArray()
      res.send(result)
    })

    // delete a food from my orders
    app.delete('/my-food/:id', async (req, res) => {
      const id = req.params.id
      // console.log(id);
      const query = { _id: new ObjectId(id) }
      const result = await ordersCollection.deleteOne(query);
      // console.log(result);
      res.send(result)
    })


    //update a job in db
    app.put('/foods/:id', async (req, res) => {
      const id = req.params.id
      const foodData = req.body
      const query = { _id: new ObjectId(id) }
      const options = { upsert: true }

      const updatedDoc = {
        $set: {
          ...foodData,
        },
      }

      const result = await foodsCollection.updateOne(query, updatedDoc, options)
      res.send(result);
    })



    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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