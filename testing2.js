const fs = require('fs');
const data = {
  temp: '10',
  power_state: 'auto',
};
const file_path = './homebridge-web-thermostat2/db.json';
writeFile(file_path, data);
async function writeFile(filename, writedata) {
  try {
    await fs.promises.writeFile(
      filename,
      JSON.stringify(writedata, null, 4),
      'utf8'
    );
    console.log('data is written successfully in the file');
  } catch (err) {
    console.log('not able to write data in the file ');
    fs.mkdirSync('./homebridge-web-thermostat2');
    fs.writeFile(file_path, '', function (err) {
      if (err) throw err;
      console.log('File is created successfully.');
    });
    writeFile(file_path, writedata);
  }
}
