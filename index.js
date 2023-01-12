let Service, Characteristic;
const packageJson = require('./package.json');
const request = require('request');

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory(
    'homebridge-web-thermostat',
    'Thermostat',
    Thermostat
  );
};

function Thermostat(log, config) {
  this.log(
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

  this.currentTemperature = 20;
  this.poweredOn = false;

  this.service = new Service.Thermostat(this.name);

  // this.service = new this.api.hap.Service.Switch(this.name);

  // // link methods used when getting or setting the state of the service
  // this.service
  //   .getCharacteristic(this.api.hap.Characteristic.On)
  //   .onGet(this.getOnHandler.bind(this)) // bind to getOnHandler method below
  //   .onSet(this.setOnHandler.bind(this)); // bind to setOnHandler method below
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
    this.log('Toggled power state to %s', this.poweredOn);
    data = JSON.parse(data);
    data.table.powerState = !this.poweredOn;
    new Promise((resolve, reject) => {
      request(
        {
          url: `http://localhost:8581/api/accessories/${this.power_switch_accessory_uuid}`,
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
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
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

  setTargetTemperature: async function (value) {
    this.log(`Changing Temp from ${this.currentTemperature} to ${value}`);
    this.log(`setTargetTemperature: ${value}`);
    this.log(`Current Temperature: ${this.currentTemperature}`);
    this.log(`temp_up_accessory_uuid : ${this.temp_up_accessory_uuid}`);
    this.log('temp_down_accessory_uuid: ' + this.temp_down_accessory_uuid);
    this.log(
      `power_switch_accessory_uuid: ${this.power_switch_accessory_uuid}`
    );
    this.log(`bearerToken: ${this.bearerToken}`);

    console.log(
      this.service
        .getCharacteristic(Characteristic.CurrentTemperature)
        .updateValue(value)
    );

    console.log(Characteristic.CurrentTemperature);

    if (this.currentTemperature < value) {
      this.log('Power state currently %s', this.poweredOn);
      console.log(this.poweredOn);
      if (this.poweredOn === false) {
        console.log('power state is false | Toggling on');

        // curl for power on to auto
        new Promise((resolve, reject) => {
          request(
            {
              url: `http://localhost:8581/api/accessories/${this.power_switch_accessory_uuid}`,
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
                reject(error);
              } else {
                resolve(response);
              }
            }
          );
        });
        this.log('curl executed to power device on');
        this.service
          .getCharacteristic(Characteristic.TargetHeatingCoolingState)
          .updateValue(3);
        for (
          let index = 0;
          index < value - this.currentTemperature;
          index = index + 0.5
        ) {
          this.log(
            `increasing temp ${index} / ${value - this.currentTemperature}`
          );
          new Promise((resolve, reject) => {
            request(
              {
                url: `http://localhost:8581/api/accessories/${this.temp_up_accessory_uuid}`,
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
                  reject(error);
                } else {
                  resolve(response);
                }
              }
            );
          });

          this.log('curl executed to increase temp');
        }
        this.log(
          `Bot sent ${
            value - this.currentTemperature
          } requests to increase temp`
        );
        this.service
          .getCharacteristic(Characteristic.CurrentTemperature)
          .updateValue(value);
      }
    } else {
      this.log('Toggled power state to %s', this.poweredOn);
      if (this.poweredOn == false) {
        // curl for power on to auto
        this.service
          .getCharacteristic(Characteristic.TargetHeatingCoolingState)
          .updateValue(3);

        for (
          let index = 0;
          index < this.currentTemperature - value;
          index = index + 0.5
        ) {
          this.log(
            `decreasing temp ${index} / ${this.currentTemperature - value}`
          );
          new Promise((resolve, reject) => {
            request(
              {
                url: `http://localhost:8581/api/accessories/${this.temp_down_accessory_uuid}`,
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
                  reject(error);
                } else {
                  resolve(response);
                }
              }
            );
          });
          this.log('curl executed to decrease temp');
          // curl for decreasing the temp
        }
        this.service
          .getCharacteristic(Characteristic.CurrentTemperature)
          .updateValue(value);
      }
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
      .updateValue(1);

    this.service
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .setProps({
        validValues: this.validStates,
      });

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
