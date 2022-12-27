import fetch from 'node-fetch';

async function putData() {
  const response = await fetch(
    'http://localhost:8581/api/accessories/c1fdcb0e8c1e12f22a19012e925d0dc1b116ac2d5be3116ee0b5ae57c23c8b49',
    {
      method: 'PUT',
      headers: {
        accept: '*/*',
        Authorization:
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFsdmllIiwibmFtZSI6ImFsdmllIiwiYWRtaW4iOnRydWUsImluc3RhbmNlSWQiOiJiYjBjMmY2NzExYWZlYjYwM2Q0NmNmNTY2YjNlZmFkMjljMzNhNmM1MGQ1YTkzMDJjYjhiNzAxMTNmNzFhODNhIiwiaWF0IjoxNjcwMDkzNTQ0LCJleHAiOjE2NzAxMjIzNDR9.qtDVyPrVvmORIeJ4v7ue3NEWYvqfcvGXPmQSLS-9Y6I',
        'Content-Type': 'application/json',
      },
      // body: '{\n  "characteristicType": "On",\n"value": true\n}',
      body: JSON.stringify({
        characteristicType: 'On',
        value: true,
      }),
    }
  );

  return response;
}

console.log('hi');
putData().then((data) => {
  console.log(data); // JSON data parsed by `data.json()` call
});
