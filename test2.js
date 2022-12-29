const request = require('request');

async function putData() {
  return new Promise((resolve, reject) => {
    request(
      {
        url: 'http://localhost:8581/api/accessories/ABC',
        method: 'PUT',
        headers: {
          accept: '*/*',
          Authorization: 'Bearer DEF',
          'Content-Type': 'application/json',
        },
        json: {
          characteristicType: 'On',
          value: true,
        },
      },
      (error, response, body) => {
        if (error) {
          reject(error);
        } else {
          resolve(response);
        }
      }
    );
  });
}

console.log('hi');
putData().then((response) => {
  console.log(response);
});
