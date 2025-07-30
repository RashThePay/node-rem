import { getPageQuery, queryPromise } from '../../api/utils/Utils';
const { Op } = require('sequelize');

// transform every record (only respond allowed fields and "&fields=" in query)
export function transformData(context: any, query: any, allowedFields: string[]) {
  const queryParams = getPageQuery(query);
  const transformed: any = {};
  allowedFields.forEach((field: string) => {
    if (queryParams && queryParams.fields && queryParams.fields.indexOf(field) < 0) {
      return; // if "fields" is set => only include those fields, return if not.
    }
    transformed[field] = context[field];
  });
  return transformed;
}

// Convert query parameters to Sequelize where clause
const getSequelizeQuery = (query: any, allowedFields: string[]) => {
  const where: any = {};
  
  // Only process fields that are in allowedFields
  Object.keys(query).forEach(key => {
    if (allowedFields.includes(key)) {
      const value = query[key];
      
      // Handle different query types
      if (typeof value === 'string') {
        // Simple equality
        where[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        // Handle MongoDB-style operators
        if (value.$regex) {
          where[key] = { [Op.iLike]: `%${value.$regex}%` };
        } else if (value.$in) {
          where[key] = { [Op.in]: value.$in };
        } else if (value.$gte) {
          where[key] = { [Op.gte]: value.$gte };
        } else if (value.$lte) {
          where[key] = { [Op.lte]: value.$lte };
        } else if (value.$gt) {
          where[key] = { [Op.gt]: value.$gt };
        } else if (value.$lt) {
          where[key] = { [Op.lt]: value.$lt };
        } else if (value.$ne) {
          where[key] = { [Op.ne]: value.$ne };
        }
      }
    }
  });
  
  return where;
};

// example: URL queryString = '&include=user:id,name&include=category:id,name'
// => queryArray = ['user:id,name', 'category:id,name']
// return array of fields we want to include (Sequelize spec)
const getIncludeArray = (queryArray: [], allowedFields: string[]) => {
  if (!queryArray) {
    return [];
  }
  const ret: any[] = [];
  queryArray.map((str: string = '') => {
    const arr = str.split(':');
    // only include fields belong to "allowedFields"
    if (arr && arr.length === 2 && allowedFields.indexOf(arr[0]) >= 0) {
      ret.push({
        association: arr[0],
        attributes: arr[1].split(',')
      });
    }
  });
  return ret;
};

const buildSequelizeOptions = (query: any, allowedFields: string[]) => {
  const { page = 1, perPage = 30, limit, offset, sort } = getPageQuery(query);
  const where = getSequelizeQuery(query, allowedFields);
  
  const options: any = {
    where
  };

  // Handle sorting
  if (sort) {
    const sortFields = Object.keys(sort).map(key => [key, sort[key] === -1 ? 'DESC' : 'ASC']);
    options.order = sortFields;
  }

  // Handle pagination - 2 ways: offset & limit OR page & perPage
  if (query.perPage) {
    options.offset = perPage * (page - 1);
    options.limit = perPage;
  }
  if (typeof offset !== 'undefined') {
    options.offset = offset;
  }
  if (typeof limit !== 'undefined') {
    options.limit = limit;
  }

  // Handle includes (equivalent to populate in MongoDB)
  const queryInclude = Array.isArray(query.include) ? query.include : [query.include];
  const includeArr = getIncludeArray(queryInclude, allowedFields);
  if (includeArr.length > 0) {
    options.include = includeArr;
  }

  return options;
};

// list data with pagination support
// return a promise for chaining. (e.g. list then transform)
export function listData(Model: any, query: any, allowedFields: string[]) {
  const options = buildSequelizeOptions(query, allowedFields);
  
  const result = Model.findAll(options);
  return queryPromise(result);
}
