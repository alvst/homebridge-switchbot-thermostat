<span align="center">

<a href=""><img alt="homebridge-verified" src="" width="350px"></a>

# @Switchbot Thermostat

<p>The Homebridge <a href="https://www.switch-bot.com">SwitchBot Thermostat</a> is an accessory plugin allows you to access your SwitchBot Device(s) to control your thermostat from HomeKit with
  <a href="https://homebridge.io">Homebridge</a>. 
</p>

</span>

## Installation

1. Prerequisite the [Homebridge Switchbot plugin](https://www.npmjs.com/package/@switchbot/homebridge-switchbot)
2. Install the this package (note: as of right now this package is not available on NPM)

## Configuration

1. Install/Configure the [Homebridge Switchbot plugin](https://www.npmjs.com/package/@switchbot/homebridge-switchbot) per [the instructions ](https://github.com/OpenWonderLabs/homebridge-switchbot#readme)
2. Configure all your Switchbot Bots to 'Multipress' mode
3. Place your Switchbot Bots onto the thermostat making sure they are able to hit the buttons.
4. Get a bearer token from Homebridge:

   a. A Bearer Token can be generated using Homebridge Swagger (/swagger#). I'd recommend creating a separate Homebridge user account in case your Bearer Token is leaked, you can remove that user account without it being your main/admin account.

   b. By default, Bearer Tokens only last 8 hours. I _strongly_ recommend making them last longer. Personally, mine rotates every 30 days. To me this is a reasonable middle-ground between security and convenience.

   c. The length of a Bearer Token's expiration can be changed in Homebridge -> ⋮ -> UI Settings -> Advanced -> Session Timeout (in seconds)

5. I recommend putting your Thermostat on a separate bridge.
6. Configure the package.json by adding a new accessory:

```json
    "accessories": [
         {
            "accessory": "Thermostat",
            "name": "Thermostat",
            "temperatureDisplayUnits": 1,
            "minStep": 0.5,
            "validStates": [
                0,
                3
            ],
            "thermostat_details": {
                "temp_interval": 1,
                "minTemp": 15,
                "maxTemp": 30
            },
            "thermostat_configuration": {
                "bearerToken": "",
                "power_switch_accessory_uuid": "",
                "temp_up_accessory_uuid": "",
                "temp_down_accessory_uuid": ""
            },
        }
   ]
```

## Optional fields

| Key                       | Description                                                                                  | Default  |
| ------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| `validStates`             | Which states you would like to enable (see [key](#heatingcoolingstate-key))                  | `[0, 3]` |
| `temperatureDisplayUnits` | Whether you want °C (`0`) or °F (`1`) as your units                                          | `0`      |
| `maxTemp`                 | Upper bound for the temperature selector in the Home app                                     | `30`     |
| `minTemp`                 | Lower bound for the temperature selector in the Home app                                     | `15`     |
| `minStep`                 | Minimum increment value for the temperature selector in the Home app                         | `0.5`    |
| `temperatureThresholds`   | Whether you want the thermostat accessory to have heating and cooling temperature thresholds | `false`  |

## HeatingCoolingState Key

| Number | Name |
| ------ | ---- |
| `0`    | Off  |
| `3`    | Auto |

- ### If using BLE Connection
  Right now, neither myself [(who created the multi-press functionality in the Switchbot Homebridge plugin)](https://github.com/OpenWonderLabs/homebridge-switchbot/pull/628), nor anyone else, has yet created multi-press BLE functionality so this extension doesn't yet work if you rely on Bluetooth. At some point, if no one else does, I will investigate implementing multi-press functionality compatible with Bluetooth.

<p align="center">

<img src="https://github.com/alvst/switchbot-theromstat/blob/main/Thermostat.jpg?raw=true" width="1px">

</p>

## Supported Devices

You can use this thermostat with basically any thermostat that seems like it would be compatible. Also feel free to adapt it as needed. You may need to make slight modifications if the features I created aren't the exact features you created. You can see my Thermostat and it's capabilities above. Because of the limitations of HomeKit, I didn't leverage all the buttons (FANS SPEED which increase the fan speed, and OPER MODE which changes it from Air conditioning, to heat, etc).
