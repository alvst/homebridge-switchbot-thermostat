import requests

headers = {
    'accept': '*/*',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFsdmllIiwibmFtZSI6ImFsdmllIiwiYWRtaW4iOnRydWUsImluc3RhbmNlSWQiOiJiYjBjMmY2NzExYWZlYjYwM2Q0NmNmNTY2YjNlZmFkMjljMzNhNmM1MGQ1YTkzMDJjYjhiNzAxMTNmNzFhODNhIiwiaWF0IjoxNjcwMDkzNTQ0LCJleHAiOjE2NzAxMjIzNDR9.qtDVyPrVvmORIeJ4v7ue3NEWYvqfcvGXPmQSLS-9Y6I',
    # Already added when you pass json= but not when you pass data=
    # 'Content-Type': 'application/json',
}

json_data = {
    'characteristicType': 'On',
    'value': True,
}

response = requests.put('http://localhost:8581/api/accessories/c1fdcb0e8c1e12f22a19012e925d0dc1b116ac2d5be3116ee0b5ae57c23c8b49', headers=headers, json=json_data)


print(response.status_code)
print(response)
# Note: json_data will not be serialized by requests
# exactly as it was in the original request.
#data = '{\n  "characteristicType": "On",\n"value": true\n}'
#response = requests.put('http://localhost:8581/api/accessories/', headers=headers, data=data)

response = requests.put('http://localhost:8581/api/accessories/c1fdcb0e8c1e12f22a19012e925d0dc1b116ac2d5be3116ee0b5ae57c23c8b49', headers=headers, json=json_data)


print(response.status_code)