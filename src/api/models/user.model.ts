export {};
import { NextFunction, Request, Response, Router } from 'express';
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/sequelize');
const httpStatus = require('http-status');
const bcrypt = require('bcryptjs');
const moment = require('moment-timezone');
const jwt = require('jwt-simple');
const uuidv4 = require('uuid/v4');
const APIError = require('../../api/utils/APIError');
import { transformData, listData } from '../../api/utils/ModelUtils';
const { env, JWT_SECRET, JWT_EXPIRATION_MINUTES } = require('../../config/vars');

/**
 * User Roles
 */
const roles = ['user', 'admin'];

/**
 * User Model Definition
 */
class User extends Model {
  public id!: number;
  public email!: string;
  public password!: string;
  public tempPassword?: string;
  public name?: string;
  public services?: {
    facebook?: string;
    google?: string;
  };
  public role!: string;
  public picture?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  transform(options: { query?: any } = {}) {
    const { query = {} } = options;
    return transformData(this, query, ALLOWED_FIELDS);
  }

  token() {
    const payload = {
      exp: moment().add(JWT_EXPIRATION_MINUTES, 'minutes').unix(),
      iat: moment().unix(),
      sub: this.id
    };
    return jwt.encode(payload, JWT_SECRET);
  }

  async passwordMatches(password: string) {
    return bcrypt.compare(password, this.password);
  }

  // Static methods
  static async get(id: any) {
    try {
      const user = await User.findByPk(id);
      if (user) {
        return user;
      }

      throw new APIError({
        message: 'User does not exist',
        status: httpStatus.NOT_FOUND
      });
    } catch (error) {
      throw error;
    }
  }

  static async findAndGenerateToken(options: any) {
    const { email, password, refreshObject } = options;
    if (!email) {
      throw new APIError({ message: 'An email is required to generate a token' });
    }

    const user = await User.findOne({ where: { email } });
    const err: any = {
      status: httpStatus.UNAUTHORIZED,
      isPublic: true
    };
    if (password) {
      if (user && (await user.passwordMatches(password))) {
        return { user, accessToken: user.token() };
      }
      err.message = 'Incorrect email or password';
    } else if (refreshObject && refreshObject.userEmail === email) {
      if (moment(refreshObject.expires).isBefore()) {
        err.message = 'Invalid refresh token.';
      } else {
        return { user, accessToken: user.token() };
      }
    } else {
      err.message = 'Incorrect email or refreshToken';
    }
    throw new APIError(err);
  }

  static list({ query }: { query: any }) {
    return listData(User, query, ALLOWED_FIELDS);
  }

  static checkDuplicateEmail(error: any) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return new APIError({
        message: 'Validation Error',
        errors: [
          {
            field: 'email',
            location: 'body',
            messages: ['"email" already exists']
          }
        ],
        status: httpStatus.CONFLICT,
        isPublic: true,
        stack: error.stack
      });
    }
    return error;
  }

  static async oAuthLogin({ service, id, email, name, picture }: any) {
    const whereCondition = {
      [sequelize.Sequelize.Op.or]: [
        { [`services.${service}`]: id },
        { email }
      ]
    };
    
    const user = await User.findOne({ where: whereCondition });
    if (user) {
      user.services = { ...user.services, [service]: id };
      if (!user.name) {
        user.name = name;
      }
      if (!user.picture) {
        user.picture = picture;
      }
      return user.save();
    }
    const password = uuidv4();
    return User.create({
      services: { [service]: id },
      email,
      password,
      name,
      picture
    });
  }

  static async count(): Promise<number> {
    return User.count();
  }
}

const ALLOWED_FIELDS = ['id', 'name', 'email', 'picture', 'role', 'createdAt'];

// Initialize the model
User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 128]
      }
    },
    tempPassword: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [6, 128]
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 128]
      }
    },
    services: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    role: {
      type: DataTypes.ENUM(...roles),
      allowNull: false,
      defaultValue: 'user'
    },
    picture: {
      type: DataTypes.STRING,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    hooks: {
      beforeSave: async (user: User) => {
        if (user.changed('password')) {
          const rounds = env === 'test' ? 1 : 10;
          const hash = await bcrypt.hash(user.password, rounds);
          user.password = hash;
        } else if (user.changed('tempPassword') && user.tempPassword) {
          const rounds = env === 'test' ? 1 : 10;
          const hash = await bcrypt.hash(user.tempPassword, rounds);
          user.tempPassword = hash;
        }
      }
    }
  }
);

// Export model with additional properties
(User as any).ALLOWED_FIELDS = ALLOWED_FIELDS;
(User as any).roles = roles;

module.exports = User;
