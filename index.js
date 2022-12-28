let Service, Characteristic;
const packageJson = require('./package.json');
const request = require('request');
const ip = require('ip');
const http = require('http');
const fs = require('fs');

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory(
    'homebridge-web-thermostat2',
    'Thermostat',
    Thermostat
  );
};

function Thermostat(log, config) {
  this.name = config.name;
  this.log = log;
  console.log('try/catch');

  // console.log(config.thermostat_configuration.bearerToken);
  // console.log(config.thermostat_configuration);
  // console.log(config.thermostat_configuration['bearerToken']);

  // console.log(config['thermostat_configuration'].bearerToken);

  // this.bearerToken = config['thermostat_configuration'].bearerToken;
  // console.log(this.bearerToken);
  this.power_switch_accessory_uuid =
    config.thermostat_configuration['power_switch_accessory_uuid'];
  this.temp_up_accessory_uuid =
    config.thermostat_configuration['temp_up_accessory_uuid'];
  this.temp_down_accessory_uuid =
    config.thermostat_configuration['temp_down_accessory_uuid'];

  // let configuration = config.thermostat_configuration;
  // let power_switch_accessory_uuid =
  //   config.thermostat_configuration.power_switch_accessory_uuid;
  // let temp_up_accessory_uuid = configuration.temp_up_accessory_uuid;
  // let temp_down_accessory_uuid = configuration.temp_down_accessory_uuid;

  this.validStates = config.validStates || [0, 1, 2, 3];

  this.requestArray = [
    // 'targetHeatingCoolingState',
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
  this.minStep = config.thermostat_details.minStep || 0.5;

  this.poweredOn = false;

  console.log('Current Temperature: ');

  this.currentTemperature = 20;
  this.poweredOn = false;

  this.service = new Service.Thermostat(this.name);
  return;
}

Thermostat.prototype = {
  identify: function (callback) {
    this.log('Identify requested!');
    callback();
  },

  _getStatus: function (callback) {
    const url = this.apiroute + '/status';
    this.log.debug('Getting status: %s', url);

    this._httpRequest(
      url,
      '',
      this.http_method,
      function (error, response, responseBody) {
        if (error) {
          this.log.warn('Error getting status: %s', error.message);
          this.service
            .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
            .updateValue(new Error('Polling failed'));
          callback(error);
        } else {
          this.log.debug('Device response: %s', responseBody);
          try {
            const json = JSON.parse(responseBody);
            console.log('abc123');
            this.service
              .getCharacteristic(Characteristic.TargetTemperature)
              .updateValue(json.targetTemperature);
            this.log.debug(
              'Updated TargetTemperature to: %s',
              json.targetTemperature
            );
            this.service
              .getCharacteristic(Characteristic.CurrentTemperature)
              .updateValue(json.currentTemperature);
            this.log.debug(
              'Updated CurrentTemperature to: %s',
              json.currentTemperature
            );
            this.service
              .getCharacteristic(Characteristic.TargetHeatingCoolingState)
              .updateValue(json.targetHeatingCoolingState);
            this.log.debug(
              'Updated TargetHeatingCoolingState to: %s',
              json.targetHeatingCoolingState
            );
            this.service
              .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
              .updateValue(json.currentHeatingCoolingState);
            this.log.debug(
              'Updated CurrentHeatingCoolingState to: %s',
              json.currentHeatingCoolingState
            );
            if (this.temperatureThresholds) {
              this.service
                .getCharacteristic(Characteristic.CoolingThresholdTemperature)
                .updateValue(json.coolingThresholdTemperature);
              this.log.debug(
                'Updated CoolingThresholdTemperature to: %s',
                json.coolingThresholdTemperature
              );
              this.service
                .getCharacteristic(Characteristic.HeatingThresholdTemperature)
                .updateValue(json.heatingThresholdTemperature);
              this.log.debug(
                'Updated HeatingThresholdTemperature to: %s',
                json.heatingThresholdTemperature
              );
            }
            if (this.currentRelativeHumidity) {
              this.service
                .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                .updateValue(json.currentRelativeHumidity);
              this.log.debug(
                'Updated CurrentRelativeHumidity to: %s',
                json.currentRelativeHumidity
              );
            }
            callback();
          } catch (e) {
            this.log.warn('Error parsing status: %s', e.message);
          }
        }
      }.bind(this)
    );
  },

  togglePowerState: function (callback) {
    // write to homebridge-web-thermostat2/db.json to change table, powerState to !powerState
    this.log('Toggled power state to %s', this.poweredOn);
    let data = fs.readFileSync('homebridge-web-thermostat2/db.json');
    data = JSON.parse(data);

    // Hit API with CURL

    // Update the powerState property
    data.table.powerState = !this.poweredOn;

    // Write the updated JSON to the file
    fs.writeFileSync(
      'homebridge-web-thermostat2/db.json',
      JSON.stringify(data)
    );
  },

  changeTemp: function (newTemp) {
    // write to homebridge-web-thermostat2/db.json to change table, powerState to !powerState
    this.log('Toggled power state to %s', this.poweredOn);
    this.log(changeType);
    if ((this.poweredOn = false)) {
      // curl for power on
    }
    let changeAmount = this.currentTemperature - newTemp;
    for (let index = 0; index < changeAmount; index++) {
      if (changeType > 0) {
        // curl for increase
        console.log('increase ');
      } else {
        // curl for decrease
        console.log('decrease ');
      }
    }
  },

  _httpHandler: function (characteristic, value) {
    switch (characteristic) {
      // case 'targetHeatingCoolingState': {
      //   this.service
      //     .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      //     .updateValue(value);
      //   this.log('Updated %s to: %s', characteristic, value);
      //   break;
      // }
      case 'targetTemperature': {
        this.service
          .getCharacteristic(Characteristic.TargetTemperature)
          .updateValue(value);
        this.log('Updated %s to: %s', characteristic, value);
        break;
      }
      // case 'coolingThresholdTemperature': {
      //   this.service
      //     .getCharacteristic(Characteristic.CoolingThresholdTemperature)
      //     .updateValue(value);
      //   this.log('Updated %s to: %s', characteristic, value);
      //   break;
      // }
      // case 'heatingThresholdTemperature': {
      //   this.service
      //     .getCharacteristic(Characteristic.HeatingThresholdTemperature)
      //     .updateValue(value);
      //   this.log('Updated %s to: %s', characteristic, value);
      //   break;
      // }
      default: {
        this.log.warn(
          'Unknown characteristic "%s" with value "%s"',
          characteristic,
          value
        );
      }
    }
  },

  setTargetTemperature: function (value) {
    console.log('setTargetTemperature: ' + value);
    console.log(this.currentTemperature);
    if (value > this.currentTemperature) {
      console.log('this.currentTemperature increase');
      this.changeTemp(value);
    } else {
      console.log('this.currentTemperature decrease');

      this.changeTemp(value);
    }
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
      .updateValue(this.temperatureDisplayUnits);

    // Needed
    this.service
      .getCharacteristic(Characteristic.TargetTemperature)
      .on('set', this.setTargetTemperature.bind(this))
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
