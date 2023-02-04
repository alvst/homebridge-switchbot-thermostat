let Service, Characteristic;
const packageJson = require('./package.json');
const request = require('request');

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
  console.log(
    'Device Restarted. Please set thermostat lowest temperature and Off.'
  );
  this.name = config.name;
  this.log = log;

  this.bearerToken = config.thermostat_configuration['bearerToken'];
  this.power_switch_accessory_uuid =
    config.thermostat_configuration['power_switch_accessory_uuid'];
  this.temp_up_accessory_uuid =
    config.thermostat_configuration['temp_up_accessory_uuid'];
  this.temp_down_accessory_uuid =
    config.thermostat_configuration['temp_down_accessory_uuid'];

  this.validStates = config.validStates || [0, 1, 2, 3];

  this.requestArray = [
    'targetHeatingCoolingState',
    'targetTemperature',
    // 'coolingThresholdTemperature',
    // 'heatingThresholdTemperature',
  ];

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
    console.log(this.counter++);
    this.processQueue();
  }

  processQueue() {
    if (this.isProcessing) {
      return;
    }
    if (this.queue.length === 0) {
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

  testing: async function (value, callback) {
    this.queue.add(async () => {
      console.log('testing');
      this.setTargetTemperature(value, callback);
      // await this.sleep(5000);
      console.log('testing done');
    });
  },

  changePowerState: async function (value, callback) {
    console.log(value);
    this.queue.add(async () => {
      console.log('testing');
      this.setTargetHeatingCoolingState(value, callback);
      await this.sleep(5000);
      console.log('testing done');
    });
  },

  setTargetHeatingCoolingState: function (value, callback) {
    console.log(
      'setting power state to %s from setTargetHeatingCoolingState function',
      value
    );

    this.service
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .updateValue(value);

    this.sendCurl(this.power_switch_accessory_uuid);

    // callback();
  },

  sleep: async function (milliseconds) {
    this.log('Pausing for ' + milliseconds + ' milliseconds');
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  },

  convertToFahrenheit: function (value) {
    return (value * 9) / 5 + 32;
  },

  setTargetTemperature: async function (value, callback) {
    let count = 0;
    if (
      this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .value == 0
    ) {
      this.sendCurl(this.power_switch_accessory_uuid);

      this.service
        .getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .updateValue(3);

      this.log(
        'Temp Change Requested. Power State toggled to AUTO from setTargetTemperature function'
      );

      await this.sleep(5000);
    }

    startTempFahrenheit = this.convertToFahrenheit(value);
    console.log('startTempFahrenheit', startTempFahrenheit);
    console.log(
      'this.service.getCharacteristic(Characteristic.CurrentTemperature).value',
      this.service.getCharacteristic(Characteristic.CurrentTemperature).value
    );

    if (
      this.service.getCharacteristic(Characteristic.CurrentTemperature).value <
      value
    ) {
      console.log('increasing temp');
      for (
        let index = this.service.getCharacteristic(
          Characteristic.CurrentTemperature
        ).value;
        index < value;
        index = index + this.minStep
      ) {
        console.log(index !== 22.5);
        console.log(index);
        if (index !== 22.5) {
          count++;

          console.log(`increasing temp ${index + this.minStep} / ${value}`);
          this.sendCurl(this.temp_up_accessory_uuid);
        } else {
          console.log('skipping 22.5');
        }
      }
    } else {
      console.log('decreasing temp');
      for (
        let index = this.service.getCharacteristic(
          Characteristic.CurrentTemperature
        ).value;
        index > value;
        index = index - this.minStep
      ) {
        if (index !== 22.5) {
          count++;
          console.log(`decreasing temp ${index + this.minStep} / ${value}`);
          await this.sendCurl(this.temp_down_accessory_uuid);
        } else {
          console.log('skipping 22.5');
        }
      }
    }
    this.service
      .getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(value);
    console.log(count + 1);
    await this.sleep(5000 * (count + 1));
    console.log('done sleeping');

    // callback();
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

    this.service
      .getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(this.minTemp);

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
      .on('set', this.testing.bind(this))
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
