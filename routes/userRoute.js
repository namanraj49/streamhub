const express = require("express");
const router = express();


const userController = require("../controllers/userController");
const chatController=require('../controllers/chatController');

const auth = require("../middleware/auth");
const meetingController=require('../controllers/meetingController');

router.get("/", auth.isLogout, userController.loadLogin);
router.post("/", auth.isLogout, userController.login);
router.get("/register", auth.isLogout, userController.loadRegister);
router.post("/register", auth.isLogout, userController.register);
router.get("/home", auth.isLogin, userController.loadHome);
router.get("/logout", auth.isLogin, userController.logout);

router.get('/create',meetingController.createNewRoom);
router.get('/leaveRoom',meetingController.leaveRoom);

router.get('/chat',chatController.getChatPage);

router.get('/:meetingRoom',meetingController.joinRoom);

module.exports = router;
