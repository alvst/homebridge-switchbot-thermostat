<span align="center">

<a href=""><img alt="homebridge-verified" src="" width="350px"></a>

# @Switchbot Thermostat

<p>The Homebridge <a href="https://www.switch-bot.com">SwitchBot Thermostat</a> is an accessory plugin allows you to access your SwitchBot Device(s) to control your thermostat from HomeKit with
  <a href="https://homebridge.io">Homebridge</a>. 
</p>

</span>

## Installation

0. Prerequisite the [Homebridge Switchbot plugin](https://www.npmjs.com/package/@switchbot/homebridge-switchbot)
1. Install the this package (note: as of right now this package is not available on NPM)

## Configuration

- ### If using OpenAPI Connection

0. Install/Configure the Switchbot Plugin:
1. Download SwitchBot App on App Store or Google Play Store
2. Register a SwitchBot account and log in into your account
3. Generate an Token within the App
   - Click Bottom Profile Tab
   - Click Preference
   - Click App version 10 Times, this will enable Developer Options
   - Click Developer Options
   - Click Copy `token` to Clipboard
4. Input your `token` into the config parameter
5. Generate an Secret within the App
   - Click Bottom Profile Tab
   - Click Preference
   - Click App version 10 Times, this will enable Developer Options
   - Click Developer Options
   - Click Copy `secret` to Clipboard
6. Input your `secret` into the config parameter

   Switchbot Thermostat Specific instructions

7. Configure all your Switchbot Bots to 'Multipress' mode
8. Place your Switchbot Bots onto the thermostat making sure they are able to hit the buttons.

- ### If using BLE Connection
  Note: This extension does not work with BLE and requires OpenAPI to work

<p align="center">

<img src="" width="1px">

</p>

## Supported Devices

You can use this thermostat with basically any thermostat that seems like it would be compatible. Also feel free to adapt it as needed.
