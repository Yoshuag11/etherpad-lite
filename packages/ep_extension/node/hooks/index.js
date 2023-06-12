exports.expressCreateServer = function (hookName, args) {
  args.app.get("/set_session", function (req, res) {
    const {
      query: { padId },
    } = req;
    return res.redirect(`/p/${padId}?showChat=false&chatAlwaysVisible=false`);
  });
};
