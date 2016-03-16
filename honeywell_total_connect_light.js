var Device = require('zetta-device');
var util = require('util');

var TIMEOUT = 2000;
var FAST_TIMEOUT = 500;

var HoneywellTotalConnectLight = module.exports = function() {
  Device.call(this);
  this._soap = arguments[0];
  this._automation = arguments[1];

  var device = arguments[2];
  this.DeviceID = device.DeviceID;
  this.SwitchID = device.SwitchID;
  this.SwitchName = device.SwitchName;
  this.SwitchIndex = device.SwitchIndex;
  this.SwitchType = device.SwitchType;
  this.SwitchState = device.SwitchState;
  this.SwitchLevel = device.SwitchLevel;
  this.SwitchIconID = device.SwitchIconID;
  this.DeviceStatusID = device.DeviceStatusID;

  this._suppressUpdates === false;
};
util.inherits(HoneywellTotalConnectLight, Device);

// TODO: check the actual status of the panel then set current state
HoneywellTotalConnectLight.prototype.init = function(config) {

  config
    .name(this.DeviceName)
    .state('on')
    .type('light')
    .when('off', {allow: ['turn-on', 'update-state']})
    .when('on', {allow: ['turn-off', 'update-state']})
    .when('turning-on', {allow: ['update-state']})
    .when('turning-off', {allow: ['update-state']})
    .map('turn-on', this.turnOn)
    .map('turn-off', this.turnOff)
    .map('update-state', this.updateState, [{name: 'newState', type: 'text'}]);

    // TODO: setup listener on this._automation.automationData
    // update the state of this device accordingly
    this._subscribeToAutomationDataStream();
};

HoneywellTotalConnectLight.prototype._subscribeToAutomationDataStream = function() {
  var self = this;
  var automationDataStream = this._automation.createReadStream('automationData');
  
  automationDataStream.on('data', function(msg) {
    var automationData = msg.data;
    console.log('_subscribeToAutomationDataStream: ' + util.inspect(automationData));
    console.log('_subscribeToAutomationDataStream: automationData.AutomationSwitch: ' + util.inspect(automationData.AutomationSwitch));
    console.log('_subscribeToAutomationDataStream: automationData.AutomationSwitch.SwitchInfo: ' + util.inspect(automationData.AutomationSwitch.SwitchInfo));
    var thisLight = automationData.AutomationSwitch.SwitchInfo.filter(function(device) {
      console.log('device.DeviceID: ' + device.DeviceID);
      console.log('self.DeviceID: ' +self.DeviceID);
      console.log('device.SwitchID: ' +device.SwitchID);
      console.log('self.SwitchID: ' +self.SwitchID);
      return (device.DeviceID === self.DeviceID && device.SwitchID === self.SwitchID);
    });
    console.log('_subscribeToAutomationDataStream: thisLight[0]: ' + util.inspect(thisLight));
    self._setProperties(thisLight[0]);
  });
}

HoneywellTotalConnectLight.prototype._setProperties = function(switchInfo) {
  console.log('_setProperties: ' + util.inspect(switchInfo));
  this.SwitchName = switchInfo.SwitchName;
  this.SwitchIndex = switchInfo.SwitchIndex;
  this.SwitchType = switchInfo.SwitchType;
  this.SwitchState = switchInfo.SwitchState;
  this.SwitchLevel = switchInfo.SwitchLevel;
  this.SwitchIconID = switchInfo.SwitchIconID;
  this.DeviceStatusID = switchInfo.DeviceStatusID;
  this._setSwitchState(this.SwitchState);
}

HoneywellTotalConnectLight.prototype._setSwitchState = function(switchState) {
  var newState = null;
  console.log('switchState: ' + switchState);
  switch (Number(switchState)) {
  case 0:
    newState = 'off';
    break;
  case 1:
    newState = 'on';
    break;
  }
  
  console.log('newState: ' + newState + ' this.state: ' + this.state);
  
  if (newState === this.state) {
    return;
  } else {
    this.call('update-state', newState);
  }
}

HoneywellTotalConnectLight.prototype.updateState = function(newState, cb) {
  if (this._suppressUpdates === true) {
    return;
  } else {
    this.state = newState;
    cb();
  }
}

HoneywellTotalConnectLight.prototype.turnOn = function(cb) {
  this._suppressUpdates = true;
  
  console.log('turnOn');
  
  var self = this;

  var previousState = this.state;
  this.state = 'turning-on';
  cb();

  this._soap._client.ControlASwitch({
    SessionID: this._soap._sessionID,
    DeviceID: this.DeviceID,
    SwitchID: this.SwitchID,
    SwitchAction: 1
  }, function(err, result, raw, soapHeader) {
    // TODO: handle err
    console.log('turnOn: ' + util.inspect(result));
    if (result.ControlASwitchResult.ResultCode === 0) {
      self.state = 'on';
      cb();
      self._suppressUpdates = false;
    } else if (result.ArmSecuritySystemResult.ResultCode > 0) {
      //TODO: handle err
    } else {
      // log an err?
      self.state = previousState;
      cb();
      self._suppressUpdates = false;
      console.log('turnOn: ERROR: result.ArmSecuritySystemResult.ResultCode: ' + result.ArmSecuritySystemResult.ResultCode);
    }
  });
  
}

HoneywellTotalConnectLight.prototype.turnOff = function(cb) {
  this._suppressUpdates = true;
  
  console.log('turnOff');
  
  var self = this;

  var previousState = this.state;
  this.state = 'turning-off';
  cb();

  this._soap._client.ControlASwitch({
    SessionID: this._soap._sessionID,
    DeviceID: this.DeviceID,
    SwitchID: this.SwitchID,
    SwitchAction: 0
  }, function(err, result, raw, soapHeader) {
    // TODO: handle err
    console.log('turnOff: ' + util.inspect(result));
    if (result.ControlASwitchResult.ResultCode === 0) {
      self.state = 'off';
      cb();
      self._suppressUpdates = false;
    } else if (result.ArmSecuritySystemResult.ResultCode > 0) {
      //TODO: handle err
    } else {
      // log an err?
      self.state = previousState;
      cb();
      self._suppressUpdates = false;
      console.log('turnOff: ERROR: result.ArmSecuritySystemResult.ResultCode: ' + result.ArmSecuritySystemResult.ResultCode);
    }
  });
  
}
