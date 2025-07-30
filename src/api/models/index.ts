const User = require('./user.model');
const UserNote = require('./userNote.model');
const RefreshToken = require('./refreshToken.model');

// Define associations
User.hasMany(UserNote, { 
  foreignKey: 'userId',
  as: 'notes'
});
UserNote.belongsTo(User, { 
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(RefreshToken, { 
  foreignKey: 'userId',
  as: 'refreshTokens'
});
RefreshToken.belongsTo(User, { 
  foreignKey: 'userId',
  as: 'user'
});

export { User, UserNote, RefreshToken };
