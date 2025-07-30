export {};
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/sequelize');
import { transformData, listData } from '../../api/utils/ModelUtils';

class UserNote extends Model {
  public id!: number;
  public userId!: number;
  public title!: string;
  public note!: string;
  public likes!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  transform(options: { query?: any } = {}) {
    const { query = {} } = options;
    return transformData(this, query, ALLOWED_FIELDS);
  }

  // Static methods
  static list({ query }: { query: any }) {
    return listData(UserNote, query, ALLOWED_FIELDS);
  }
}

const ALLOWED_FIELDS = ['id', 'userId', 'title', 'note', 'likes', 'createdAt'];

// Initialize the model
UserNote.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ''
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    likes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    sequelize,
    modelName: 'UserNote',
    tableName: 'user_notes'
  }
);

// Export model with additional properties
(UserNote as any).ALLOWED_FIELDS = ALLOWED_FIELDS;

module.exports = UserNote;
