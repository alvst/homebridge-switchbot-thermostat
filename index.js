let Service, Characteristic;
const packageJson = require('./package.json');
const request = require('request');
const fs = require('fs');

const filePath = '/tmp/cache.json';

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory(
    'homebridge-switchbot-thermostat',
    'Thermostat',
    Thermostat
  );
};

function Thermostat(log, config) {
  this.log = log;
  this.name = config.name;

  this.bearerToken = config.thermostat_configuration['bearerToken'];
  this.power_switch_accessory_uuid =
    config.thermostat_configuration['power_switch_accessory_uuid'];
  this.temp_up_accessory_uuid =
    config.thermostat_configuration['temp_up_accessory_uuid'];
  this.temp_down_accessory_uuid =
    config.thermostat_configuration['temp_down_accessory_uuid'];

  this.validStates = [0, 3];

  this.manufacturer = config.manufacturer || packageJson.author;
  this.serial = 'n/a';
  this.model = config.model || packageJson.name;

  this.temperatureDisplayUnits = config.temperatureDisplayUnits || 0;
  this.maxTemp = config.thermostat_details.maxTemp || 30;
  this.minTemp = config.thermostat_details.minTemp || 15;
  this.minStep = config.thermostat_details.temp_interval || 0.5;

  this.service = new Service.Thermostat(this.name);

  this.queue = new Queue();

  return;
}

class Queue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.counter = 0;
  }

  add(fn) {
    this.queue.push(fn);
    this.counter++;
    this.processQueue();
  }

  processQueue() {
    if (this.isProcessing) {
      return;
    }
    if (this.queue.length === 0) {
      console.log('Homebridge Thermostat queue is empty');
      return;
    }
    this.isProcessing = true;
    const fn = this.queue.shift();
    fn().finally(() => {
      this.isProcessing = false;
      this.processQueue();
    });
  }
}

Thermostat.prototype = {
  identify: function (callback) {
    this.log('Identify requested!');
    callback();
  },

  checkCache: async function () {
    let powerStateOn = 0;
    let currentTemp = 22;

    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      this.log('Cache file exists, reading data...');
      const fileData = JSON.parse(data);
      // this.log(fileData);
      powerStateOn = fileData.powerStateOn;
      currentTemp = fileData.currentTemp;
      this.log(
        `Your Thermostat is currently ${powerStateOn > 0.5 ? 'on' : 'off'}.`
      );
      this.log(
        `${
          powerStateOn > 0.5
            ? `Your thermostat is currently set to ${currentTemp} degrees.`
            : `When your device is powered on, your Thermostat will be set to ${currentTemp} degrees.`
        }`
      );
    } catch (err) {
      this.log('Cache file does not exist, creating a new file...');
      const newData = {
        powerStateOn: powerStateOn,
        currentTemp: currentTemp,
      };
      fs.writeFileSync(filePath, JSON.stringify(newData));
      this.log('Cache file created successfully');
    }

    this.service
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .updateValue(powerStateOn);

    this.service
      .getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(currentTemp);
  },

  updateCache: function (key, value) {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        this.log('File does not exist, creating a new file...');
        const newData = {
          powerStateOn: 0,
          currentTemp: 22.5,
        };
        fs.writeFile(filePath, JSON.stringify(newData), (err) => {
          if (err) throw err;
          this.log('File created successfully');
        });
      } else {
        this.log('Updating Cache...');
        const fileData = JSON.parse(data);
        fileData[key] = value;
        fs.writeFile(filePath, JSON.stringify(fileData), (err) => {
          if (err) throw err;
          this.log('Cache successfully updated');
          // this.log(fileData);
        });
      }
    });
  },

  changeTempState: async function (value, callback) {
    let startValue = this.service.getCharacteristic(
      Characteristic.CurrentTemperature
    ).value;

    this.service
      .getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(value);
    callback();

    this.queue.add(async () => {
      this.log('queuing for temp change');

      await this.setTargetTemperature(value, startValue, callback);
      this.log('done; sleeping for temp change');
    });
  },

  changePowerState: async function (value, callback) {
    let startValue = this.service.getCharacteristic(
      Characteristic.TargetHeatingCoolingState
    ).value;

    // this.log(value);
    this.service
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .updateValue(value);
    callback();

    this.queue.add(async () => {
      this.log('queuing for power state change');

      await this.setTargetHeatingCoolingState(value, startValue, callback);
      await this.sleep(5000);

      this.log('done; sleeping for power state change');
    });
  },

  setTargetHeatingCoolingState: async function (value, startValue, callback) {
    if (value !== startValue) {
      this.log(
        'Setting power state to %s from setTargetHeatingCoolingState function',
        value
      );

      this.sendCurl(this.power_switch_accessory_uuid);

      this.updateCache('powerStateOn', value);
    } else {
      this.log(
        "Power state is already %s. The thermostat's power state was likely requested to be changed by a an automation. No change has been made.",
        value
      );
    }
  },

  sleep: async function (milliseconds) {
    this.log('Pausing for ' + milliseconds + ' milliseconds');
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  },

  convertToFahrenheit: function (value) {
    return (value * 9) / 5 + 32;
  },

  setTargetTemperature: async function (value, startValue, callback) {
    let count = 0;
    let startPowerState = this.service.getCharacteristic(
      Characteristic.TargetHeatingCoolingState
    ).value;

    // this.log('start value C', startValue);

    this.updateCache(
      'currentTemp',
      this.service.getCharacteristic(Characteristic.CurrentTemperature).value
    );

    if (startPowerState == 0) {
      this.sendCurl(this.power_switch_accessory_uuid);

      this.log('Temporarily turning thermostat ON to change temperature');
      // this.log('from setTargetTemperature function');

      this.log('This is likely triggered by an automation.');

      await this.sleep(5000);
    }

    // this.log(
    //   'this.service.getCharacteristic(Characteristic.CurrentTemperature).value',
    //   startValue
    // );

    if (startValue < value) {
      this.log('Increasing temp');
      for (
        let index = startValue;
        index < value;
        index = index + this.minStep
      ) {
        if (index !== 17.5 && index !== 22.5 && index !== 27.5) {
          count++;
          this.log(`increasing temp ${index + this.minStep} / ${value}`);
          this.sendCurl(this.temp_up_accessory_uuid);
        } else {
          this.log(
            `Skipping ${value} because it is 22.5 or 17.5 or 27.5 which is a duplicate in Fahrenheit temperature`
          );
        }
      }
    } else {
      this.log('Decreasing temp');
      for (
        let index = startValue;
        index > value;
        index = index - this.minStep
      ) {
        if (index !== 17.5 && index !== 22.5 && index !== 27.5) {
          count++;
          this.log(`Decreasing temp ${index + this.minStep} / ${value}`);
          await this.sendCurl(this.temp_down_accessory_uuid);
        } else {
          this.log(
            `Skipping ${value} because it is 22.5 or 17.5 or 27.5 which is a duplicate in Fahrenheit temperature`
          );
        }
      }
    }

    // this.log(count + 1);
    await this.sleep(5000 * (count + 1));
    this.log('Done; sleeping from setTargetTemperature function');

    if (startPowerState == 0) {
      this.sendCurl(this.power_switch_accessory_uuid);

      this.log(
        'Undoing the temporary power On state change from setTargetTemperature function'
      );

      this.log('This change was likely triggered by an automation.');

      await this.sleep(5000);
    }
  },

  sendCurl: async function (device) {
    new Promise((resolve, reject) => {
      request(
        {
          url: `http://localhost:8581/api/accessories/${device}`,
          method: 'PUT',
          headers: {
            accept: '*/*',
            Authorization: `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json',
          },
          json: {
            characteristicType: 'On',
            value: true,
          },
        },
        (error, response, body) => {
          if (error) {
            this.log(error);
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  },

  getServices: function () {
    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial)
      .setCharacteristic(Characteristic.FirmwareRevision, this.firmware);

    // Needed
    this.service
      .getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .updateValue(1);

    this.checkCache();

    this.service
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .on('set', this.changePowerState.bind(this));

    this.service
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .setProps({
        validValues: this.validStates,
      });

    // Needed
    this.service
      .getCharacteristic(Characteristic.TargetTemperature)
      .on('set', this.changeTempState.bind(this))
      .setProps({
        minValue: this.minTemp,
        maxValue: this.maxTemp,
        minStep: this.minStep,
      });

    // Needed
    this.service.getCharacteristic(Characteristic.CurrentTemperature).setProps({
      minValue: -600,
      maxValue: 600,
    });

    return [this.informationService, this.service];
  },
};
