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

  this.bearerToken = config.thermostatConfiguration['bearerToken'];
  this.power_switch_accessory_uuid =
    config.thermostatConfiguration['powerSwitchAccessoryUUID'];
  this.temp_up_accessory_uuid =
    config.thermostatConfiguration['tempUpAccessoryUUID'];
  this.temp_down_accessory_uuid =
    config.thermostatConfiguration['tempDownAccessoryUUID'];
  this.wait_time = config.thermostatConfiguration['waitTime'] || 5000;
  this.debug = config.debug || false;
  this.homebridgeCustomPort = config.customPort || 8581;

  this.validStates = [0, 3];

  this.manufacturer = config.manufacturer || packageJson.author;
  this.serial = 'n/a';
  this.model = config.model || packageJson.name;

  // this.temperatureUnits = config.temperatureDisplayUnits || 0;
  this.maxTemp = config.thermostat_details.maxTemp || 30;
  this.minTemp = config.thermostat_details.minTemp || 15;
  this.minStep = config.thermostat_details.tempInterval || 0.5;

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
  len() {
    return this.queue.length;
  }

  processQueue() {
    if (this.isProcessing) {
      return;
    }
    if (this.queue.length === 0) {
      // console.log('Homebridge Thermostat queue is empty');
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

  debugLog(message) {
    if (this.debug) {
      this.log.warn(`[DEBUG] ${message}`);
    }
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
      this.log(`queuing for temp change`);

      await this.setTargetTemperature(value, startValue, callback);
      this.log(`done; sleeping for temp change`);
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
      await this.sleep(this.wait_time);

      this.log(`done; sleeping for power state change`);
    });
  },

  setTargetHeatingCoolingState: async function (value, startValue, callback) {
    if (value !== startValue) {
      this.debugLog(
        `Setting power state to %s from setTargetHeatingCoolingState function
        ${value}`
      );
      this.log(`Setting power state to ${value}...`);

      this.sendCurl(this.power_switch_accessory_uuid);

      this.updateCache('powerStateOn', value);
    } else {
      this.log(
        `Power state is already ${value}. The thermostat's power state was likely requested to be changed by a an automation. No change has been made.`
      );
    }

    if (this.queue.len() === 1) {
      this.log('Switchbot Thermostat queue is empty');
    }
  },

  sleep: async function (milliseconds) {
    this.debugLog(`Pausing for ${milliseconds} milliseconds`);
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  },

  convertToFahrenheit: function (value) {
    return (value * 9) / 5 + 32;
  },

  setTempFahrenheit: function (value, callback) {},

  setTempCelsius: function (value, callback) {},

  setTargetTemperature: async function (value, startValue, callback) {
    let count = 0;
    let startPowerState = this.service.getCharacteristic(
      Characteristic.TargetHeatingCoolingState
    ).value;

    this.debugLog(`Start temperature ${startValue}° Celsius`);

    this.updateCache(
      'currentTemp',
      this.service.getCharacteristic(Characteristic.CurrentTemperature).value
    );

    if (startPowerState == 0) {
      this.sendCurl(this.power_switch_accessory_uuid);

      this.log(`Temporarily turning thermostat ON to change temperature`);
      this.debugLog(`This temporary from setTargetTemperature function`);

      this.log(
        `This is likely triggered by an automation & changing the temperature or changing the temperature from the Homebridge-UI without turning the thermostat ON first.`
      );

      await this.sleep(this.wait_time);
    }

    this.debugLog(
      `Setting Temperature Current Temp Characteristic to ${startValue}`
    );

    if (startValue < value) {
      this.debugLog(
        `Increasing temp | start Temp: ${startValue} | End Temp: ${value}`
      );
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
            `Skipping ${index} because the thermostat is already at ${this.convertToFahrenheit(
              index
            )} since ${index} is a duplicate temperature when converting between Celsius and Fahrenheit and would cause an extra button press.`
          );
        }
      }
    } else {
      this.debugLog(
        `Decreasing temp | start Temp: ${startValue} | End Temp: ${value}`
      );
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
            `Skipping ${index} because the thermostat is already at ${this.convertToFahrenheit(
              index
            )} since ${index} is a duplicate temperature when converting between Celsius and Fahrenheit and would cause an extra button press.`
          );
        }
      }
    }

    this.debugLog(`Count of total number of button presses: ${count}`);
    await this.sleep(this.wait_time * (count + 1));
    this.log(`Done; sleeping from setTargetTemperature function`);

    if (startPowerState == 0) {
      this.sendCurl(this.power_switch_accessory_uuid);

      this.log('Turning thermostat OFF after changing temperature');

      this.debugLog(
        `Undoing the temporary power On state change from setTargetTemperature function`
      );

      this.log(
        `The Thermostats beginning state was OFF. It was turned on, likely triggered by an automation or by changing the temperature from the Homebridge UI without turning the thermostat ON first.`
      );

      await this.sleep(this.wait_time);
    }

    if (this.queue.len() === 1) {
      this.log('Switchbot Thermostat queue is empty');
    }
  },

  sendCurl: async function (device) {
    new Promise((resolve, reject) => {
      request(
        {
          url: `http://localhost:${this.homebridgeCustomPort}/api/accessories/${device}`,
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
            this.log.warn(error);
            reject(error);
          } else {
            this.log.debug(body);
            resolve(response);
          }
        }
      );
    }).then((resolve) => {
      // console.log(resolve.body);
      // this.log(resolve.body);
      if (!resolve.body.uniqueId) {
        let responseCode = resolve.body.statusCode;
        if (responseCode === 401) {
          this.log.error(
            `Failed to send cURL command. Your Bearer Token is either incorrect or has expired. Once you have updated your Bearer Token, please restart Homebridge.`
          );
        } else if (responseCode === 400) {
          if (device === '') {
            let emptyDevice = [];
            switch ('') {
              case this.temp_up_accessory_uuid:
                emptyDevice.push('tempUpAccessoryUUID');
              case this.temp_down_accessory_uuid:
                emptyDevice.push('tempDownAccessoryUUID');
              default:
                break;
            }
            if (emptyDevice.length === 1) {
              this.log.error(
                `Failed to send cURL command. No UUID was provided for ${emptyDevice}. Once you have updated your device UUID, please restart Homebridge.`
              );
            } else if (emptyDevice.length === 2) {
              this.log.error(
                `Failed to send cURL command. No UUID was provided for ${emptyDevice[0]} and ${emptyDevice[1]}. Once you have updated your device UUID(s), please restart Homebridge.`
              );
            }
          } else {
            let type = '';
            switch (device) {
              case this.temp_up_accessory_uuid:
                this.log.error(
                  `Failed to send cURL command. The UUID '${device}' for device tempUpAccessoryUUID was not found. Once you have updated your device UUID in your config.json, please restart Homebridge.`
                );
              case this.temp_down_accessory_uuid:
                this.log.error(
                  `Failed to send cURL command. The UUID '${device}' for device tempDownAccessoryUUID was not found. Once you have updated your device UUID in your config.json, please restart Homebridge.`
                );
                break;

              default:
                break;
            }
          }
        } else {
          if (device.toLowerCase() == 'n/a') {
            this.debugLog(
              `Update power state requested, but no UUID was provided for the powerSwitchAccessoryUUID.`
            );
          } else {
            this.log.error(
              `Failed to send cURL command. An unknown error occurred: ${responseCode}: ${resolve.body.message}.`
            );
          }
        }
      } else {
        let type = '';
        switch (device) {
          case this.temp_down_accessory_uuid:
            type = 'tempDownAccessoryUUID';
            break;
          case this.temp_up_accessory_uuid:
            type = 'tempUpAccessoryUUID';
          default:
            break;
        }
        this.log(`Successfully sent cURL command to ${type}`);
      }
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
