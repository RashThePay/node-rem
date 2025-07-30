export {};
import * as crypto from 'crypto';
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/sequelize');
const moment = require('moment-timezone');
const APIError = require('../../api/utils/APIError');
const httpStatus = require('http-status');

/**
 * RefreshToken Model Definition
 */
class RefreshToken extends Model {
  public id!: number;
  public token!: string;
  public userId!: number;
  public userEmail!: string;
  public expires!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static generate(user: any) {
    const userId = user.id;
    const userEmail = user.email;
    const token = `${userId}.${crypto.randomBytes(40).toString('hex')}`;
    const expires = moment().add(30, 'days').toDate();
    const tokenObject = RefreshToken.create({
      token,
      userId,
      userEmail,
      expires
    });
    return tokenObject;
  }

  static async findAndDeleteToken(options: any) {
    const { userId } = options;
    if (!userId) {
      throw new APIError({ message: 'An userId is required to delete a token' });
    }
    const tokenRec = await RefreshToken.findOne({ where: { userId } });
    const err: any = {
      status: httpStatus.UNAUTHORIZED,
      isPublic: true
    };
    if (!tokenRec) {
      err.message = 'Logout failed. User already logged out?';
      throw new APIError(err);
    }
    await RefreshToken.destroy({ where: { userId } });
    return { status: 'OK' };
  }
}

// Initialize the model
RefreshToken.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    userEmail: {
      type: DataTypes.STRING,
      allowNull: false
    },
    expires: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'RefreshToken',
    tableName: 'refresh_tokens'
  }
);

module.exports = RefreshToken;
