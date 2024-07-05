const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const path = require("path");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { request } = require("http");

mongoose.connect("mongodb://127.0.0.1:27017/login");
const users = mongoose.model("login", {
  name: String,
  username: String,
  age: Number,
  email: String,
  password: String,
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "newpost" }],
});
const newpost = mongoose.model("newpost", {
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  date: {
    type: Date,
    default: Date.now,
  },
  content: String,
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
});

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});
app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/profile", isLoggedin, async (req, res) => {
  let user = await users.findOne({ email: req.user.email }).populate("posts");
  res.render("profile", { user });
});
app.post("/signup", async (req, res) => {
  const { name, username, age, email, password } = req.body;
  const exists = await users.findOne({ email: email });
  if (exists) {
    res.send("Account exits,redirecting to login");
  } else {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const user = await users.create({
      name,
      username,
      age,
      email,
      password: hash,
    });
    let token = jwt.sign({ email: email, userId: user._id }, "ekjeev");
    res.cookie("token", token);
    res.redirect("/profile");
  }
});
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const exists = await users.findOne({ email: email });
  if (!exists) {
    res.send("User do not exists,signup...");
    res.render("signup");
  } else {
    bcrypt.compare(password, exists.password, (err, result) => {
      if (result) {
        const token = jwt.sign({ email, userID: exists._id }, "ekjeev");
        res.cookie("token", token);
        res.redirect("/profile");
      } else {
        res.send("password incorrect");
      }
    });
  }
});
app.post("/post", isLoggedin, async (req, res) => {
  let user = await users.findOne({ email: req.user.email });
  let post = await newpost.create({
    user: req.user.userID,
    content: req.body.content,
  });
  user.posts.push(post._id);
  await user.save();

  res.redirect("/profile");
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.render("login");
});
function isLoggedin(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    res.send("Need to be logged in to access the profile");
  } else {
    let data = jwt.verify(req.cookies.token, "ekjeev");
    req.user = data;
  }
  next();
}

app.listen(3000, (req, res) => {
  console.log("Listening on port 3000");
});
