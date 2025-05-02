const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Client } = require("pg");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",  // Allow requests from any origin (you can restrict this in production)
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(bodyParser.json());

// PostgreSQL connection setup
const client = new Client({
  user: 'postgres',     // PostgreSQL user
  host: 'localhost',
  database: 'postgres', // Your database name
  password: '1234',      // Your database password
  port: 5432,           // PostgreSQL port (default is 5432)
});

client.connect();

// Socket connection handler
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Listening for disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// CREATE - Add a new user
app.post("/add-user", async (req, res) => {
  const { id, name, gender } = req.body;

  if (!name || !gender) {
    return res.status(400).send({ message: "Name and Gender are required" });
  }

  try {
    const result = await client.query(
      "INSERT INTO person (id, name, gender) VALUES ($1, $2 ,$3) RETURNING *",
      [id, name, gender]
    );
    const newUser = result.rows[0];

    // Emit 'user_added' event for real-time updates
    io.emit("user_added", newUser);

    res.status(201).send({ message: "User added", user: newUser });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).send({ message: "Error adding user" });
  }
});

// READ - Get all users
app.get("/users", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM person");
    res.status(200).send({ users: result.rows });
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).send({ message: "Error getting users" });
  }
});

// UPDATE - Update user data
app.put("/update-user/:id", async (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, gender } = req.body;

  try {
    const result = await client.query(
      "UPDATE person SET name = $1, gender = $2 WHERE id = $3 RETURNING *",
      [name, gender, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send({ message: "User not found" });
    }

    const updatedUser = result.rows[0];

    // Emit 'user_updated' event for real-time updates
    io.emit("user_updated", updatedUser);

    res.status(200).send({ message: "User updated", user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send({ message: "Error updating user" });
  }
});

// DELETE - Delete a user
app.delete("/delete-user/:id", async (req, res) => {
  const userId = parseInt(req.params.id);

  try {
    const result = await client.query(
      "DELETE FROM person WHERE id = $1 RETURNING *",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send({ message: "User not found" });
    }

    const deletedUser = result.rows[0];

    // Emit 'user_deleted' event for real-time updates
    io.emit("user_deleted", deletedUser);

    res.status(200).send({ message: "User deleted", user: deletedUser });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).send({ message: "Error deleting user" });
  }
});

// Start the server
server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
