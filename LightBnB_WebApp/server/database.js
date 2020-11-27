cconst properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');
console.log(Pool);

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
})
/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  const values = [email];
  const query = `SELECT * FROM users WHERE email = $1`;
  return pool.query(query, values)
    .then(res => res.rows ? res.rows[0] : null)
    .catch(err => console.error('query error', err.stack));
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  const values = [id];
  const query = 'SELECT * FROM users WHERE id = $1';

  return pool.query(query, values)
    .then(res => res.rows ? res.rows[0] : null)
    .catch(err => console.error('query error', err.stack))
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  console.log(user.name)
  const values = [user.name, user.email, user.password];
  const query = 'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *';

  return pool.query(query, values)
    .then(res => res.rows[0])
    .catch(err => console.error('query error', err.stack))
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const values = [guest_id, limit];
  const query = `
  SELECT properties.*, reservations.*, avg(rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id 
  WHERE reservations.guest_id = $1
  AND reservations.end_date < now()::date
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`;

  return pool.query(query, values)
    .then(res => {
      console.log(res.rows[0])
      return res.rows
    })
    .catch(err => console.error('query error', err.stack))
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  const values = [];
  let query = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;
  
  if (options.city) {
    values.push(`%${options.city}%`);
    query += `WHERE city LIKE $${values.length} `;
  }

  if (options.owner_id) {
    values.push(`%${options.owner_id}%`);
    query += ` AND owner_id = $${values.length}`;
  }

  if (options.minimum_price_per_night || options.maximum_price_per_night) {
    values.push(parseInt(`${options.minimum_price_per_night * 100}`));
    const minParam = values.length;
    values.push(parseInt(`${options.maximum_price_per_night * 100}`));
    const maxParam = values.length;
    query += ` AND cost_per_night BETWEEN $${minParam} AND $${maxParam}`;
  }

  if (options.minimum_rating) {
    values.push(Number(options.minimum_rating));
    query += ` AND rating >= $${values.length}`;
  }
  
  values.push(limit);
  query += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${values.length};
  `;
  //console.log(query, values);
  return pool.query(query, values)
    .then(res => res.rows)
    .catch(err => console.error('query error', err.stack));
}
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const values = [property.owner_id, property.title, property.description, property.thumbnail_photo_url,
    property.cover_photo_url, property.cost_per_night, property.street, property.city, property.province,
    property.post_code, property.country, property.parking_spaces, property.number_of_bathrooms,
    property.number_of_bedrooms];
  const query = `INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, 
    cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, 
    number_of_bedrooms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`;
  
  return pool.query(query, values)
    .then(res => res.rows)
    .catch(err => console.error('query error', err.stack));
}
exports.addProperty = addProperty;
