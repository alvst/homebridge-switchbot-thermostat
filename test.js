import fetch from 'node-fetch';

async function putData() {
  const response = await fetch('http://localhost:8581/api/accessories/ABC', {
    method: 'PUT',
    headers: {
      accept: '*/*',
      Authorization: 'Bearer XXX',
      'Content-Type': 'application/json',
    },
    // body: '{\n  "characteristicType": "On",\n"value": true\n}',
    body: JSON.stringify({
      characteristicType: 'On',
      value: true,
    }),
  });

  return response;
}

console.log('hi');
putData().then((data) => {
  console.log(data); // JSON data parsed by `data.json()` call
});
