const sendTokenResponse = (user, statusCode, res) => {
  const accessToken = user.getSignedAccessToken();
  const refreshToken = user.getSignedRefreshToken();

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    httpOnly: true
  };
  
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }
  
  res.status(statusCode)
    .cookie('refreshToken', refreshToken, options)
    .json({ success: true, accessToken, user });
};

module.exports = {
  sendTokenResponse
};
