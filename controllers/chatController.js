exports.getChatPage = async (req, res, next) => {
  if (req.session.user) {
    res.render("chatpage", {
      username: req.session.user.name,
    });
  } else {
    res.redirect("/");
  }
};
