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

  // let configuration = config.thermostat_configuration;
  // let power_switch_accessory_uuid =
  //   config.thermostat_configuration.power_switch_accessory_uuid;
  // let temp_up_accessory_uuid = configuration.temp_up_accessory_uuid;
  // let temp_down_accessory_uuid = configuration.temp_down_accessory_uuid;

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
  this.minStep = config.thermostat_details.minStep || 0.5;

  this.service = new Service.Thermostat(this.name);

  return;
}

Thermostat.prototype = {
  identify: function (callback) {
    this.log('Identify requested!');
    callback();
  },

  setTargetHeatingCoolingState: function (value, callback) {
    console.log(
      'setting power state to %s from setTargetHeatingCoolingState function',
      value
    );

    this.service
      .getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .updateValue(value);

    //     this.sendCurl(this.power_switch_accessory_uuid);

    callback();
  },

  sleep: async function (milliseconds) {
    this.log('sleeping for ' + milliseconds + ' milliseconds');
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  },

  setTargetTemperature: async function (value, callback) {
    if (
      this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .value == 0
    ) {
      // this.sendCurl(this.power_switch_accessory_uuid);

      this.service
        .getCharacteristic(Characteristic.TargetHeatingCoolingState)
        .updateValue(3);

      this.log(
        'Temp Change Requested. Power State toggled to AUTO from setTargetTemperature function'
      );

      await this.sleep(10000);
    }

    if (
      this.service.getCharacteristic(Characteristic.CurrentTemperature).value <
      value
    ) {
      console.log('value' + value);
      // console.log(value);
      console.log(
        'this.service.getCharacteristic(Characteristic.CurrentTemperature).value' +
          this.service.getCharacteristic(Characteristic.CurrentTemperature)
            .value
      );
      console.log(
        'value - this.service.getCharacteristic(Characteristic.CurrentTemperature).value' +
          value -
          this.service.getCharacteristic(Characteristic.CurrentTemperature)
            .value
      );
      // console.log(
      //   value -
      //     this.service.getCharacteristic(Characteristic.CurrentTemperature)
      //       .value
      // );
      for (
        let index = this.service.getCharacteristic(
          Characteristic.CurrentTemperature
        ).value;
        index < value;
        index = index + this.minStep
      ) {
        console.log('value');
        console.log(value);
        console.log(
          'this.service.getCharacteristic(Characteristic.CurrentTemperature).value'
        );
        console.log(
          this.service.getCharacteristic(Characteristic.CurrentTemperature)
            .value
        );
        console.log(
          'value - this.service.getCharacteristic(Characteristic.CurrentTemperature).value'
        );
        console.log(
          value -
            this.service.getCharacteristic(Characteristic.CurrentTemperature)
              .value
        );

        this.log(
          `increasing temp ${
            index -
            this.service.getCharacteristic(Characteristic.CurrentTemperature)
              .value +
            this.minStep
          } / ${
            value -
            this.service.getCharacteristic(Characteristic.CurrentTemperature)
              .value
          }`
        );

        // this.sendCurl(this.temp_up_accessory_uuid);

        this.log('curl executed to increase temp');

        this.log(
          `Bot sent ${
            value -
            this.service.getCharacteristic(Characteristic.CurrentTemperature)
              .value
          } requests to increase temp`
        );

        //         this.log(
        //         `Bot sent ${
        //           (value - this.service.getCharacteristic(Characteristic.CurrentTemperature).value) * 2
        //         } requests to increase temp`
        //       );

        // this.service
        //   .getCharacteristic(Characteristic.CurrentTemperature)
        //   .updateValue(value);
      }

      callback();
    }
    //     else {
    //       for (
    //         let index = 0;
    //         index < this.service.getCharacteristic(Characteristic.CurrentTemperature).value - value;
    //         index = index + this.minStep
    //       ) {
    //         this.log(
    //           `decreasing temp ${(index + this.minStep) * 2} / ${(this.service.getCharacteristic(Characteristic.CurrentTemperature).value - value) * 2}`
    //         );
    //         this.sendCurl(this.temp_down_accessory_uuid);
    //         this.log('curl executed to decrease temp');
    //       }
    //       this.service
    //         .getCharacteristic(Characteristic.CurrentTemperature)
    //         .updateValue(value);

    //       callback();
    //     }
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
      .on('set', this.setTargetHeatingCoolingState.bind(this));

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
      unit: 'fahrenheit',
      format: 'Integer',
    });

    return [this.informationService, this.service];
  },
};
