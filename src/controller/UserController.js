const { User, UserHabits, HabitTypes, Habit } = require('../models/index')
const config = require("../../util/firebaseConfig")
const { admin } = require('../../util/admin')
const firebase = require("firebase")
const { validateSignupData, validateLoginData } = require("../../util/validators")

firebase.initializeApp(config)

exports.signup = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    }
    const { valid, errors } = validateSignupData(newUser)
    const expiresIn = 60 * 60 * 24 * 5 * 1000

    if (!valid) return res.status(400).json(errors)

    User.findAll({ where: { email: req.body.email } })
        .then(data => {
        if (data.length > 0) {
            return res
            .status(400)
            .json({ handle: `This username is already taken` })
       } else {
            User.create({ 
              firstName: req.body.firstName,
              lastName: req.body.lastName,
              email: req.body.email,
              bio : req.body.bio,
             })
             .catch(console.error)
            return firebase
              .auth()
              .createUserWithEmailAndPassword(newUser.email, newUser.password)
        }})
        .then(data => data.user.getIdToken())
        .then(token => admin.auth().createSessionCookie(token, { expiresIn }))
        .then(sessionCookie => { // sessionCookie is the token
          const options = { maxAge: expiresIn, httpOnly: true, secure: true }
          res.cookie('session', sessionCookie, options)
          return res.status(200).json({ sessionCookie })
        })
        .catch(err => {
        console.error(err)
        if (err.code === "auth/email-already-in-use") {
            return res.status(400).json({ email: "Email is already in use" })
        } else {
            return res
            .status(500)
            .json({ general: "Something went wrong, please try again" })
        }
    })
}

exports.login = (req, res) => {
    const user = {
      email: req.body.email,
      password: req.body.password,
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000
  
    const { valid, errors } = validateLoginData(user)
  
    if (!valid) return res.status(400).json(errors)
  
    firebase
      .auth()
      .signInWithEmailAndPassword(user.email, user.password)
      .then(data => data.user.getIdToken())
      .then(token => {
        console.log(token)
        admin.auth().createSessionCookie(token, { expiresIn })
      })
      .then(sessionCookie => {
        const options = { maxAge: expiresIn, httpOnly: true, secure: true }
        res.cookie('session', sessionCookie, options)
        return res.status(200).json({ sessionCookie })
      })
      .catch(err => {
        console.error(err)
        return res
          .status(403)
          .json({ general: "Wrong credentials, please try again" })
      })
  }

  exports.getUser = (req, res) => 
    User.findAll({ where: { id: req.params.user_id }, limit: 1 }).then(data => res.json(data)).catch(console.error)
  
  exports.getUsers = (req, res) => 
    User.findAll().then(data => res.json(data)).catch(console.error)


  exports.getUserHabits = (req, res) => 
    User.findAll({
      where: { id: req.params.user_id }
    })
    .then(data => res.json(data))
    .catch(err => {
      console.error(err)
      res.status(400).json({message: `Something went wrong at getting User Habits: ${err}`})
    })
  
  exports.postUserHabit = (req, res) => {
    UserHabits.create({
      userId: req.params.user_id,
      habitId: req.body.habitId,
      currentDuration: req.body.currentDuration,
      endDuration: req.body.endDuration
    })
    .then(data => res.json(data))
    .catch(err => {
      console.error(err)
      res.status(400).json({message: `Something went wrong at posting UserHabit: ${err}`})
    })
  }

  exports.postNewHabit = (req, res) => {
    Habit.create({
      name: req.body.name,
      description: req.body.description,
      ownerId: req.params.user_id,
      numOfLikes: 1,
      endDuration: req.body.endDuration,
      habitTypeId: req.body.habitTypeId
    })
    .then(habit => 
      UserHabits.create({
        userId: req.params.user_id,
        habitId: habit.id,
        currentDuration: req.body.currentDuration,
        endDuration: req.body.endDuration
      })
    )
    .then(data => res.json(data))
    .catch(err => {
      console.error(err)
      res.status(400).json({message: `Something went wrong at posting a new habit: ${err}`})
    })
  }