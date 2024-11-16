function generateRoomCode(length = 6) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let roomCode = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    roomCode += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return roomCode;
}

exports.createNewRoom = async (req, res, next) => {
  if (req.session.user) {
    var newRoom = generateRoomCode();
    res.redirect(`/${newRoom}`);
  } else {
    res.redirect("/");
  }
};

exports.joinRoom = async (req, res, next) => {
  if (req.session.user) {
    console.log(req.params.meetingRoom);
    res.render("meetingRoom", {
      code: req.params.meetingRoom.toString(),
    });
  } else {
    res.redirect("/");
  }
};

exports.leaveRoom = async (req, res, next) => {
  res.redirect("/home");
};
