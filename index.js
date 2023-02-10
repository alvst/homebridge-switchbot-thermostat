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
      console.log('queue is empty');
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

  changeTempState: async function (value, callback) {
    this.queue.add(async () => {
      this.log('queuing for temp change');
      // this.service
      //   .getCharacteristic(Characteristic.CurrentTemperature)
      //   .updateValue(value);
      // callback();

      await this.setTargetTemperature(value, callback);
      // await this.sleep(5000);
      this.log('done; sleeping for temp change');
    });
  },

  changePowerState: async function (value, callback) {
    this.log(value);
    this.queue.add(async () => {
      this.log('queuing for power state change');

      callback();
      await this.setTargetHeatingCoolingState(value, callback);
      await this.sleep(5000);
      this.log('done; sleeping for power state change');
    });
  },

  setTargetHeatingCoolingState: async function (value, callback) {
    this.log(
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
    let startPowerState = this.service.getCharacteristic(
      Characteristic.TargetHeatingCoolingState
    ).value;
    let startValue = this.service.getCharacteristic(
      Characteristic.CurrentTemperature
    ).value;

    this.service
      .getCharacteristic(Characteristic.CurrentTemperature)
      .updateValue(value);
    callback();

    if (startPowerState == 0) {
      this.sendCurl(this.power_switch_accessory_uuid);

      this.log(
        'temporarily turning thermostat on to change temperature from setTargetTemperature function'
      );

      await this.sleep(5000);
    }

    startTempFahrenheit = this.convertToFahrenheit(value);
    this.log('startTempFahrenheit', startTempFahrenheit);
    this.log(
      'this.service.getCharacteristic(Characteristic.CurrentTemperature).value',
      startValue
    );

    if (startValue < value) {
      this.log('increasing temp');
      for (
        let index = startValue;
        index < value;
        index = index + this.minStep
      ) {
        // this.log(index !== 22.5);
        this.log(index);
        if (index !== 22.5) {
          count++;

          this.log(`increasing temp ${index + this.minStep} / ${value}`);
          this.sendCurl(this.temp_up_accessory_uuid);
        } else {
          this.log('skipping 22.5');
        }
      }
    } else {
      this.log('decreasing temp');
      for (
        let index = startValue;
        index > value;
        index = index - this.minStep
      ) {
        if (index !== 22.5) {
          count++;
          this.log(`decreasing temp ${index + this.minStep} / ${value}`);
          await this.sendCurl(this.temp_down_accessory_uuid);
        } else {
          this.log('skipping 22.5');
        }
      }
    }

    this.log(count + 1);
    await this.sleep(5000 * (count + 1));
    this.log('done; sleeping from setTargetTemperature function');

    if (startPowerState == 0) {
      this.sendCurl(this.power_switch_accessory_uuid);

      this.log(
        'undoing the temporary power On state change from setTargetTemperature function'
      );

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
