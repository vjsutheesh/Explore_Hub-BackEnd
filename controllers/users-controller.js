const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const User = require("../models/user");
// const DUMMY_USERS = [
//   {
//     id: "u1",
//     name: "Sutheesh",
//     email: "vjsutheesh@gmail.com",
//     password: "12345",
//   },
// ];

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError(
      "Fetching users failed , please try again later",
      500
    );
    return next(error);
  }
  // console.log(user)
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};
const signup = async (req, res, next) => {
  const errors = validationResult(req.body);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid inputs passed", 422));
  }
  const { name, email, password } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError("Signup failed, please try again later", 500);
    return next(error);
  }
  if (existingUser) {
    const error = new HttpError(
      "User already exists, please login instead",
      500
    );
    return next(error);
  }
  const createdUser = new User({
    name,
    email,
    image: req.file.path,
    password,
    places: [],
  });
  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Signup failed, please try again", 500);
  }
  res.status(201).json({ user: createdUser.toObject({ getters: true }) });
};
const login = async (req, res, next) => {
  const { email, password } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError("login failed, please try again later", 500);
    return next(error);
  }
  if (!existingUser || existingUser.password !== password) {
    const error = new HttpError(
      "Invalid credentials , could not log you in",
      401
    );
    return next(error);
  }
  res.json({
    message: "logged in",
    user: existingUser.toObject({ getters: true }),
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
