const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const port = process.env.PORT || 5000;
const app = express();

// midlewire
app.use(cors());
app.use(express.json());

// verify jwt token
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({ error: true, message: "unautorized access" });
  }

  // split token
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unautorized access" });
    }

    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kgqetuh.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection

    const usersCollenction = client.db("artshalaDb").collection("users");
    const classCollenction = client.db("artshalaDb").collection("classes");
    const instructorCollenction = client
      .db("artshalaDb")
      .collection("instructors");

    // jwt token
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // ---------------------------users related api---------------------------
    // get all users
    app.get("/users", async (req, res) => {
      const result = await usersCollenction.find().toArray();
      res.send(result);
    });

    // save user's information
    app.put("/users/:email", async (req, res) => {
      const user = req.body;
      const email = req.params.email;

      const query = { email: email };
      const options = { upsert: true };
      const updateUser = {
        $set: {
          ...user,
        },
      };

      const isExist = await usersCollenction.findOne(query);
      if (isExist) {
        return;
      } else {
        const result = await usersCollenction.updateOne(
          user,
          updateUser,
          options
        );
        res.send(result);
      }
    });

    app.patch("/user-role/:id", async (req, res) => {
      const id = req.params.id;
      const role = req.query.role;

      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: role,
        },
      };
      const result = await usersCollenction.updateOne(query, updatedDoc);
      res.send(result);
    });

    // -------------------------admin relared api-----------------
    // verify if the user is admin or not
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEamil = req.decoded.email;
      if (email !== decodedEamil) {
        res.send({ admin: false });
      }
      
      const query = { email: email };
      const user = await usersCollenction.findOne(query);
      if (user) {
        const result = { admin: user?.role === "admin" };
        res.send(result);
      }
    });



    // -------------------------instructor relared api-----------------
    // verify if the user is instructor or not
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEamil = req.decoded.email;
      if (email !== decodedEamil) {
        res.send({ instructor: false });
      }

      const query = { email: email };
      const user = await usersCollenction.findOne(query);
      if (user) {
        const result = { instructor : user?.role === "instructor" };
        res.send(result);
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to Artshala Server");
});

app.listen(port, () => {
  console.log(`Artshala server is running on port: ${port}`);
});
