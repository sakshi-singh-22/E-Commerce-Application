const NodeCache = require("node-cache");
const request = require("request");
const util = require("util");
const requestPromise = util.promisify(require("request-promise-native"));
require("dotenv").config();

const myCache = new NodeCache();
const key = "authToken";
const expirationSeconds = 7 * 24 * 60 * 60;
const apiBaseUrl = process.env.BASE_URL;
const customerId = process.env.CUSTOMER_ID;

function storeStringWithExpiration(key, value, expirationSeconds) {
  const expirationTime = expirationSeconds * 1000;
  myCache.set(key, value, expirationTime);

  setTimeout(() => {
    myCache.del(key);
    console.log(`Key '${key}' expired and was removed from the cache.`);
  }, expirationTime);
}

function getStringFromCache(key) {
  return myCache.get(key);
}

const getAuthToken = async () => {
  let authToken = getStringFromCache(key);
  if (authToken === undefined || authToken === null) {
    const options = {
      method: "GET",
      uri: `${apiBaseUrl}/auth/v1/authentication/token?country=IN&customerId=${customerId}&key=${process.env.BASE_64_PWD}&scope=NEW`,
      headers: {
        accept: "*/*",
      },
    };

    try {
      const response = await requestPromise(options);
      const token = JSON.parse(response.body)["token"];
      storeStringWithExpiration(key, token, expirationSeconds);
      authToken = token;
      console.log(myCache.get(key));
    } catch (error) {
      throw new Error(error);
    }
  } else {
    console.log(authToken);
  }
  return authToken;
};

const sendOtp = async (phoneNumber) => {
  const authToken = await getAuthToken();

  const options = {
    method: "POST",
    url: `${apiBaseUrl}/verification/v2/verification/send?countryCode=91&customerId=${customerId}&flowType=SMS&mobileNumber=${phoneNumber}`,
    headers: {
      authToken: authToken,
    },
  };

  console.log(options);

  return new Promise((resolve, reject) => {
    request(options, (error, response) => {
      if (error) {
        return reject({ message: "Unable to send OTP", error });
      }
      console.log(response.body);
      resolve(JSON.parse(response.body)["data"]);
    });
  });
};

const verifyOtp = async (verificationId, phoneNumber, otp) => {
  const authToken = await getAuthToken();
  const options = {
    method: "GET",
    url: `${apiBaseUrl}/verification/v2/verification/validateOtp?countryCode=91&mobileNumber=${phoneNumber}&verificationId=${verificationId}&customerId=${customerId}&code=${otp}`,
    headers: {
      authToken: authToken,
    },
  };

  console.log(options);

  return new Promise((resolve, reject) => {
    request(options, (error, response) => {
      if (error) {
        return reject({ message: "OTP verification failed", error });
      }
      resolve(JSON.parse(response.body)["data"]);
    });
  });
};

module.exports = {
  sendOtp,
  verifyOtp,
};
