const uuid = require("uuid");
const fs =require('fs')
const { validationResult } = require("express-validator");
const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require ('../models/user');
const {  mongoose } = require("mongoose");
// let DUMMY_PLACES = [
//     {
//       id: 'p1',
//       title: 'Government college of Engineering',
//       description: 'One of the most famous govt college in Tamil Nadu!',
//     //   imageUrl: 'http://upload.wikimedia.org/wikipedia/commons/d/d3/Gcesalem.jpg',
//       address: 'NH 44, Karuppur, Salem, Tamil Nadu 636011',
//       location: {
//         lat: 40.7484405,
//         lng: -73.9878584
//       },
//       creator: 'u1'
//     },
//     {
//       id: 'p2',
//       title: 'Government college of Engineering',
//       description: 'One of the most famous govt college in Tamil Nadu!',
//     //   imageUrl: 'http://upload.wikimedia.org/wikipedia/commons/d/d3/Gcesalem.jpg',
//       address: 'NH 44, Karuppur, Salem, Tamil Nadu 636011',
//       location: {
//         lat: 40.7484405,
//         lng: -73.9878584
//       },
//       creator: 'u2'
//     }
// ]

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId);
    console.log(place);
  } catch (err) {
    const error = new HttpError(
      "something went wrong , could not find place",
      500
    );
    return next(error);
  }
  if (!place) {
    return next(
      new HttpError("Could not find a place for the provided ID", 404)
    );
  }
  res.json({ place: place.toObject({ getters: true }) });
};
const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let userWithPlaces;
  try {
    userWithPlaces = await User.findById( userId ).populate('places');
    // place = await Place.find({ creator: userId });  find will return a array of elements
  } catch (err) {
    const error = new HttpError("Fetching places failed", 500);
    return next(error);
  }
  // if (!places || places.length === 0)
  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(
      new HttpError("Could not find a places for the provided user ID", 404)
    );
  }
  res.json({ places: userWithPlaces.places.map((p) => p.toObject({ getters: true })) });
};
const createPlace = async (req, res, next) => {
  const errors = validationResult(req.body);
  if (!errors.isEmpty()) {
    const error = new HttpError("Invalid inputs passed ", 422);
    return next(error);
  }
  const { title, description, address, creator } = req.body;
  const coordinates = getCoordsForAddress();
  const createdPlace = new Place({
    title: title,
    description: description,
    address: address,
    location: coordinates,
    image: req.file.path,
    creator: creator,
  });
  let user;
  try{
    user =await User.findById(creator)
  }catch(err)
  {
    const error = new HttpError("Creating place failed , please try again",500)
    return next(error)
  }if(!user)
  {
    const error = new HttpError("Could not find user for provided id",404)
    return next(error)
  }
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError("creating failed ", 500);
    return next(error);
  }
  // console.log(createdPlace)
  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req.body);
  if (!errors.isEmpty()) {
    throw new HttpError("Invalid inputs passed ", 422);
  }
  const { title, description } = req.body;
  const placeId = req.params.pid;
  let updatedPlace;
  try {
    updatedPlace = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong,could not update place",
      500
    );
    return next(error);
  }
  updatedPlace.title = title;
  updatedPlace.description = description;
  try {
    await updatedPlace.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong,could not update place",
      500
    );
    return next(error);
  }
  res.status(200).json({ place: updatedPlace.toObject({ gettters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate('creator')
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete place.',
      500
    );
    return next(error);
  }
  if (!place) {
    const error = new HttpError('Could not find a place for the provided id.', 404);
    return next(error);
  } 
  const imagePath = place.image;
  try { 
    const sess = await mongoose.startSession()
    sess.startTransaction()
    await Place.deleteOne({ _id: placeId }, { session: sess });
    place.creator.places.pull(place)
    await place.creator.save({session:sess})
    await sess.commitTransaction()
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete place !!!.',
      500
    );
    return next(error);
  }
  fs.unlink(imagePath,err=>{
    console.log(err)
  })
  res.status(200).json({ message: 'Deleted place.' });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
